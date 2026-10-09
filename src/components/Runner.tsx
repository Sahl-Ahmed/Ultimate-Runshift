import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX, COLORS, mat } from '../three/resources'

/**
 * Everything the runner visual needs, read fresh every frame. The local player
 * and every remote ghost feed the same shape, so there is only one character
 * model in the project.
 */
export interface RunnerPose {
  x: number
  y: number
  z: number
  /** Drives the run cycle. */
  runTime: number
  /** Higher = faster leg turnover. */
  speed: number
  onGround: boolean
  running: boolean
  /** Lane target minus current x, used for the lean. */
  drift: number
}

interface Props {
  pose: RunnerPose
  shirt: string
  pants: string
  /** Ghosts are drawn slightly see-through so they never hide an obstacle. */
  transparent?: boolean
}

/** Blocky humanoid built from primitives only. Group origin sits at the feet. */
export function Runner({ pose, shirt, pants, transparent = false }: Props) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)

  const shirtMat = transparent ? ghostMat(shirt) : mat(shirt)
  const pantsMat = transparent ? ghostMat(pants) : mat(pants)
  const skinMat = transparent ? ghostMat(COLORS.skin) : mat(COLORS.skin)
  const shoeMat = transparent ? ghostMat(COLORS.shoes) : mat(COLORS.shoes)
  const hairMat = transparent ? ghostMat(COLORS.hair) : mat(COLORS.hair)

  useFrame(() => {
    if (!root.current || !body.current) return

    root.current.position.set(pose.x, pose.y, pose.z)
    const lean = THREE.MathUtils.clamp(pose.drift, -2, 2)
    root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, -lean * 0.12, 0.2)

    const cadence = pose.runTime * (6 + pose.speed * 0.55)
    const swing = Math.sin(cadence)

    if (pose.onGround && pose.running) {
      leftLeg.current!.rotation.x = swing * 0.95
      rightLeg.current!.rotation.x = -swing * 0.95
      leftArm.current!.rotation.x = -swing * 0.8
      rightArm.current!.rotation.x = swing * 0.8
      body.current.position.y = Math.abs(Math.cos(cadence)) * 0.07
      body.current.rotation.x = 0.06
    } else {
      const target = pose.running ? 1 : 0
      leftLeg.current!.rotation.x = THREE.MathUtils.lerp(leftLeg.current!.rotation.x, -0.9 * target, 0.25)
      rightLeg.current!.rotation.x = THREE.MathUtils.lerp(rightLeg.current!.rotation.x, 0.5 * target, 0.25)
      leftArm.current!.rotation.x = THREE.MathUtils.lerp(leftArm.current!.rotation.x, -2.2 * target, 0.25)
      rightArm.current!.rotation.x = THREE.MathUtils.lerp(rightArm.current!.rotation.x, -2.2 * target, 0.25)
      body.current.position.y = 0
      body.current.rotation.x = 0.1
    }
  })

  const castShadow = !transparent

  return (
    <group ref={root}>
      <group ref={body}>
        <mesh geometry={BOX} material={shirtMat} position={[0, 1.12, 0]} scale={[0.72, 0.8, 0.42]} castShadow={castShadow} />
        <mesh geometry={BOX} material={pantsMat} position={[0, 0.76, 0]} scale={[0.7, 0.3, 0.42]} castShadow={castShadow} />
        <mesh geometry={BOX} material={skinMat} position={[0, 1.78, 0]} scale={[0.5, 0.5, 0.5]} castShadow={castShadow} />
        <mesh geometry={BOX} material={hairMat} position={[0, 2.03, -0.02]} scale={[0.54, 0.12, 0.54]} />

        <group ref={leftArm} position={[-0.46, 1.44, 0]}>
          <mesh geometry={BOX} material={shirtMat} position={[0, -0.18, 0]} scale={[0.2, 0.36, 0.2]} castShadow={castShadow} />
          <mesh geometry={BOX} material={skinMat} position={[0, -0.5, 0]} scale={[0.2, 0.3, 0.2]} />
        </group>
        <group ref={rightArm} position={[0.46, 1.44, 0]}>
          <mesh geometry={BOX} material={shirtMat} position={[0, -0.18, 0]} scale={[0.2, 0.36, 0.2]} castShadow={castShadow} />
          <mesh geometry={BOX} material={skinMat} position={[0, -0.5, 0]} scale={[0.2, 0.3, 0.2]} />
        </group>

        <group ref={leftLeg} position={[-0.19, 0.68, 0]}>
          <mesh geometry={BOX} material={pantsMat} position={[0, -0.22, 0]} scale={[0.26, 0.44, 0.26]} castShadow={castShadow} />
          <mesh geometry={BOX} material={shoeMat} position={[0, -0.52, 0.04]} scale={[0.28, 0.18, 0.34]} />
        </group>
        <group ref={rightLeg} position={[0.19, 0.68, 0]}>
          <mesh geometry={BOX} material={pantsMat} position={[0, -0.22, 0]} scale={[0.26, 0.44, 0.26]} castShadow={castShadow} />
          <mesh geometry={BOX} material={shoeMat} position={[0, -0.52, 0.04]} scale={[0.28, 0.18, 0.34]} />
        </group>
      </group>
    </group>
  )
}

// Ghost materials are cached separately from the solid ones.
const ghostCache = new Map<string, THREE.MeshLambertMaterial>()
function ghostMat(color: string): THREE.MeshLambertMaterial {
  let material = ghostCache.get(color)
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.74 })
    ghostCache.set(color, material)
  }
  return material
}
