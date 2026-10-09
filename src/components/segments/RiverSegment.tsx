import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SEGMENT_LENGTH, TRACK_WIDTH, WATER_Y } from '../../game/constants'
import { BOX, COLORS, mat } from '../../three/resources'

const RIVER_WIDTH = 52
const BANK_X = RIVER_WIDTH / 2 + 10
const WAVE_ROWS = [3, 8, 13, 18, 22]

/**
 * Wide river. The water surface bobs and a few foam strips slide sideways,
 * which is enough motion to sell "flowing water" with flat materials.
 */
export function RiverSegment({ phase }: { phase: number }) {
  const surface = useRef<THREE.Group>(null)
  const waves = useRef<THREE.Group>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (surface.current) {
      surface.current.position.y = Math.sin(t * 1.3 + phase) * 0.07
    }
    if (waves.current) {
      waves.current.children.forEach((child, i) => {
        child.position.y = Math.sin(t * 2.1 + phase + i * 1.1) * 0.12
        child.position.x = Math.sin(t * 0.7 + phase + i * 2.3) * 2.4
      })
    }
  })

  return (
    <group>
      <group ref={surface}>
        <mesh
          geometry={BOX}
          material={mat(COLORS.water)}
          position={[0, WATER_Y, SEGMENT_LENGTH / 2]}
          scale={[RIVER_WIDTH, 0.5, SEGMENT_LENGTH]}
        />
        <mesh
          geometry={BOX}
          material={mat(COLORS.waterDeep)}
          position={[0, WATER_Y - 0.26, SEGMENT_LENGTH / 2]}
          scale={[RIVER_WIDTH, 0.6, SEGMENT_LENGTH]}
        />
      </group>

      {/* foam / wave crests */}
      <group ref={waves}>
        {WAVE_ROWS.map((z, i) => (
          <mesh
            key={z}
            geometry={BOX}
            material={mat(COLORS.foam)}
            position={[i % 2 === 0 ? -6 : 7, WATER_Y + 0.2, z]}
            scale={[i % 2 === 0 ? 7 : 9, 0.14, 0.7]}
          />
        ))}
      </group>

      {/* banks on both sides */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            geometry={BOX}
            material={mat(COLORS.dirt)}
            position={[side * (RIVER_WIDTH / 2 - 0.5), -0.3, SEGMENT_LENGTH / 2]}
            scale={[3, 1.2, SEGMENT_LENGTH]}
          />
          <mesh
            geometry={BOX}
            material={mat(side < 0 ? COLORS.grass : COLORS.grassDark)}
            position={[side * BANK_X, -0.2, SEGMENT_LENGTH / 2]}
            scale={[20, 0.4, SEGMENT_LENGTH]}
            receiveShadow
          />
        </group>
      ))}

      {/* faint lane guides painted on the water so the 5 lanes stay readable */}
      <mesh
        geometry={BOX}
        material={mat(COLORS.waterDeep)}
        position={[0, WATER_Y + 0.27, SEGMENT_LENGTH / 2]}
        scale={[TRACK_WIDTH, 0.02, SEGMENT_LENGTH]}
      />
    </group>
  )
}
