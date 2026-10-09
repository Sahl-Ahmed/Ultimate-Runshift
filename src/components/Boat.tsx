import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DECK_Y, TRACK_WIDTH } from '../game/constants'
import { BOX, COLORS, mat } from '../three/resources'
import { game } from '../game/state'

const DECK_W = TRACK_WIDTH + 1.6
const HALF_W = DECK_W / 2
const DECK_LEN = 15
/** Pushed forward so the stern stays in front of the camera at z = -8.8. */
const BOAT_Z = 3

/**
 * The boat the player rides through river sections. It rises out of the water
 * when a river starts and sinks away again when the river ends, so the
 * transition needs no special game logic. The profile is deliberately low:
 * nothing on it may block the third person camera or hide the player.
 */
export function Boat() {
  const root = useRef<THREE.Group>(null)

  useFrame((state) => {
    const group = root.current
    if (!group) return
    const visible = game.boat > 0.01
    group.visible = visible
    if (!visible) return

    const t = state.clock.elapsedTime
    // Deck surface lines up with DECK_Y once fully raised.
    group.position.set(0, DECK_Y - (1 - game.boat) * 4.5 + Math.sin(t * 1.3) * 0.06 * game.boat, BOAT_Z)
    group.rotation.z = Math.sin(t * 0.9) * 0.022 * game.boat
    group.rotation.x = Math.sin(t * 1.3 + 1) * 0.012 * game.boat
  })

  return (
    <group ref={root} visible={false}>
      {/* deck - top face sits at local y = 0 */}
      <mesh geometry={BOX} material={mat(COLORS.boatDeck)} position={[0, -0.15, 0]} scale={[DECK_W, 0.3, DECK_LEN]} receiveShadow />
      {/* deck planking */}
      {[-5, -1.5, 2, 5.5].map((z) => (
        <mesh key={z} geometry={BOX} material={mat(COLORS.boatTrim)} position={[0, 0.01, z]} scale={[DECK_W, 0.04, 0.18]} />
      ))}
      {/* hull */}
      <mesh geometry={BOX} material={mat(COLORS.boatHull)} position={[0, -0.85, 0]} scale={[DECK_W + 0.5, 1.1, DECK_LEN - 0.6]} />
      <mesh geometry={BOX} material={mat(COLORS.boatTrim)} position={[0, -1.5, 0]} scale={[DECK_W - 1.5, 0.5, DECK_LEN - 2]} />
      {/* bow wedge */}
      <mesh
        geometry={BOX}
        material={mat(COLORS.boatHull)}
        position={[0, -0.6, 8.1]}
        rotation={[0.5, 0, 0]}
        scale={[DECK_W - 1.2, 1.4, 2.6]}
      />
      <mesh geometry={BOX} material={mat(COLORS.foam)} position={[0, -1.15, 9.4]} scale={[DECK_W, 0.3, 1.2]} />
      {/* low transom at the stern - stays below the camera's line of sight */}
      <mesh geometry={BOX} material={mat(COLORS.boatTrim)} position={[0, 0.1, -7.4]} scale={[DECK_W, 0.5, 0.4]} />
      {/* side rails, outside the five lanes so they never block a lane */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh geometry={BOX} material={mat(COLORS.boatTrim)} position={[side * HALF_W, 0.2, 0]} scale={[0.35, 0.7, DECK_LEN]} />
          {[-6, -2, 2, 6].map((z) => (
            <mesh
              key={z}
              geometry={BOX}
              material={mat(COLORS.boatHull)}
              position={[side * HALF_W, 0.6, z]}
              scale={[0.5, 0.45, 0.5]}
              castShadow
            />
          ))}
        </group>
      ))}
    </group>
  )
}
