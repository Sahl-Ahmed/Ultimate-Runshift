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

// ------------------------------------------------------------------ helpers
const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
const randomRange = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)]

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

  reset() {
    this.segments = []
    this.nextIndex = 0
    this.nextZ = -SEGMENT_LENGTH // one segment behind the player, so the start looks solid
    this.biome = 'road'
    this.biomeLeft = BIOME_MIN_SEGMENTS
    this.lastRowZ = 0
    while (this.nextZ < SEGMENTS_AHEAD * SEGMENT_LENGTH) this.append()
    this.emit()
  }

  /** Moves the whole track toward the player and recycles segments. */
  update(delta: number, speed: number) {
    const shift = speed * delta
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
      this.biomeLeft = randomInt(BIOME_MIN_SEGMENTS, BIOME_MAX_SEGMENTS)
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
    return pick(options)
  }

  private buildObstacles(segment: Segment) {
    // Up to two rows per segment, always respecting the minimum row spacing.
    const candidates = [randomRange(4, 9), randomRange(14, 20)]
    const difficulty = Math.min(1, segment.index / 60)

    for (const localZ of candidates) {
      const worldZ = segment.z + localZ
      if (worldZ - this.lastRowZ < MIN_ROW_GAP) continue
      if (Math.random() > 0.55 + difficulty * 0.3) continue

      this.buildRow(segment, localZ, difficulty)
      this.lastRowZ = worldZ
    }
  }

  private buildRow(segment: Segment, localZ: number, difficulty: number) {
    const pool = OBSTACLES_BY_BIOME[segment.biome]
    // 1..3 blocked lanes: two free lanes always remain, so a safe path exists.
    const maxBlocked = difficulty > 0.5 ? 3 : 2
    const blockedCount = randomInt(1, maxBlocked)

    const lanes = [0, 1, 2, 3, 4]
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[lanes[i], lanes[j]] = [lanes[j], lanes[i]]
    }
    const blocked = lanes.slice(0, blockedCount)

    // Guarantee at least one low (jumpable) obstacle in the row.
    const lowIndex = Math.floor(Math.random() * blocked.length)
    blocked.forEach((lane, i) => {
      const useLow = i === lowIndex || pool.tall.length === 0 || Math.random() < 0.5
      const kind = useLow ? pick(pool.low) : pick(pool.tall)
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
    const count = randomInt(5, 9)

    for (let i = 0; i < count; i++) {
      const side = Math.random() < 0.5 ? -1 : 1
      segment.props.push({
        id: nextPropId++,
        kind: pick(kinds),
        x: side * randomRange(edge, edge + 14),
        z: randomRange(0, SEGMENT_LENGTH),
        scale: randomRange(0.8, 1.45),
        rotation: randomRange(0, Math.PI * 2),
        colorIndex: randomInt(0, 2),
      })
    }
  }
}

export const track = new TrackManager()
track.reset()
