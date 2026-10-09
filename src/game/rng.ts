/**
 * Tiny seeded PRNG. Multiplayer needs every player to generate exactly the
 * same track, so the room code is hashed into a seed and the whole track is
 * built from this deterministic stream instead of Math.random().
 */
export type Rng = () => number

/** FNV-1a, so a room code maps to a stable 32 bit seed. */
export function hashString(value: string): number {
  let hash = 2166136261 >>> 0
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** mulberry32 - small, fast, good enough for level generation. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const randomSeed = () => (Math.random() * 0xffffffff) >>> 0

export const rngInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
export const rngRange = (rng: Rng, min: number, max: number) => min + rng() * (max - min)
export const rngPick = <T,>(rng: Rng, values: readonly T[]): T => values[Math.floor(rng() * values.length)]
