import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GRAVITY, LANE_SHIFT_SPEED, LANE_X } from '../game/constants'
import { checkCollision } from '../game/collision'
import { endRun, game, speedForDistance, syncHud } from '../game/state'
import { groundYFor, track } from '../game/track'
import { room } from '../net/room'

const MAX_DELTA = 1 / 30
const HUD_INTERVAL = 0.08

/**
 * The single authority for per-frame simulation: movement, gravity, biome
 * tracking, collision, networking and the camera. Rendering components only
 * read state.
 */
export function GameLoop() {
  const camera = useThree((state) => state.camera)
  const hudTimer = useRef(0)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_DELTA)

    if (game.phase === 'playing') {
      const previousView = game.viewDistance

      if (game.alive) {
        // --- forward motion and gradual speed ramp
        game.speed = speedForDistance(game.distance)
        game.distance += game.speed * delta
        game.viewDistance = game.distance
        game.runTime += delta

        // --- lane change
        game.x = THREE.MathUtils.damp(game.x, LANE_X[game.lane], LANE_SHIFT_SPEED, delta)

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
      } else {
        // --- spectating: drift the view toward whoever is still running
        const leader = room.leaderDistance()
        if (Number.isFinite(leader)) {
          game.viewDistance = THREE.MathUtils.damp(game.viewDistance, leader, 2.5, delta)
        }
      }

      // --- scroll the track by however far the view moved
      track.update(game.viewDistance - previousView)

      // --- biome under the camera drives ground height and the boat
      const biome = track.biomeAtPlayer()
      game.biome = biome
      game.groundY = THREE.MathUtils.damp(game.groundY, groundYFor(biome), 7, delta)
      game.boat = THREE.MathUtils.damp(game.boat, biome === 'river' ? 1 : 0, 5, delta)

      // --- collision
      if (game.alive && checkCollision(track.getSegments())) {
        game.alive = false
        if (game.multiplayer) {
          // Distance is now frozen; the run continues as a spectator.
          room.reportCrash(game.distance)
        } else {
          endRun()
        }
      }

      hudTimer.current += delta
      if (hudTimer.current >= HUD_INTERVAL) {
        hudTimer.current = 0
        syncHud()
      }
    }

    // --- third person camera, always smoothly trailing the action
    const anchorX = game.alive ? game.x : 0
    const playerY = game.groundY + (game.alive ? game.jumpY : 0)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, anchorX * 0.55, 5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, playerY * 0.4 + 4.4, 4, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, -8.8, 4, delta)
    camera.lookAt(anchorX * 0.3, playerY + 1.4, 12)
  })

  return null
}
