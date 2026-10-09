import { useMemo, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { game, speedForDistance } from '../game/state'
import { outfitForSlot } from '../net/identity'
import { room, staggerForSlot } from '../net/room'
import type { RoomPlayer } from '../net/types'
import { BOX, mat } from '../three/resources'
import { Runner, type RunnerPose } from './Runner'

/** Remote players are only drawn while they are close enough to matter. */
const VISIBLE_RANGE = 170

export function Ghosts() {
  const snapshot = useSyncExternalStore(room.subscribe, room.getSnapshot)
  if (snapshot.status !== 'racing' && snapshot.status !== 'results') return null

  return (
    <group>
      {snapshot.players
        .filter((player) => !player.isSelf)
        .map((player) => (
          <Ghost key={player.id} player={player} />
        ))}
    </group>
  )
}

/**
 * One remote runner. Network updates arrive ~10x a second, so the pose is
 * damped toward the latest values instead of snapping to them.
 */
function Ghost({ player }: { player: RoomPlayer }) {
  const pose = useMemo<RunnerPose>(
    () => ({ x: 0, y: 0, z: 0, runTime: 0, speed: 0, onGround: true, running: true, drift: 0 }),
    [],
  )
  const marker = useMemo(() => ({ ref: null as THREE.Object3D | null }), [])
  const outfit = outfitForSlot(player.slot)
  const stagger = staggerForSlot(player.slot)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)

    // Position relative to the local camera anchor. The stagger is purely
    // visual - scores are always each player's own distance.
    const targetZ = player.distance + stagger - (game.viewDistance + game.stagger)
    const targetY = game.groundY + player.jumpY

    pose.x = THREE.MathUtils.damp(pose.x, player.x, 14, delta)
    pose.y = THREE.MathUtils.damp(pose.y, targetY, 16, delta)
    pose.z = THREE.MathUtils.damp(pose.z, targetZ, 10, delta)
    pose.onGround = player.jumpY <= 0.02
    pose.running = player.alive
    pose.speed = speedForDistance(player.distance)
    pose.drift = 0
    if (player.alive) pose.runTime += delta

    if (marker.ref) {
      marker.ref.visible = Math.abs(pose.z) < VISIBLE_RANGE
      marker.ref.position.set(pose.x, pose.y + 2.7, pose.z)
      marker.ref.rotation.y += delta * 1.6
    }
  })

  return (
    <group>
      <Runner pose={pose} shirt={outfit.shirt} pants={outfit.pants} transparent />
      {/* floating colour marker so you can spot who is who at a distance */}
      <mesh
        ref={(instance) => {
          marker.ref = instance
        }}
        geometry={BOX}
        material={mat(outfit.chip)}
        scale={[0.42, 0.42, 0.42]}
      />
    </group>
  )
}
