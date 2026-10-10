import { useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LANE_X } from '../game/constants'
import { game } from '../game/state'
import { outfitForSlot } from '../net/identity'
import { room } from '../net/room'
import { BOX, COLORS, mat } from '../three/resources'
import { Runner, type RunnerPose } from './Runner'

/**
 * The local player. Always drawn at z = 0 - the world scrolls instead. Hidden
 * while spectating a race, because the camera then follows the leader.
 */
export function Player() {
  const snapshot = useSyncExternalStore(room.subscribe, room.getSnapshot)
  const self = snapshot.players.find((player) => player.isSelf)
  const outfit = outfitForSlot(self ? self.slot : 0)
  const inRace = snapshot.status === 'racing' || snapshot.status === 'countdown'
  const marker = useRef<THREE.Group>(null)

  const pose = useMemo<RunnerPose>(
    () => ({ x: 0, y: 0, z: 0, runTime: 0, speed: 0, onGround: true, running: false, drift: 0 }),
    [],
  )

  useFrame((state) => {
    pose.x = game.x
    pose.y = game.groundY + game.jumpY
    pose.z = 0
    pose.runTime = game.runTime
    pose.speed = game.speed
    pose.onGround = game.onGround
    pose.running = game.phase === 'playing' && game.alive
    pose.drift = LANE_X[game.lane] + game.laneOffset - game.x

    if (marker.current) {
      const t = state.clock.elapsedTime
      marker.current.position.set(pose.x, pose.y + 2.9 + Math.sin(t * 3) * 0.1, 0)
      marker.current.rotation.y = t * 2
    }
  })

  // While spectating there is no local runner on screen to show.
  if (game.multiplayer && !game.alive) return null

  return (
    <group>
      <Runner pose={pose} shirt={outfit.shirt} pants={outfit.pants} />
      {/*
        In a race your own marker sits above your head, pointing down, so you
        can always find yourself even when three runners share a lane.
      */}
      {inRace && (
        <group ref={marker}>
          <mesh
            geometry={BOX}
            material={mat(COLORS.lampGlow)}
            rotation={[0, Math.PI / 4, Math.PI / 4]}
            scale={[0.3, 0.3, 0.3]}
          />
          <mesh geometry={BOX} material={mat(outfit.chip)} position={[0, 0.3, 0]} scale={[0.5, 0.12, 0.5]} />
        </group>
      )}
    </group>
  )
}
