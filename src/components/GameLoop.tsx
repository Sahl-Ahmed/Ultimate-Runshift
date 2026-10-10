import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { game } from '../game/state'
import { advanceSimulation } from '../game/simulate'

/** Front view: behind and above, far enough back to see the whole field. */
const CAM_BACK = -11.5
const CAM_HEIGHT = 5.2
/** Rear view (hold B): in front of the player, looking back down the track. */
const REAR_FORWARD = 8
const REAR_HEIGHT = 4.6

const vec = new THREE.Vector3()
const look = new THREE.Vector3()

/**
 * Drives the simulation and owns the camera.
 *
 * The simulation itself lives in `simulate.ts` and is advanced from two
 * places: this render loop, and a worker clock that keeps ticking while the
 * page is hidden. Whichever fires first does the work, so a player who
 * switches tabs keeps running instead of freezing on the spot.
 */
export function GameLoop() {
  const camera = useThree((state) => state.camera)
  const lookBack = useRef(0)

  useEffect(() => {
    const worker = new Worker(new URL('../game/clock.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = () => advanceSimulation()
    worker.postMessage('start')
    return () => {
      worker.postMessage('stop')
      worker.terminate()
    }
  }, [])

  useFrame((_, rawDelta) => {
    advanceSimulation()

    // Camera is pure presentation, so it runs on frames rather than steps.
    const delta = Math.min(rawDelta, 1 / 30)
    const anchorX = game.alive ? game.x : 0
    const playerY = game.groundY + (game.alive ? game.jumpY : 0)

    lookBack.current = THREE.MathUtils.damp(lookBack.current, game.lookBack ? 1 : 0, 9, delta)
    const t = lookBack.current

    // Blend between trailing the player and looking back over their shoulder.
    vec.set(
      anchorX * 0.55,
      playerY * 0.4 + THREE.MathUtils.lerp(CAM_HEIGHT, REAR_HEIGHT, t),
      THREE.MathUtils.lerp(CAM_BACK, REAR_FORWARD, t),
    )
    look.set(
      anchorX * 0.3,
      playerY + THREE.MathUtils.lerp(1.4, 1.1, t),
      THREE.MathUtils.lerp(12, -45, t),
    )

    camera.position.x = THREE.MathUtils.damp(camera.position.x, vec.x, 5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, vec.y, 4, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, vec.z, 6, delta)
    camera.lookAt(look)
  })

  return null
}
