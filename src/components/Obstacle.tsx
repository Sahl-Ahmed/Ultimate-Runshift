import { BOX, COLORS, CYLINDER, mat } from '../three/resources'
import { LANE_X } from '../game/constants'
import type { Obstacle as ObstacleData } from '../game/types'

interface Props {
  data: ObstacleData
  /** Ground height of the owning segment. */
  baseY: number
}

/**
 * One blocky obstacle. The outer group is placed on the lane / ground, and the
 * decoration inside stays within the collision box used by the physics step.
 */
export function Obstacle({ data, baseY }: Props) {
  const [w, h, d] = data.size
  return (
    <group position={[LANE_X[data.lane], baseY, data.z]}>
      {renderKind(data.kind, w, h, d)}
    </group>
  )
}

function renderKind(kind: ObstacleData['kind'], w: number, h: number, d: number) {
  switch (kind) {
    case 'barrier':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.barrier)} position={[0, h * 0.72, 0]} scale={[w, h * 0.42, d]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.barrierStripe)} position={[0, h * 0.72, d * 0.52]} scale={[w * 0.45, h * 0.28, d * 0.1]} />
          <mesh geometry={BOX} material={mat(COLORS.signPost)} position={[-w * 0.35, h * 0.26, 0]} scale={[0.14, h * 0.52, 0.14]} />
          <mesh geometry={BOX} material={mat(COLORS.signPost)} position={[w * 0.35, h * 0.26, 0]} scale={[0.14, h * 0.52, 0.14]} />
        </>
      )

    case 'crate':
    case 'floatCrate':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.crate)} position={[0, h * 0.5, 0]} scale={[w, h, d]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.trunk)} position={[0, h * 0.5, d * 0.51]} scale={[w * 0.9, h * 0.12, 0.04]} />
          <mesh geometry={BOX} material={mat(COLORS.trunk)} position={[0, h * 0.86, 0]} scale={[w * 1.02, h * 0.1, d * 1.02]} />
        </>
      )

    case 'car':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.car)} position={[0, h * 0.4, 0]} scale={[w, h * 0.5, d]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.carDark)} position={[0, h * 0.76, -d * 0.08]} scale={[w * 0.82, h * 0.3, d * 0.5]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.lampGlow)} position={[0, h * 0.34, d * 0.5]} scale={[w * 0.7, 0.16, 0.06]} />
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <mesh
                key={`${sx}${sz}`}
                geometry={CYLINDER}
                material={mat(COLORS.shoes)}
                position={[sx * w * 0.5, h * 0.17, sz * d * 0.31]}
                rotation={[0, 0, Math.PI / 2]}
                scale={[0.34, 0.12, 0.34]}
              />
            )),
          )}
        </>
      )

    case 'roadblock':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.barrier)} position={[0, h * 0.45, 0]} scale={[w * 0.55, h * 0.9, d * 0.55]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.barrierStripe)} position={[0, h * 0.5, 0]} scale={[w * 0.58, h * 0.2, d * 0.58]} />
          <mesh geometry={BOX} material={mat(COLORS.shoes)} position={[0, h * 0.05, 0]} scale={[w, h * 0.1, d]} />
        </>
      )

    case 'train':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.train)} position={[0, h * 0.55, 0]} scale={[w, h * 0.78, d]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.trainDark)} position={[0, h * 0.14, 0]} scale={[w * 1.02, h * 0.2, d * 0.98]} />
          <mesh geometry={BOX} material={mat(COLORS.lampGlow)} position={[0, h * 0.68, d * 0.5]} scale={[w * 0.5, 0.3, 0.06]} />
          {[-0.3, 0, 0.3].map((t) => (
            <mesh
              key={t}
              geometry={BOX}
              material={mat(COLORS.rail)}
              position={[w * 0.5, h * 0.62, t * d]}
              scale={[0.05, h * 0.3, d * 0.18]}
            />
          ))}
          <mesh geometry={BOX} material={mat(COLORS.trainDark)} position={[0, h * 0.97, 0]} scale={[w * 0.6, h * 0.08, d * 0.6]} />
        </>
      )

    case 'signalBox':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.signalBox)} position={[0, h * 0.45, 0]} scale={[w, h * 0.9, d]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.roof)} position={[0, h * 0.95, 0]} scale={[w * 1.15, h * 0.1, d * 1.15]} />
          <mesh geometry={BOX} material={mat(COLORS.buoy)} position={[0, h * 0.62, d * 0.52]} scale={[0.3, 0.3, 0.06]} />
        </>
      )

    case 'trackBlock':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.sleeper)} position={[0, h * 0.5, 0]} scale={[w, h, d]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.rail)} position={[0, h * 1.0, 0]} scale={[w * 1.04, h * 0.14, d * 0.5]} />
        </>
      )

    case 'rock':
      return (
        <>
          <mesh geometry={BOX} material={mat(COLORS.stone)} position={[0, h * 0.45, 0]} rotation={[0, 0.4, 0]} scale={[w, h * 0.9, d]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.stoneDark)} position={[w * 0.22, h * 0.9, -d * 0.1]} rotation={[0, 0.9, 0]} scale={[w * 0.5, h * 0.35, d * 0.5]} />
          {/* submerged base so it reads as sticking out of the water */}
          <mesh geometry={BOX} material={mat(COLORS.stoneDark)} position={[0, -0.6, 0]} scale={[w * 0.8, 1.4, d * 0.8]} />
        </>
      )

    case 'buoy':
      return (
        <>
          <mesh geometry={CYLINDER} material={mat(COLORS.buoy)} position={[0, h * 0.5, 0]} scale={[w * 0.8, h, d * 0.8]} castShadow />
          <mesh geometry={CYLINDER} material={mat(COLORS.barrierStripe)} position={[0, h * 0.6, 0]} scale={[w * 0.84, h * 0.22, d * 0.84]} />
          <mesh geometry={BOX} material={mat(COLORS.shoes)} position={[0, h * 1.08, 0]} scale={[0.1, 0.3, 0.1]} />
          <mesh geometry={CYLINDER} material={mat(COLORS.stoneDark)} position={[0, -0.5, 0]} scale={[w * 0.5, 1.2, d * 0.5]} />
        </>
      )

    case 'log':
      return (
        <>
          <mesh
            geometry={CYLINDER}
            material={mat(COLORS.log)}
            position={[0, h * 0.5, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[h, w, h]}
            castShadow
          />
          <mesh geometry={BOX} material={mat(COLORS.trunk)} position={[0, h * 0.5, 0]} scale={[w * 0.18, h * 0.5, d * 1.02]} />
        </>
      )
  }
}
