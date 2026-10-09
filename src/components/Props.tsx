import {
  BOX,
  BUILDING_COLORS,
  COLORS,
  CYLINDER,
  LEAF_COLORS,
  STONE_COLORS,
  mat,
} from '../three/resources'
import type { Prop as PropData } from '../game/types'

/**
 * Roadside scenery. Everything is built from the shared box / cylinder
 * geometry and the cached flat materials, so adding more is nearly free.
 */
export function SceneryProp({ data }: { data: PropData }) {
  return (
    <group position={[data.x, 0, data.z]} rotation={[0, data.rotation, 0]} scale={data.scale}>
      {renderProp(data)}
    </group>
  )
}

function renderProp(data: PropData) {
  switch (data.kind) {
    case 'tree':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.trunk)} position={[0, 1.1, 0]} scale={[0.4, 2.2, 0.4]} castShadow />
          <mesh geometry={BOX} material={mat(LEAF_COLORS[data.colorIndex])} position={[0, 2.6, 0]} scale={[2.1, 1.4, 2.1]} castShadow />
          <mesh geometry={BOX} material={mat(LEAF_COLORS[(data.colorIndex + 1) % 3])} position={[0, 3.6, 0]} scale={[1.3, 0.9, 1.3]} />
        </>
      )

    case 'bush':
      return (
        <>
          <mesh geometry={BOX} material={mat(LEAF_COLORS[data.colorIndex])} position={[0, 0.4, 0]} scale={[1.3, 0.8, 1.3]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.grassDark)} position={[0.3, 0.8, 0.1]} scale={[0.6, 0.4, 0.6]} />
        </>
      )

    case 'rock':
      return (
        <>
          <mesh geometry={BOX} material={mat(STONE_COLORS[data.colorIndex])} position={[0, 0.45, 0]} rotation={[0, 0.5, 0.1]} scale={[1.4, 0.9, 1.2]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.stoneDark)} position={[0.5, 0.8, 0.2]} rotation={[0, 1.1, 0]} scale={[0.7, 0.5, 0.7]} />
        </>
      )

    case 'sign':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.signPost)} position={[0, 1.0, 0]} scale={[0.16, 2.0, 0.16]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.signFace)} position={[0, 2.2, 0]} scale={[1.5, 0.9, 0.12]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.shoes)} position={[0, 2.2, 0.08]} scale={[1.0, 0.16, 0.06]} />
        </>
      )

    case 'lamp':
      return (
        <>
          <mesh geometry={CYLINDER} material={mat(COLORS.lamp)} position={[0, 2.0, 0]} scale={[0.22, 4.0, 0.22]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.lamp)} position={[0.5, 4.0, 0]} scale={[1.2, 0.18, 0.18]} />
          <mesh geometry={BOX} material={mat(COLORS.lampGlow)} position={[1.0, 3.85, 0]} scale={[0.4, 0.2, 0.4]} />
        </>
      )

    case 'polePair':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.trunk)} position={[0, 2.2, 0]} scale={[0.3, 4.4, 0.3]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.trunk)} position={[0, 4.0, 0]} scale={[2.0, 0.22, 0.22]} />
          <mesh geometry={BOX} material={mat(COLORS.shoes)} position={[0, 3.6, 0]} scale={[1.4, 0.1, 0.1]} />
        </>
      )

    case 'building':
      return (
        <>
          <mesh
            geometry={BOX}
            material={mat(BUILDING_COLORS[data.colorIndex])}
            position={[0, 3.2, 0]}
            scale={[5.5, 6.4, 5.5]}
            castShadow
          />
          <mesh geometry={BOX} material={mat(COLORS.roof)} position={[0, 6.6, 0]} scale={[6.0, 0.5, 6.0]} />
          {[-1.4, 1.4].map((x) =>
            [2.0, 4.2].map((y) => (
              <mesh
                key={`${x}-${y}`}
                geometry={BOX}
                material={mat(COLORS.lampGlow)}
                position={[x, y, 2.8]}
                scale={[1.1, 1.1, 0.1]}
              />
            )),
          )}
        </>
      )

    case 'reed':
      return (
        <>
          {[-0.4, 0, 0.45].map((x, i) => (
            <mesh
              key={x}
              geometry={BOX}
              material={mat(LEAF_COLORS[(data.colorIndex + i) % 3])}
              position={[x, 0.7 + i * 0.12, i * 0.2]}
              scale={[0.16, 1.4 + i * 0.25, 0.16]}
            />
          ))}
        </>
      )
  }
}
