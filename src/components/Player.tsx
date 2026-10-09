import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSyncExternalStore } from 'react'
import { LANE_X } from '../game/constants'
import { game } from '../game/state'
import { outfitForSlot } from '../net/identity'
import { room } from '../net/room'
import { Runner, type RunnerPose } from './Runner'

/**
 * The local player. Always drawn at z = 0 - the world scrolls instead. Hidden
 * while spectating a race, because the camera then follows the leader.
 */
export function Player() {
  const snapshot = useSyncExternalStore(room.subscribe, room.getSnapshot)
  const self = snapshot.players.find((player) => player.isSelf)
  const outfit = outfitForSlot(self ? self.slot : 0)

  const pose = useMemo<RunnerPose>(
    () => ({ x: 0, y: 0, z: 0, runTime: 0, speed: 0, onGround: true, running: false, drift: 0 }),
    [],
  )

  useFrame(() => {
    pose.x = game.x
    pose.y = game.groundY + game.jumpY
    pose.z = 0
    pose.runTime = game.runTime
    pose.speed = game.speed
    pose.onGround = game.onGround
    pose.running = game.phase === 'playing' && game.alive
    pose.drift = LANE_X[game.lane] - game.x
  })

  // While spectating there is no local runner on screen to show.
  if (game.multiplayer && !game.alive) return null

  return <Runner pose={pose} shirt={outfit.shirt} pants={outfit.pants} />
}
