import {
  LANE_X,
  PLAYER_HALF_DEPTH,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  SEGMENT_LENGTH,
} from './constants'
import { game } from './state'
import { groundYFor } from './track'
import type { Segment } from './types'

/** Shrink factor so clipping a corner pixel is not an instant loss. */
const FORGIVENESS = 0.82

/**
 * Axis-aligned overlap test between the player (always at Z = 0) and every
 * obstacle close enough to matter.
 *
 * `shift` is how far the track scrolled this frame. At 100 units/s a frame
 * can move the world further than a thin obstacle is deep, so testing only
 * the obstacle's current position would let the player pass straight through
 * it. Instead each obstacle is tested against the whole span it swept across
 * during the frame: it was at `worldZ + shift` and is now at `worldZ`.
 */
export function checkCollision(segments: Segment[], shift = 0): boolean {
  const px = game.x
  const playerBottom = game.groundY + game.jumpY
  const playerTop = playerBottom + PLAYER_HEIGHT
  const halfW = PLAYER_HALF_WIDTH * FORGIVENESS
  const halfD = PLAYER_HALF_DEPTH * FORGIVENESS
  const sweep = Math.max(0, shift)
  // How far away a segment can still be relevant this frame.
  const reach = SEGMENT_LENGTH + sweep + 8

  for (let s = 0; s < segments.length; s++) {
    const segment = segments[s]
    if (segment.z > sweep + 8 || segment.z + SEGMENT_LENGTH < -reach) continue

    const base = groundYFor(segment.biome)
    const obstacles = segment.obstacles

    for (let o = 0; o < obstacles.length; o++) {
      const obstacle = obstacles[o]
      const worldZ = segment.z + obstacle.z
      const [w, h, d] = obstacle.size
      const halfObsD = d * 0.5 * FORGIVENESS

      // Swept span of the obstacle over this frame, in world Z.
      const near = worldZ - halfObsD
      const far = worldZ + halfObsD + sweep
      if (near > halfD || far < -halfD) continue

      const ox = LANE_X[obstacle.lane]
      if (Math.abs(px - ox) > halfW + w * 0.5 * FORGIVENESS) continue

      const obstacleTop = base + h
      if (playerBottom < obstacleTop && playerTop > base) return true
    }
  }
  return false
}
