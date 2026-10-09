import { DEFAULT_DIFFICULTY } from '../game/constants'
import { randomSeed } from '../game/rng'
import { endRun, game, preferredDifficulty, startRun } from '../game/state'
import type { Difficulty } from '../game/types'
import { normalizeRoomCode, randomId, randomName, randomRoomCode } from './identity'
import { createLocalTransport, createOnlineTransport, isOnlineConfigured } from './transports'
import {
  BEAT_MS,
  LAST_RUNNER_MS,
  MAX_PLAYERS,
  STATE_HZ,
  TIMEOUT_MS,
  type NetMessage,
  type RoomPlayer,
  type Transport,
  type TransportKind,
} from './types'

export type RoomStatus = 'idle' | 'connecting' | 'lobby' | 'countdown' | 'racing' | 'results' | 'error'

const COUNTDOWN_MS = 3200
/**
 * How long to wait after saying hello before judging who is in the room.
 * Long enough to collect every reply, since the roster decides both "no room
 * found" and "room is full".
 */
const DISCOVERY_MS = 1500
const EMIT_MS = 150

export interface RoomSnapshot {
  status: RoomStatus
  code: string
  kind: TransportKind
  selfId: string
  /** Id of the player hosting the room (the one who created it). */
  hostId: string | null
  isHost: boolean
  players: RoomPlayer[]
  error: string | null
  /** Second line of an error, explaining what to do about it. */
  errorDetail: string | null
  /** The code the last join attempt used, so the user can correct it. */
  attemptedCode: string
  countdownEndsAt: number
  /** Speed preset for this room, chosen by the host. */
  difficulty: Difficulty
  /** Another round is already running, so this client waits for the next one. */
  raceInProgress: boolean
  /**
   * Timestamp the last-runner countdown ends at, or 0. Set on every client
   * once only one runner is left, so they all show the same countdown.
   */
  finishEndsAt: number
}


class Room {
  private players = new Map<string, RoomPlayer>()
  private transport: Transport | null = null
  private status: RoomStatus = 'idle'
  private code = ''
  private kind: TransportKind = 'local'
  private selfId = randomId()
  private selfName = randomName()
  /** Who hosts: set to self when creating a room, learned when joining one. */
  private hostId: string | null = null
  /** Speed preset for the room: the host's pick, learned by everyone else. */
  private difficulty: Difficulty = DEFAULT_DIFFICULTY
  private error: string | null = null
  private errorDetail: string | null = null
  private attemptedCode = ''
  private countdownEndsAt = 0
  /** Track seed for the current round, chosen by the host. */
  private raceSeed = 0
  /** Last time a position update arrived while we were not racing. */
  private lastRemoteRaceSignal = 0
  /** When the last-runner countdown ends (0 = not running). */
  private finishEndsAt = 0
  private finishTimer: number | null = null

  private beatTimer: number | null = null
  private pruneTimer: number | null = null
  private emitTimer: number | null = null
  private netTimer: number | null = null
  private countdownTimer: number | null = null

  private listeners = new Set<() => void>()
  private snapshot: RoomSnapshot = this.buildSnapshot()
  private dirty = false

  // ------------------------------------------------------------------ store
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): RoomSnapshot => this.snapshot

  private buildSnapshot(): RoomSnapshot {
    const players = [...(this.players?.values() ?? [])].sort((a, b) => a.slot - b.slot)
    return {
      status: this.status,
      code: this.code,
      kind: this.kind,
      selfId: this.selfId,
      hostId: this.effectiveHostId(),
      isHost: this.effectiveHostId() === this.selfId,
      players,
      error: this.error,
      errorDetail: this.errorDetail,
      attemptedCode: this.attemptedCode,
      countdownEndsAt: this.countdownEndsAt,
      difficulty: this.difficulty,
      raceInProgress: Date.now() - this.lastRemoteRaceSignal < 3000,
      finishEndsAt: this.finishEndsAt,
    }
  }

  private emit() {
    this.dirty = false
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) listener()
  }

  /** Position updates are frequent, so React is only nudged on a timer. */
  private markDirty() {
    this.dirty = true
  }

  // ----------------------------------------------------------------- getters
  get isMultiplayer() {
    return this.status === 'countdown' || this.status === 'racing' || this.status === 'results'
  }

  self(): RoomPlayer | undefined {
    return this.players.get(this.selfId)
  }

  livePlayers(): RoomPlayer[] {
    return [...this.players.values()]
  }

  /**
   * The player who created the room hosts it. If they leave, every client
   * promotes the lowest remaining id - a rule they all compute identically,
   * so a room never ends up without a host.
   */
  private effectiveHostId(): string | null {
    if (this.hostId !== null && this.players.has(this.hostId)) return this.hostId
    let fallback: string | null = null
    for (const id of this.players.keys()) if (fallback === null || id < fallback) fallback = id
    return fallback
  }

  /**
   * Slots may only be reshuffled before a race starts, so colours and grid
   * positions never jump around mid-race.
   */
  private canReshuffle() {
    return this.status === 'lobby' || this.status === 'connecting'
  }

  /**
   * Slot order is the sorted id order, so every client independently derives
   * the same slot for the same player - no host negotiation needed.
   */
  private recomputeSlots() {
    const ids = [...this.players.keys()].sort()
    ids.forEach((id, index) => {
      const player = this.players.get(id)!
      player.slot = index
    })
  }

  // ------------------------------------------------------------------ joining
  async create() {
    await this.connect(randomRoomCode(), true)
  }

  async join(rawCode: string) {
    const code = normalizeRoomCode(rawCode)
    this.attemptedCode = code
    if (code.length < 4) {
      this.fail('Incomplete code', 'Room codes are 5 characters, like A2FHJ.')
      return
    }
    await this.connect(code, false)
  }

  /** Host only: pick the speed preset everyone in the room will race with. */
  setDifficulty(difficulty: Difficulty) {
    if (this.effectiveHostId() !== this.selfId) return
    if (this.difficulty === difficulty) return
    this.difficulty = difficulty
    this.send({ t: 'diff', value: difficulty })
    this.emit()
  }

  private async connect(code: string, asHost: boolean) {
    this.teardown()
    // Creating the room makes you the host; joining means waiting to be told.
    this.hostId = asHost ? this.selfId : null
    // The host's own preference becomes the room's, until they change it.
    this.difficulty = asHost ? preferredDifficulty() : DEFAULT_DIFFICULTY
    this.code = code
    this.kind = isOnlineConfigured ? 'online' : 'local'
    this.status = 'connecting'
    this.error = null
    this.errorDetail = null
    this.emit()

    const handle = (message: NetMessage) => this.receive(message)

    try {
      this.transport =
        this.kind === 'online'
          ? await createOnlineTransport(code, handle)
          : createLocalTransport(code, handle)
    } catch (cause) {
      this.fail(
        'Connection failed',
        cause instanceof Error ? cause.message : 'Could not reach the multiplayer service.',
      )
      return
    }

    this.addSelf()
    this.announce()

    // Give everyone a moment to answer: the roster decides both whether the
    // room exists at all and whether there is room for one more.
    await this.wait(DISCOVERY_MS)
    if (this.status !== 'connecting') return

    if (!asHost && this.players.size === 1) {
      // Nobody answered. Say hello once more before giving up, in case the
      // first round trip was simply slow.
      this.announce()
      await this.wait(DISCOVERY_MS)
      if (this.status !== 'connecting') return

      if (this.players.size === 1) {
        this.fail('No room found', `Nobody is hosting room ${code}. Check the code, or create a room yourself.`)
        return
      }
    }

    if (this.players.size > MAX_PLAYERS) {
      this.send({ t: 'bye', id: this.selfId })
      this.fail('Room is full', `Room ${code} already has ${MAX_PLAYERS} players, which is the maximum.`)
      return
    }

    // Final ordering once discovery is done, so all clients agree on slots.
    this.recomputeSlots()
    this.status = 'lobby'
    this.startTimers()
    this.emit()
  }

  private addSelf() {
    this.players.set(this.selfId, {
      id: this.selfId,
      name: this.selfName,
      slot: 0,
      isSelf: true,
      lastSeen: Date.now(),
      distance: 0,
      x: 0,
      jumpY: 0,
      alive: true,
      finalDistance: null,
    })
    this.recomputeSlots()
  }

  private announce() {
    this.send({ t: 'hello', id: this.selfId, name: this.selfName, host: this.hostId === this.selfId })
  }

  private wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private fail(message: string, detail: string | null = null) {
    this.teardown()
    this.status = 'error'
    this.error = message
    this.errorDetail = detail
    this.emit()
  }

  leave() {
    if (this.transport) this.send({ t: 'bye', id: this.selfId })
    this.teardown()
    this.status = 'idle'
    this.error = null
    this.errorDetail = null
    this.emit()
  }

  private teardown() {
    this.transport?.close()
    this.transport = null
    this.players.clear()
    this.code = ''
    this.countdownEndsAt = 0
    this.clearFinishCountdown()
    for (const timer of [this.beatTimer, this.pruneTimer, this.emitTimer, this.netTimer, this.countdownTimer]) {
      if (timer !== null) clearInterval(timer)
    }
    this.beatTimer = this.pruneTimer = this.emitTimer = this.netTimer = this.countdownTimer = null
  }

  private startTimers() {
    // Heartbeats run on a plain timer, not the render loop: a player who
    // switches tabs has their animation frames paused by the browser, and
    // should stay in the roster (frozen) instead of being dropped.
    this.beatTimer = window.setInterval(() => {
      if (this.status !== 'idle' && this.status !== 'error') {
        this.send({ t: 'beat', id: this.selfId })
      }
    }, BEAT_MS)

    // Position updates, for the same reason.
    this.netTimer = window.setInterval(() => {
      if (this.status === 'racing') {
        this.publishState(game.distance, game.x, game.jumpY, game.alive)
      }
    }, Math.round(1000 / STATE_HZ))

    this.pruneTimer = window.setInterval(() => {
      const cutoff = Date.now() - TIMEOUT_MS
      let removed = false
      for (const [id, player] of this.players) {
        if (!player.isSelf && player.lastSeen < cutoff) {
          this.players.delete(id)
          removed = true
        }
      }
      if (removed) {
        if (this.canReshuffle()) this.recomputeSlots()
        this.checkRaceOver()
        this.checkLastRunner()
      }
      // Keep the lobby fresh (player count, host, "race in progress").
      if (removed || this.status === 'lobby') this.emit()
    }, 1000)

    this.emitTimer = window.setInterval(() => {
      if (this.dirty) this.emit()
    }, EMIT_MS)
  }

  private send(message: NetMessage) {
    this.transport?.send(message)
  }

  // ----------------------------------------------------------------- receiving
  private receive(message: NetMessage) {
    switch (message.t) {
      case 'hello': {
        this.touch(message.id, message.name)
        this.noteHost(message)
        // Tell the newcomer we exist, and whether we are the host.
        this.send({
          t: 'here',
          id: this.selfId,
          name: this.selfName,
          racing: this.isMultiplayer,
          host: this.effectiveHostId() === this.selfId,
          difficulty: this.difficulty,
        })
        if (this.canReshuffle()) this.recomputeSlots()
        this.emit()
        break
      }
      case 'here': {
        this.touch(message.id, message.name)
        this.noteHost(message)
        // Only the host's preset counts.
        if (message.host) this.difficulty = message.difficulty
        if (this.canReshuffle()) this.recomputeSlots()
        this.emit()
        break
      }
      case 'diff': {
        this.difficulty = message.value
        this.emit()
        break
      }
      case 'beat': {
        const player = this.players.get(message.id)
        if (player) player.lastSeen = Date.now()
        break
      }
      case 'bye': {
        if (this.players.delete(message.id)) {
          if (this.canReshuffle()) this.recomputeSlots()
          this.checkRaceOver()
          this.checkLastRunner()
          this.emit()
        }
        break
      }
      case 'go': {
        // The host's message is authoritative for both track and speed.
        this.difficulty = message.difficulty
        this.beginCountdown(message.seed)
        break
      }
      case 's': {
        // Someone is mid-race while we sit in the lobby: joined too late, so
        // this round is not ours to start.
        if (this.status === 'lobby' || this.status === 'connecting') {
          this.lastRemoteRaceSignal = Date.now()
        }
        const player = this.players.get(message.id)
        if (!player) break
        const wasAlive = player.alive
        player.lastSeen = Date.now()
        player.distance = message.d
        player.x = message.x
        player.jumpY = message.y
        // A player who already reported a final distance is out for good: a
        // later position packet must never bring them back to life, or the
        // race can never be called.
        player.alive = player.finalDistance === null && message.a === 1
        this.markDirty()
        // A position update can be the first sign that someone went out.
        if (wasAlive && !player.alive) {
          this.checkRaceOver()
          this.checkLastRunner()
        }
        break
      }
      case 'fin': {
        const player = this.players.get(message.id)
        if (!player) break
        player.lastSeen = Date.now()
        player.alive = false
        player.distance = message.d
        player.finalDistance = message.d
        this.checkRaceOver()
        this.checkLastRunner()
        this.emit()
        break
      }
      case 'lobby': {
        this.returnToLobbyLocal()
        break
      }
    }
  }

  /** Whoever announces themselves as host is recorded as the host. */
  private noteHost(message: { id: string; host: boolean }) {
    if (message.host) this.hostId = message.id
  }

  private touch(id: string, name: string) {
    const existing = this.players.get(id)
    if (existing) {
      existing.name = name
      existing.lastSeen = Date.now()
      return
    }
    // A full room does not admit anyone else. While still connecting we do
    // record everyone, because that count is exactly what tells us the room
    // is full and that we are the one who has to back out.
    if (this.status !== 'connecting' && this.players.size >= MAX_PLAYERS) return

    this.players.set(id, {
      id,
      name,
      slot: this.players.size,
      isSelf: false,
      lastSeen: Date.now(),
      distance: 0,
      x: 0,
      jumpY: 0,
      alive: true,
      finalDistance: null,
    })
  }

  // -------------------------------------------------------------------- race
  /** Host only. */
  startRace() {
    if (this.status !== 'lobby' || this.getSnapshot().raceInProgress) return
    // A fresh seed per round, so the same room never replays the same track.
    const seed = randomSeed()
    this.send({ t: 'go', seed, difficulty: this.difficulty })
    this.beginCountdown(seed)
  }

  private beginCountdown(seed: number) {
    if (this.status !== 'lobby') return
    this.raceSeed = seed
    this.lastRemoteRaceSignal = 0
    this.clearFinishCountdown()
    this.status = 'countdown'
    this.countdownEndsAt = Date.now() + COUNTDOWN_MS
    for (const player of this.players.values()) {
      player.distance = 0
      player.x = 0
      player.jumpY = 0
      player.alive = true
      player.finalDistance = null
    }
    this.emit()

    this.countdownTimer = window.setTimeout(() => {
      this.countdownTimer = null
      if (this.status !== 'countdown') return
      this.status = 'racing'
      const self = this.self()
      startRun({
        seed: this.raceSeed,
        // Everyone starts on the same line, in their own lane, so the whole
        // field is on screen together.
        lane: self ? Math.min(MAX_PLAYERS - 1, self.slot) : 2,
        difficulty: this.difficulty,
        multiplayer: true,
      })
      this.emit()
    }, COUNTDOWN_MS) as unknown as number
  }

  /** Sent 10x a second while racing. */
  private publishState(distance: number, x: number, jumpY: number, alive: boolean) {
    const self = this.self()
    if (self) {
      self.distance = distance
      self.x = x
      self.jumpY = jumpY
      self.alive = alive
      self.lastSeen = Date.now()
      this.markDirty()
    }
    this.send({ t: 's', id: this.selfId, d: distance, x, y: jumpY, a: alive ? 1 : 0 })
  }

  /** Called once when the local player crashes. Their distance is now locked. */
  reportCrash(distance: number) {
    // Keep the simulation and the roster in step, whichever side calls first.
    game.alive = false
    const self = this.self()
    if (self) {
      self.alive = false
      self.distance = distance
      self.finalDistance = distance
    }
    this.send({ t: 'fin', id: this.selfId, d: distance })
    this.checkRaceOver()
    this.checkLastRunner()
    this.emit()
  }

  private checkRaceOver() {
    if (this.status !== 'racing') return
    const players = this.livePlayers()
    if (players.length === 0) return
    if (players.some((player) => player.alive)) return
    this.clearFinishCountdown()
    this.status = 'results'
    this.countdownEndsAt = 0
    endRun()
  }

  /**
   * Once everyone else is out there is nothing left to race for, so the last
   * runner gets a short grace period and then the race is called. Every client
   * starts the same countdown for the display; only the survivor's own client
   * actually ends the run, which keeps it on the existing crash path.
   */
  private checkLastRunner() {
    if (this.status !== 'racing') {
      this.clearFinishCountdown()
      return
    }

    const players = this.livePlayers()
    const alive = players.filter((player) => player.alive)

    // A one-player room has nobody to wait for, so it never force-finishes.
    if (players.length < 2 || alive.length !== 1) {
      this.clearFinishCountdown()
      return
    }

    if (this.finishEndsAt !== 0) return // already counting down
    this.finishEndsAt = Date.now() + LAST_RUNNER_MS

    if (alive[0].isSelf) {
      this.finishTimer = window.setTimeout(() => {
        this.finishTimer = null
        if (this.status === 'racing' && game.alive) this.reportCrash(game.distance)
      }, LAST_RUNNER_MS) as unknown as number
    }
    this.emit()
  }

  private clearFinishCountdown() {
    if (this.finishTimer !== null) {
      clearTimeout(this.finishTimer)
      this.finishTimer = null
    }
    this.finishEndsAt = 0
  }

  /** Host only. */
  returnToLobby() {
    this.send({ t: 'lobby' })
    this.returnToLobbyLocal()
  }

  private returnToLobbyLocal() {
    if (this.status !== 'results' && this.status !== 'racing') return
    this.status = 'lobby'
    this.lastRemoteRaceSignal = 0
    this.clearFinishCountdown()
    for (const player of this.players.values()) {
      player.distance = 0
      player.x = 0
      player.jumpY = 0
      player.alive = true
      player.finalDistance = null
    }
    game.phase = 'menu'
    this.emit()
  }

  /** Distance used for ranking: frozen value once a player has crashed. */
  rankedDistance(player: RoomPlayer): number {
    return player.finalDistance ?? player.distance
  }

  standings(): RoomPlayer[] {
    return this.livePlayers().sort((a, b) => this.rankedDistance(b) - this.rankedDistance(a))
  }

  /** Furthest player still running - used to follow the action while spectating. */
  leaderDistance(): number {
    let best = -Infinity
    for (const player of this.players.values()) {
      if (player.alive && player.distance > best) best = player.distance
    }
    return best
  }

  setName(name: string) {
    this.selfName = name.slice(0, 14) || randomName()
    const self = this.self()
    if (self) self.name = this.selfName
    this.emit()
  }
}

export const room = new Room()
