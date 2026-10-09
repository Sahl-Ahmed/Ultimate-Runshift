import {
  BIOME_MAX_SEGMENTS,
  BIOME_MIN_SEGMENTS,
  DECK_Y,
  DESPAWN_Z,
  MIN_ROW_GAP,
  SEGMENTS_AHEAD,
  SEGMENT_LENGTH,
  TRACK_WIDTH,
  WARMUP_SEGMENTS,
} from './constants'
import type { Biome, ObstacleKind, PropKind, Segment } from './types'
import { mulberry32, randomSeed, rngInt, rngPick, rngRange, type Rng } from './rng'

/** Blueprint for every obstacle kind: box size and which biome it belongs to. */
const OBSTACLE_SIZES: Record<ObstacleKind, [number, number, number]> = {
  barrier: [1.9, 0.9, 0.5],
  crate: [1.3, 1.3, 1.3],
  car: [1.8, 1.5, 3.4],
  roadblock: [1.2, 1.0, 1.2],
  train: [2.0, 2.7, 7.0],
  signalBox: [1.4, 2.2, 1.4],
  trackBlock: [1.8, 0.8, 1.0],
  rock: [1.6, 1.9, 1.6],
  buoy: [1.1, 1.4, 1.1],
  floatCrate: [1.3, 1.2, 1.3],
  log: [2.0, 0.8, 1.1],
}

/** Tall obstacles cannot be jumped, so a row never uses only those. */
const OBSTACLES_BY_BIOME: Record<Biome, { low: ObstacleKind[]; tall: ObstacleKind[] }> = {
  road: { low: ['barrier', 'crate', 'roadblock'], tall: ['car'] },
  railway: { low: ['barrier', 'trackBlock'], tall: ['train', 'signalBox'] },
  river: { low: ['log', 'buoy', 'floatCrate'], tall: ['rock'] },
}

const PROPS_BY_BIOME: Record<Biome, PropKind[]> = {
  road: ['tree', 'sign', 'lamp', 'building', 'bush', 'rock'],
  railway: ['polePair', 'sign', 'rock', 'bush', 'tree', 'building'],
  river: ['reed', 'rock', 'bush', 'tree'],
}

export function groundYFor(biome: Biome): number {
  return biome === 'river' ? DECK_Y : 0
}

// ------------------------------------------------------------------ manager
let nextSegmentId = 1
let nextObstacleId = 1
let nextPropId = 1

/**
 * Owns the endless strip of segments. Segments are plain data; the React
 * components read them and the game loop pushes their Z positions every frame.
 */
class TrackManager {
  segments: Segment[] = []
  /** Bumped whenever segments are added or removed, so React can re-render. */
  version = 0
  /** Seed the current track was built from. */
  seed = 0

  private rng: Rng = mulberry32(0)
  private nextIndex = 0
  private nextZ = 0
  private biome: Biome = 'road'
  private biomeLeft = 0
  /** World Z of the last obstacle row, used to keep rows fairly spaced. */
  private lastRowZ = 0

  private listeners = new Set<() => void>()

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSegments(): Segment[] {
    return this.segments
  }

  private emit() {
    this.version++
    for (const listener of this.listeners) listener()
  }

  /**
   * Rebuilds the track. Passing the same seed on every machine produces an
   * identical track, because segments are always generated in index order and
   * therefore consume the random stream in the same order everywhere.
   */
  reset(seed: number = randomSeed()) {
    this.seed = seed >>> 0
    this.rng = mulberry32(this.seed)
    this.segments = []
    this.nextIndex = 0
    this.nextZ = -SEGMENT_LENGTH // one segment behind the player, so the start looks solid
    this.biome = 'road'
    this.biomeLeft = BIOME_MIN_SEGMENTS
    this.lastRowZ = 0
    while (this.nextZ < SEGMENTS_AHEAD * SEGMENT_LENGTH) this.append()
    this.emit()
  }

  /**
   * Scrolls the whole track toward the player by `shift` world units and
   * recycles segments that fell behind.
   */
  update(shift: number) {
    if (shift <= 0) return
    const segments = this.segments
    for (let i = 0; i < segments.length; i++) segments[i].z -= shift
    this.lastRowZ -= shift

    let changed = false
    while (segments.length > 0 && segments[0].z + SEGMENT_LENGTH < DESPAWN_Z) {
      segments.shift()
      changed = true
    }
    this.nextZ -= shift
    while (this.nextZ < SEGMENTS_AHEAD * SEGMENT_LENGTH) {
      this.append()
      changed = true
    }
    if (changed) this.emit()
  }

  /** Biome of the segment the player is standing on. */
  biomeAtPlayer(): Biome {
    const segments = this.segments
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      if (segment.z <= 0 && segment.z + SEGMENT_LENGTH > 0) return segment.biome
    }
    return 'road'
  }

  // ---------------------------------------------------------------- building
  private append() {
    if (this.biomeLeft <= 0) {
      this.biome = this.nextBiome()
      this.biomeLeft = rngInt(this.rng, BIOME_MIN_SEGMENTS, BIOME_MAX_SEGMENTS)
    }
    this.biomeLeft--

    const segment: Segment = {
      id: nextSegmentId++,
      index: this.nextIndex,
      biome: this.biome,
      z: this.nextZ,
      obstacles: [],
      props: [],
    }

    // The first couple of segments stay clear so the run never starts unfair.
    if (this.nextIndex >= WARMUP_SEGMENTS) {
      this.buildObstacles(segment)
    }
    this.buildProps(segment)

    this.segments.push(segment)
    this.nextIndex++
    this.nextZ += SEGMENT_LENGTH
  }

  private nextBiome(): Biome {
    // Never repeat the same biome back to back. Road is weighted a little
    // higher so the river stays a highlight rather than the norm.
    const options: Biome[] =
      this.biome === 'river'
        ? ['road', 'road', 'railway']
        : this.biome === 'road'
          ? ['railway', 'railway', 'river']
          : ['road', 'road', 'river']
    return rngPick(this.rng, options)
  }

  private buildObstacles(segment: Segment) {
    // Up to two rows per segment, always respecting the minimum row spacing.
    const candidates = [rngRange(this.rng, 4, 9), rngRange(this.rng, 14, 20)]
    const difficulty = Math.min(1, segment.index / 60)

    for (const localZ of candidates) {
      const worldZ = segment.z + localZ
      if (worldZ - this.lastRowZ < MIN_ROW_GAP) continue
      if (this.rng() > 0.55 + difficulty * 0.3) continue

      this.buildRow(segment, localZ, difficulty)
      this.lastRowZ = worldZ
    }
  }

  private buildRow(segment: Segment, localZ: number, difficulty: number) {
    const pool = OBSTACLES_BY_BIOME[segment.biome]
    // 1..3 blocked lanes: two free lanes always remain, so a safe path exists.
    const maxBlocked = difficulty > 0.5 ? 3 : 2
    const blockedCount = rngInt(this.rng, 1, maxBlocked)

    const lanes = [0, 1, 2, 3, 4]
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1))
      ;[lanes[i], lanes[j]] = [lanes[j], lanes[i]]
    }
    const blocked = lanes.slice(0, blockedCount)

    // Guarantee at least one low (jumpable) obstacle in the row.
    const lowIndex = Math.floor(this.rng() * blocked.length)
    blocked.forEach((lane, i) => {
      const useLow = i === lowIndex || pool.tall.length === 0 || this.rng() < 0.5
      const kind = useLow ? rngPick(this.rng, pool.low) : rngPick(this.rng, pool.tall)
      segment.obstacles.push({
        id: nextObstacleId++,
        kind,
        lane,
        z: localZ,
        size: OBSTACLE_SIZES[kind],
      })
    })
  }

  private buildProps(segment: Segment) {
    const kinds = PROPS_BY_BIOME[segment.biome]
    const edge = segment.biome === 'river' ? TRACK_WIDTH * 0.5 + 9 : TRACK_WIDTH * 0.5 + 1.6
    const count = rngInt(this.rng, 5, 9)

    for (let i = 0; i < count; i++) {
      const side = this.rng() < 0.5 ? -1 : 1
      segment.props.push({
        id: nextPropId++,
        kind: rngPick(this.rng, kinds),
        x: side * rngRange(this.rng, edge, edge + 14),
        z: rngRange(this.rng, 0, SEGMENT_LENGTH),
        scale: rngRange(this.rng, 0.8, 1.45),
        rotation: rngRange(this.rng, 0, Math.PI * 2),
        colorIndex: rngInt(this.rng, 0, 2),
      })
    }
  }
}

export const track = new TrackManager()
track.reset()
