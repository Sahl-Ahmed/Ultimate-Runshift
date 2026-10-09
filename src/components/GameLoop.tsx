import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GRAVITY, LANE_SHIFT_SPEED, LANE_X } from '../game/constants'
import { checkCollision } from '../game/collision'
import { endRun, game, onReset, speedForDistance, syncHud } from '../game/state'
import { groundYFor, track } from '../game/track'

const MAX_DELTA = 1 / 30
const HUD_INTERVAL = 0.08

/**
 * The single authority for per-frame simulation: movement, gravity, biome
 * tracking, collision and the camera. Rendering components only read state.
 */
export function GameLoop() {
  const camera = useThree((state) => state.camera)
  const hudTimer = useRef(0)

  // Restarting a run rebuilds the whole track.
  useEffect(() => onReset(() => track.reset()), [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_DELTA)

    if (game.phase === 'playing') {
      // --- forward motion and gradual speed ramp
      game.speed = speedForDistance(game.distance)
      game.distance += game.speed * delta
      game.runTime += delta
      track.update(delta, game.speed)

      // --- lane change
      game.x = THREE.MathUtils.damp(game.x, LANE_X[game.lane], LANE_SHIFT_SPEED, delta)

      // --- biome under the player drives ground height and the boat
      const biome = track.biomeAtPlayer()
      game.biome = biome
      game.groundY = THREE.MathUtils.damp(game.groundY, groundYFor(biome), 7, delta)
      game.boat = THREE.MathUtils.damp(game.boat, biome === 'river' ? 1 : 0, 5, delta)

      // --- gravity
      if (!game.onGround) {
        game.velocityY += GRAVITY * delta
        game.jumpY += game.velocityY * delta
        if (game.jumpY <= 0) {
          game.jumpY = 0
          game.velocityY = 0
          game.onGround = true
        }
      }

      // --- collision
      if (checkCollision(track.getSegments())) endRun()

      hudTimer.current += delta
      if (hudTimer.current >= HUD_INTERVAL) {
        hudTimer.current = 0
        syncHud()
      }
    }

    // --- third person camera, always smoothly trailing the player
    const playerY = game.groundY + game.jumpY
    camera.position.x = THREE.MathUtils.damp(camera.position.x, game.x * 0.55, 5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, playerY * 0.4 + 4.4, 4, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, -8.8, 4, delta)
    camera.lookAt(game.x * 0.3, playerY + 1.4, 12)
  })

  return null
}
