import { useMemo, useRef } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX, COLORS, UNLIT_WHITE, mat } from '../three/resources'

const CLOUD_BLOCK = 140
const CLOUD_COPIES = 3

interface CloudData {
  x: number
  y: number
  z: number
  scale: [number, number, number]
}

/**
 * Static background dressing: a ground plane that fills the horizon, a ring of
 * blocky mountains and a drifting cloud layer. None of it is regenerated, so
 * it costs almost nothing per frame.
 */
export function Scenery() {
  const clouds = useMemo<CloudData[]>(() => {
    const out: CloudData[] = []
    for (let i = 0; i < 16; i++) {
      out.push({
        x: -100 + Math.random() * 200,
        y: 40 + Math.random() * 18,
        z: Math.random() * CLOUD_BLOCK,
        scale: [9 + Math.random() * 10, 2.4 + Math.random() * 2, 6 + Math.random() * 6],
      })
    }
    return out
  }, [])

  const mountains = useMemo(() => {
    const out: { x: number; z: number; w: number; h: number }[] = []
    // Kept out of the corridor the player looks down, so nothing ever reads as
    // a wall across the track. They never move, which gives free parallax.
    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? -1 : 1
      out.push({
        x: side * (80 + Math.random() * 130),
        z: -120 + Math.random() * 540,
        w: 44 + Math.random() * 46,
        h: 26 + Math.random() * 30,
      })
    }
    return out
  }, [])

  const cloudGroup = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const group = cloudGroup.current
    if (!group) return
    group.position.z -= delta * 3
    if (group.position.z < -CLOUD_BLOCK) group.position.z += CLOUD_BLOCK
  })

  return (
    <group>
      {/* horizon ground so there is never a visible void beside the track */}
      <mesh
        geometry={BOX}
        material={mat(COLORS.grassDark)}
        position={[0, -0.6, 60]}
        scale={[600, 0.6, 700]}
      />

      {/* mountains */}
      <group>
        {mountains.map((m, i) => (
          <group key={i} position={[m.x, 0, m.z]}>
            <mesh geometry={BOX} material={mat(COLORS.mountain)} position={[0, m.h / 2, 0]} rotation={[0, i, 0]} scale={[m.w, m.h, m.w]} />
            <mesh
              geometry={BOX}
              material={mat(COLORS.mountainSnow)}
              position={[0, m.h * 0.94, 0]}
              rotation={[0, i, 0]}
              scale={[m.w * 0.45, m.h * 0.14, m.w * 0.45]}
            />
          </group>
        ))}
      </group>

      {/* clouds - three identical copies so wrapping is seamless */}
      <group ref={cloudGroup}>
        <Instances geometry={BOX} material={UNLIT_WHITE} limit={CLOUD_COPIES * clouds.length}>
          {Array.from({ length: CLOUD_COPIES }, (_, copy) =>
            clouds.map((cloud, i) => (
              <Instance
                key={`${copy}-${i}`}
                position={[cloud.x, cloud.y, cloud.z + copy * CLOUD_BLOCK - CLOUD_BLOCK]}
                scale={cloud.scale}
              />
            )),
          )}
        </Instances>
      </group>
    </group>
  )
}
