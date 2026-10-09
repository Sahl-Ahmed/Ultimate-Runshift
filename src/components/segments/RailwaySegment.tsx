import { LANE_X, SEGMENT_LENGTH, TRACK_WIDTH } from '../../game/constants'
import { BOX, COLORS, mat } from '../../three/resources'

const HALF = TRACK_WIDTH / 2
const SLEEPER_SPACING = 2.4
const SLEEPERS = Array.from(
  { length: Math.floor(SEGMENT_LENGTH / SLEEPER_SPACING) },
  (_, i) => i * SLEEPER_SPACING + SLEEPER_SPACING / 2,
)
/** Two rails per lane keeps the five lane layout readable. */
const RAILS = LANE_X.flatMap((x) => [x - 0.55, x + 0.55])

export function RailwaySegment() {
  return (
    <group>
      {/* ballast bed */}
      <mesh
        geometry={BOX}
        material={mat(COLORS.ballast)}
        position={[0, -0.12, SEGMENT_LENGTH / 2]}
        scale={[TRACK_WIDTH + 1.6, 0.24, SEGMENT_LENGTH]}
        receiveShadow
      />
      {/* sleepers */}
      {SLEEPERS.map((z) => (
        <mesh
          key={z}
          geometry={BOX}
          material={mat(COLORS.sleeper)}
          position={[0, 0.02, z]}
          scale={[TRACK_WIDTH + 0.6, 0.14, 0.9]}
          receiveShadow
        />
      ))}
      {/* rails */}
      {RAILS.map((x) => (
        <mesh
          key={x}
          geometry={BOX}
          material={mat(COLORS.rail)}
          position={[x, 0.11, SEGMENT_LENGTH / 2]}
          scale={[0.14, 0.14, SEGMENT_LENGTH]}
        />
      ))}
      {/* gravel shoulders + grass */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            geometry={BOX}
            material={mat(COLORS.dirt)}
            position={[side * (HALF + 1.6), -0.14, SEGMENT_LENGTH / 2]}
            scale={[2.4, 0.3, SEGMENT_LENGTH]}
            receiveShadow
          />
          <mesh
            geometry={BOX}
            material={mat(side < 0 ? COLORS.grassDark : COLORS.grass)}
            position={[side * (HALF + 14), -0.17, SEGMENT_LENGTH / 2]}
            scale={[22, 0.3, SEGMENT_LENGTH]}
            receiveShadow
          />
        </group>
      ))}
    </group>
  )
}
