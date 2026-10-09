import { LANE_WIDTH, SEGMENT_LENGTH, TRACK_WIDTH } from '../../game/constants'
import { BOX, COLORS, mat } from '../../three/resources'

const HALF = TRACK_WIDTH / 2
const DASH_SPACING = 6
const DASHES = Array.from({ length: Math.floor(SEGMENT_LENGTH / DASH_SPACING) }, (_, i) => i * DASH_SPACING + 2)
const DIVIDERS = [1, 2, 3, 4].map((i) => -HALF + i * LANE_WIDTH)

/** Five lane asphalt road with kerbs and dashed lane markings. */
export function RoadSegment() {
  return (
    <group>
      {/* asphalt */}
      <mesh
        geometry={BOX}
        material={mat(COLORS.asphalt)}
        position={[0, -0.1, SEGMENT_LENGTH / 2]}
        scale={[TRACK_WIDTH + 1.2, 0.2, SEGMENT_LENGTH]}
        receiveShadow
      />
      {/* kerbs */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={BOX}
          material={mat(COLORS.kerb)}
          position={[side * (HALF + 0.85), 0.05, SEGMENT_LENGTH / 2]}
          scale={[0.7, 0.4, SEGMENT_LENGTH]}
          receiveShadow
        />
      ))}
      {/* lane markings */}
      {DIVIDERS.map((x) =>
        DASHES.map((z) => (
          <mesh
            key={`${x}-${z}`}
            geometry={BOX}
            material={mat(COLORS.laneLine)}
            position={[x, 0.01, z]}
            scale={[0.14, 0.04, 3]}
          />
        )),
      )}
      {/* grass shoulders */}
      {[-1, 1].map((side) => (
        <mesh
          key={`g${side}`}
          geometry={BOX}
          material={mat(side < 0 ? COLORS.grass : COLORS.grassDark)}
          position={[side * (HALF + 13), -0.16, SEGMENT_LENGTH / 2]}
          scale={[24, 0.3, SEGMENT_LENGTH]}
          receiveShadow
        />
      ))}
    </group>
  )
}
