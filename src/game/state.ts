import {
  BASE_SPEED,
  BEST_SCORE_KEY,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_KEY,
  JUMP_VELOCITY,
  LANE_COUNT,
  LANE_X,
  SCORE_PER_UNIT,
} from './constants'
import { randomSeed } from './rng'
import { track } from './track'
import type { Biome, Difficulty, Phase } from './types'

/**
 * Mutable, per-frame game state. This is deliberately *not* React state:
 * it is written every frame by the game loop. React only ever reads the
 * throttled HUD snapshot below, which keeps re-renders cheap.
 */
export interface GameState {
  phase: Phase
  /** True while this player is still running; false once they crash. */
  alive: boolean
  /** Set for a networked race: crashing starts spectating instead of ending. */
  multiplayer: boolean
  /** Seed the current run's track was built from. */
  seed: number
  /** Speed preset for this run. In a race everyone shares the host's choice. */
  difficulty: Difficulty
  /** Distance travelled in world units. */
  distance: number
  /**
   * Distance the camera / track scroll is based on. Equal to `distance` while
   * running; after a crash in a race it drifts to the leader so you can watch.
   */
  viewDistance: number
  speed: number
  lane: number
  /** Smoothed X position of the player. */
  x: number
  /** Height above the current ground level. */
  jumpY: number
  velocityY: number
  onGround: boolean
  /** Ground height at the player (0 on land, DECK_Y on the boat). */
  groundY: number
  biome: Biome
  /** 0..1 how far the boat has risen out of the water. */
  boat: number
  /** Seconds since the run started, used to drive the run cycle. */
  runTime: number
}

export const game: GameState = {
  phase: 'menu',
  alive: true,
  multiplayer: false,
  seed: 0,
  difficulty: DEFAULT_DIFFICULTY,
  distance: 0,
  viewDistance: 0,
  speed: BASE_SPEED,
  lane: 2,
  x: LANE_X[2],
  jumpY: 0,
  velocityY: 0,
  onGround: true,
  groundY: 0,
  biome: 'road',
  boat: 0,
  runTime: 0,
}

export function currentScore(): number {
  return Math.floor(game.distance * SCORE_PER_UNIT)
}

export function speedForDistance(distance: number, difficulty: Difficulty = game.difficulty): number {
  const preset = DIFFICULTIES[difficulty]
  return Math.min(preset.top, preset.start + distance * preset.accel)
}

// ------------------------------------------------------- difficulty choice
function loadDifficulty(): Difficulty {
  try {
    const stored = localStorage.getItem(DIFFICULTY_KEY)
    if (stored === 'normal' || stored === 'medium' || stored === 'extreme') return stored
  } catch {
    /* storage can be unavailable */
  }
  return DEFAULT_DIFFICULTY
}

/** The player's own preference, used for solo runs and as the host's default. */
export function preferredDifficulty(): Difficulty {
  return snapshot.difficulty
}

export function setPreferredDifficulty(difficulty: Difficulty) {
  if (snapshot.difficulty === difficulty) return
  try {
    localStorage.setItem(DIFFICULTY_KEY, difficulty)
  } catch {
    /* storage can be unavailable */
  }
  snapshot = { ...snapshot, difficulty }
  emit()
}

// ------------------------------------------------------------ best score
function loadBest(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY)
    const parsed = raw === null ? 0 : Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  } catch {
    return 0
  }
}

function saveBest(value: number) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value))
  } catch {
    /* storage can be unavailable (private mode) - the game still works */
  }
}

// ------------------------------------------------------- HUD snapshot store
export interface HudSnapshot {
  phase: Phase
  score: number
  best: number
  speed: number
  biome: Biome
  /** The chosen preset: the player's preference, or the host's in a race. */
  difficulty: Difficulty
}

let snapshot: HudSnapshot = {
  phase: 'menu',
  score: 0,
  best: loadBest(),
  speed: BASE_SPEED,
  biome: 'road',
  difficulty: loadDifficulty(),
}

const listeners = new Set<() => void>()

export const hudStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot(): HudSnapshot {
    return snapshot
  },
}

function emit() {
  for (const listener of listeners) listener()
}

/** Replaces the snapshot only when something actually changed. */
export function syncHud() {
  const score = currentScore()
  const speed = Math.round(game.speed * 10) / 10
  if (
    snapshot.phase === game.phase &&
    snapshot.score === score &&
    snapshot.speed === speed &&
    snapshot.biome === game.biome
  ) {
    return
  }
  snapshot = { ...snapshot, phase: game.phase, score, speed, biome: game.biome }
  emit()
}

// --------------------------------------------------------------- lifecycle
export interface RunOptions {
  /** Shared across a room so every player gets an identical track. */
  seed?: number
  lane?: number
  multiplayer?: boolean
  /** In a race this is the host's choice, so everyone ramps up together. */
  difficulty?: Difficulty
}

export function startRun(options: RunOptions = {}) {
  const lane = Math.min(LANE_COUNT - 1, Math.max(0, options.lane ?? 2))
  game.phase = 'playing'
  game.alive = true
  game.multiplayer = options.multiplayer ?? false
  game.seed = options.seed ?? randomSeed()
  game.difficulty = options.difficulty ?? snapshot.difficulty
  game.distance = 0
  game.viewDistance = 0
  game.speed = DIFFICULTIES[game.difficulty].start
  game.lane = lane
  game.x = LANE_X[lane]
  game.jumpY = 0
  game.velocityY = 0
  game.onGround = true
  game.groundY = 0
  game.biome = 'road'
  game.boat = 0
  game.runTime = 0
  // Rebuild the world for this run. In a race every player passes the same
  // seed, so everyone gets an identical track.
  track.reset(game.seed)
  snapshot = {
    ...snapshot,
    phase: 'playing',
    score: 0,
    speed: game.speed,
    biome: 'road',
    difficulty: game.difficulty,
  }
  emit()
}

export function endRun() {
  if (game.phase !== 'playing') return
  game.phase = 'over'
  game.alive = false
  const score = currentScore()
  const best = Math.max(snapshot.best, score)
  if (best !== snapshot.best) saveBest(best)
  snapshot = { ...snapshot, phase: 'over', score, best }
  emit()
}

export function moveLane(direction: -1 | 1) {
  if (game.phase !== 'playing' || !game.alive) return
  game.lane = Math.min(LANE_COUNT - 1, Math.max(0, game.lane + direction))
}

export function jump() {
  if (game.phase !== 'playing' || !game.alive || !game.onGround) return
  game.onGround = false
  game.velocityY = JUMP_VELOCITY
}
