import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX, COLORS, mat } from '../three/resources'
import { game } from '../game/state'
import { LANE_X } from '../game/constants'

/**
 * Blocky humanoid built from primitives only. The group origin sits at the
 * character's feet, so positioning is just "ground height + jump height".
 */
export function Player() {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!root.current || !body.current) return

    root.current.position.set(game.x, game.groundY + game.jumpY, 0)

    // Lean into the lane change for a bit of weight.
    const drift = THREE.MathUtils.clamp(LANE_X[game.lane] - game.x, -2, 2)
    root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, -drift * 0.12, 0.2)

    const running = game.phase === 'playing'
    const cadence = game.runTime * (6 + game.speed * 0.55)
    const swing = Math.sin(cadence)

    if (game.onGround && running) {
      // Run cycle: opposite arm / leg swing plus a small vertical bob.
      leftLeg.current!.rotation.x = swing * 0.95
      rightLeg.current!.rotation.x = -swing * 0.95
      leftArm.current!.rotation.x = -swing * 0.8
      rightArm.current!.rotation.x = swing * 0.8
      body.current.position.y = Math.abs(Math.cos(cadence)) * 0.07
      body.current.rotation.x = 0.06
    } else {
      // Airborne tuck.
      const target = running ? 1 : 0
      leftLeg.current!.rotation.x = THREE.MathUtils.lerp(leftLeg.current!.rotation.x, -0.9 * target, 0.25)
      rightLeg.current!.rotation.x = THREE.MathUtils.lerp(rightLeg.current!.rotation.x, 0.5 * target, 0.25)
      leftArm.current!.rotation.x = THREE.MathUtils.lerp(leftArm.current!.rotation.x, -2.2 * target, 0.25)
      rightArm.current!.rotation.x = THREE.MathUtils.lerp(rightArm.current!.rotation.x, -2.2 * target, 0.25)
      body.current.position.y = 0
      body.current.rotation.x = 0.1
    }
  })

  return (
    <group ref={root}>
      <group ref={body}>
        {/* torso */}
        <mesh geometry={BOX} material={mat(COLORS.shirt)} position={[0, 1.12, 0]} scale={[0.72, 0.8, 0.42]} castShadow />
        {/* hips */}
        <mesh geometry={BOX} material={mat(COLORS.pants)} position={[0, 0.76, 0]} scale={[0.7, 0.3, 0.42]} castShadow />
        {/* head */}
        <mesh geometry={BOX} material={mat(COLORS.skin)} position={[0, 1.78, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
        {/* hair */}
        <mesh geometry={BOX} material={mat(COLORS.hair)} position={[0, 2.03, -0.02]} scale={[0.54, 0.12, 0.54]} />

        {/* arms - rotated around the shoulder */}
        <group ref={leftArm} position={[-0.46, 1.44, 0]}>
          <mesh geometry={BOX} material={mat(COLORS.shirt)} position={[0, -0.18, 0]} scale={[0.2, 0.36, 0.2]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.skin)} position={[0, -0.5, 0]} scale={[0.2, 0.3, 0.2]} />
        </group>
        <group ref={rightArm} position={[0.46, 1.44, 0]}>
          <mesh geometry={BOX} material={mat(COLORS.shirt)} position={[0, -0.18, 0]} scale={[0.2, 0.36, 0.2]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.skin)} position={[0, -0.5, 0]} scale={[0.2, 0.3, 0.2]} />
        </group>

        {/* legs - rotated around the hip */}
        <group ref={leftLeg} position={[-0.19, 0.68, 0]}>
          <mesh geometry={BOX} material={mat(COLORS.pants)} position={[0, -0.22, 0]} scale={[0.26, 0.44, 0.26]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.shoes)} position={[0, -0.52, 0.04]} scale={[0.28, 0.18, 0.34]} />
        </group>
        <group ref={rightLeg} position={[0.19, 0.68, 0]}>
          <mesh geometry={BOX} material={mat(COLORS.pants)} position={[0, -0.22, 0]} scale={[0.26, 0.44, 0.26]} castShadow />
          <mesh geometry={BOX} material={mat(COLORS.shoes)} position={[0, -0.52, 0.04]} scale={[0.28, 0.18, 0.34]} />
        </group>
      </group>
    </group>
  )
}
