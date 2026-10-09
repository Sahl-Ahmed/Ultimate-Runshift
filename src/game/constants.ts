/** Tunable game constants. Keeping them in one place makes balancing easy. */

// ---------------------------------------------------------------- lanes
export const LANE_COUNT = 5
export const LANE_WIDTH = 2.2
/** World X position for every lane index (0 = far left, 4 = far right). */
export const LANE_X: number[] = Array.from(
  { length: LANE_COUNT },
  (_, i) => (i - (LANE_COUNT - 1) / 2) * LANE_WIDTH,
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
export const BASE_SPEED = 11
export const MAX_SPEED = 34
/** Speed gained per unit of distance travelled (gradual ramp). */
export const SPEED_PER_DISTANCE = 0.008

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
