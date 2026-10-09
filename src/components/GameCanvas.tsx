import { Canvas } from '@react-three/fiber'
import { Boat } from './Boat'
import { GameLoop } from './GameLoop'
import { Ghosts } from './Ghosts'
import { Player } from './Player'
import { Scenery } from './Scenery'
import { Track } from './Track'

/** The whole 3D scene. Two lights only, one shadow casting. */
export function GameCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 62, near: 0.1, far: 500, position: [0, 4.6, -8.8] }}
    >
      <color attach="background" args={['#9fd4f2']} />
      <fog attach="fog" args={['#9fd4f2', 70, 260]} />

      <hemisphereLight intensity={0.7} color="#dff0ff" groundColor="#5f7a4f" />
      <directionalLight
        position={[22, 34, 12]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0009}
      />

      {/* GameLoop is mounted first so every visual reads fresh state. */}
      <GameLoop />
      <Scenery />
      <Track />
      <Boat />
      <Ghosts />
      <Player />
    </Canvas>
  )
}
