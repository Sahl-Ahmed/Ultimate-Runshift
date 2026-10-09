import { useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { track, groundYFor } from '../game/track'
import type { Segment } from '../game/types'
import { Obstacle } from './Obstacle'
import { SceneryProp } from './Props'
import { RoadSegment } from './segments/RoadSegment'
import { RailwaySegment } from './segments/RailwaySegment'
import { RiverSegment } from './segments/RiverSegment'

/**
 * Renders the live segment list. React only re-renders when segments are
 * spawned or recycled; the per-frame Z movement is applied straight to the
 * Three.js groups, which keeps the hot path allocation free.
 */
export function Track() {
  const segments = useSyncExternalStore(
    (listener) => track.subscribe(listener),
    () => track.version,
  )
  // `version` is only a change token - the data itself lives in the manager.
  void segments

  return (
    <group>
      {track.getSegments().map((segment) => (
        <SegmentView key={segment.id} segment={segment} />
      ))}
    </group>
  )
}

function SegmentView({ segment }: { segment: Segment }) {
  const group = useRef<THREE.Group>(null)
  const baseY = groundYFor(segment.biome)

  useFrame(() => {
    if (group.current) group.current.position.z = segment.z
  })

  return (
    <group ref={group} position={[0, 0, segment.z]}>
      {segment.biome === 'road' && <RoadSegment />}
      {segment.biome === 'railway' && <RailwaySegment />}
      {segment.biome === 'river' && <RiverSegment phase={segment.index * 1.7} />}

      {segment.obstacles.map((obstacle) => (
        <Obstacle key={obstacle.id} data={obstacle} baseY={baseY} />
      ))}
      {segment.props.map((prop) => (
        <SceneryProp key={prop.id} data={prop} />
      ))}
    </group>
  )
}
