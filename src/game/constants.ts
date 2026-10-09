/** Tunable game constants. Keeping them in one place makes balancing easy. */
import type { Difficulty } from './types'

// ---------------------------------------------------------------- lanes
export const LANE_COUNT = 5
export const LANE_WIDTH = 2.2
/**
 * World X for each lane index, where lane 0 is the one on the LEFT of the
 * screen and lane 4 is on the right.
 *
 * The camera sits behind the player looking toward +Z, and a camera looking
 * that way has world -X on its right hand side. So screen-left is +X, and the
 * lane positions run from positive to negative. Getting this backwards is what
 * makes the left key move the player right.
 */
export const LANE_X: number[] = Array.from(
  { length: LANE_COUNT },
  (_, i) => ((LANE_COUNT - 1) / 2 - i) * LANE_WIDTH,
)
export const TRACK_WIDTH = LANE_COUNT * LANE_WIDTH

// ---------------------------------------------------------------- track
/** Length of one procedural segment along Z. */
export const SEGMENT_LENGTH = 24
/** How many segments are kept alive in front of the player. */
export const SEGMENTS_AHEAD = 13
/** Segments whose far edge passed this Z are recycled. */
export const DESPAWN_Z = -34
/** Segments at the start of a run that are guaranteed obstacle free. */
export const WARMUP_SEGMENTS = 2

// ---------------------------------------------------------------- biomes
/** Min / max number of segments a biome lasts before the next one starts. */
export const BIOME_MIN_SEGMENTS = 7
export const BIOME_MAX_SEGMENTS = 11

// ---------------------------------------------------------------- motion
/**
 * Speed presets. `accel` is the speed gained per unit of distance, which makes
 * speed grow as v0 * e^(accel * t) - so "time to reach top speed" is
 * ln(top / start) / accel. The comments below give that in seconds.
 */
export interface SpeedPreset {
  label: string
  blurb: string
  start: number
  top: number
  accel: number
}

export const DIFFICULTIES: Record<Difficulty, SpeedPreset> = {
  normal: { label: 'Normal', blurb: 'Steady build-up', start: 11, top: 28, accel: 0.016 }, // ~58s to top
  medium: { label: 'Medium', blurb: 'Quick and punchy', start: 15, top: 36, accel: 0.02 }, //  ~44s
  extreme: { label: 'Extreme', blurb: 'Flat out, no mercy', start: 19, top: 44, accel: 0.025 }, // ~34s
}

export const DEFAULT_DIFFICULTY: Difficulty = 'normal'
export const DIFFICULTY_KEY = 'ultimate-runshift:difficulty'

/** Fallbacks for anything that needs a number before a run has started. */
export const BASE_SPEED = DIFFICULTIES[DEFAULT_DIFFICULTY].start
export const MAX_SPEED = DIFFICULTIES[DEFAULT_DIFFICULTY].top

export const GRAVITY = -38
export const JUMP_VELOCITY = 12.6
/** How fast the player slides between lanes (units per second-ish damping). */
export const LANE_SHIFT_SPEED = 12

// ---------------------------------------------------------------- player
export const PLAYER_HALF_WIDTH = 0.42
export const PLAYER_HALF_DEPTH = 0.4
export const PLAYER_HEIGHT = 1.7

// ---------------------------------------------------------------- river
/** Height of the boat deck the player runs on during river sections. */
export const DECK_Y = 0.62
export const WATER_Y = -0.45

// ---------------------------------------------------------------- scoring
export const SCORE_PER_UNIT = 2
export const BEST_SCORE_KEY = 'ultimate-runshift:best'

// ---------------------------------------------------------------- obstacles
/** Minimum distance along Z between two obstacle rows. */
export const MIN_ROW_GAP = 13
/** Obstacles no taller than this can be cleared with a jump. */
export const JUMPABLE_HEIGHT = 1.5
