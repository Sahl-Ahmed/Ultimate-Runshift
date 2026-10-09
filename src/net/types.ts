export const MAX_PLAYERS = 5

/** Visual head start between players, like a marathon start grid. */
export const STAGGER_SPACING = 3.2

/** How often a racing client broadcasts its position. */
export const STATE_HZ = 10
/** Heartbeat interval while sitting in the lobby. */
export const BEAT_MS = 1000
/** A player we have not heard from for this long is dropped. */
export const TIMEOUT_MS = 5000

/**
 * Once everyone else is out, the last runner gets this long before the race
 * is called. Without it the winner runs on alone while the others wait.
 */
export const LAST_RUNNER_MS = 3000

export interface Profile {
  id: string
  name: string
}

/** Everything known about one participant, local or remote. */
export interface RoomPlayer extends Profile {
  /** 0..4, derived deterministically from sorted ids - drives colour + stagger. */
  slot: number
  isSelf: boolean
  lastSeen: number
  /** Live race data. */
  distance: number
  x: number
  jumpY: number
  alive: boolean
  /** Locked in when the player crashes. */
  finalDistance: number | null
}

export type NetMessage =
  /** "I am here" - also asks everyone else to announce themselves back. */
  | { t: 'hello'; id: string; name: string; host: boolean }
  /** Reply to a hello so the newcomer learns about us, and who hosts. */
  | { t: 'here'; id: string; name: string; racing: boolean; host: boolean }
  | { t: 'beat'; id: string }
  | { t: 'bye'; id: string }
  /** Host starts the countdown and picks the seed for this round's track. */
  | { t: 'go'; seed: number }
  /** Position update, deliberately short since it goes out 10x a second. */
  | { t: 's'; id: string; d: number; x: number; y: number; a: 0 | 1 }
  /** Final distance, sent once on crash. */
  | { t: 'fin'; id: string; d: number }
  /** Host sends everyone back to the lobby. */
  | { t: 'lobby' }

/**
 * A room is just a pub/sub pipe. Presence, slots and host election are all
 * built on top of this in room.ts, so swapping the transport changes nothing
 * about the game logic.
 */
export interface Transport {
  send(message: NetMessage): void
  close(): void
}

export type TransportKind = 'online' | 'local'
