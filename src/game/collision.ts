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
 * Simple axis-aligned box overlap test between the player (always at Z = 0)
 * and every obstacle close enough to matter.
 */
export function checkCollision(segments: Segment[]): boolean {
  const px = game.x
  const playerBottom = game.groundY + game.jumpY
  const playerTop = playerBottom + PLAYER_HEIGHT
  const halfW = PLAYER_HALF_WIDTH * FORGIVENESS
  const halfD = PLAYER_HALF_DEPTH * FORGIVENESS

  for (let s = 0; s < segments.length; s++) {
    const segment = segments[s]
    // Only segments overlapping the player's Z band can contain a hit.
    if (segment.z > 6 || segment.z + SEGMENT_LENGTH < -6) continue

    const base = groundYFor(segment.biome)
    const obstacles = segment.obstacles

    for (let o = 0; o < obstacles.length; o++) {
      const obstacle = obstacles[o]
      const worldZ = segment.z + obstacle.z
      const [w, h, d] = obstacle.size
      const halfObsD = (d * 0.5) * FORGIVENESS

      if (Math.abs(worldZ) > halfD + halfObsD) continue

      const ox = LANE_X[obstacle.lane]
      if (Math.abs(px - ox) > halfW + (w * 0.5) * FORGIVENESS) continue

      const obstacleTop = base + h
      if (playerBottom < obstacleTop && playerTop > base) return true
    }
  }
  return false
}
