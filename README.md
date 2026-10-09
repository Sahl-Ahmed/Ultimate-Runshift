# ULTIMATE RUNSHIFT

**Run. Shift. Survive.**

A browser-based low-poly 3D endless runner built as a class project with Vite + React +
TypeScript + Three.js (`@react-three/fiber` / `@react-three/drei`). The look is deliberately
blocky and Minecraft-ish: boxes, cylinders, flat colours, two lights, no external assets.

## Running it

```bash
npm install
npm run dev
```

Then open the printed URL (default <http://localhost:5173>).

```bash
npm run build     # typecheck + production build into dist/
npm run preview   # serve the production build
```

## Controls

| Key | Action |
| --- | --- |
| `A` / `←` | Move one lane left |
| `D` / `→` | Move one lane right |
| `Space` | Jump |
| `R` / `Enter` / `Space` | Start or restart |

## Gameplay

- The character runs forward automatically across **five lanes** and can never leave them.
- Score grows with distance travelled; the best score is kept in `localStorage`.
- Speed ramps gradually from 11 up to a cap of 34 units/s, so the game gets harder the
  longer you survive. The HUD shows the current speed and a difficulty bar.
- Hitting an obstacle ends the run and shows the final score, the best score and a
  restart button.

### Environments

The track is generated procedurally from reusable 24-unit segments. Each biome lasts
7–11 segments and never repeats back to back:

1. **Normal road** – five lane asphalt, kerbs, lane markings, trees, signs, lamps, buildings.
2. **Railway** – ballast, sleepers, rails per lane, telegraph poles, train obstacles.
3. **River** – the track becomes water, a boat rises out of the river under the player and
   carries them forward, then sinks away again when the river ends.

Obstacle rows block at most three of the five lanes and are spaced at least 13 units
apart, so a safe path always exists and impossible combinations cannot be generated.

## Project layout

```
src/
  game/
    constants.ts    tuning values (lanes, speeds, gravity, scoring)
    types.ts        shared data types
    state.ts        mutable per-frame game state + throttled HUD store
    track.ts        procedural segment generation, biomes, recycling
    collision.ts    axis-aligned player/obstacle test
    useKeyboard.ts  key bindings
  components/
    GameCanvas.tsx  canvas, lights, fog
    GameLoop.tsx    the single per-frame simulation authority + camera
    Track.tsx       renders the live segment list
    segments/       road / railway / river segment visuals
    Obstacle.tsx    every obstacle kind
    Props.tsx       trees, rocks, signs, lamps, buildings, reeds
    Player.tsx      blocky humanoid with run and jump animation
    Boat.tsx        river boat
    Scenery.tsx     ground, mountains, drifting clouds
  three/
    resources.ts    shared geometries, cached materials, palette
  ui/               HUD, start screen, game over screen, styles
```

## How it works

- The player never actually moves along Z. The track scrolls toward the player instead,
  which keeps floating point precision stable for an endless run and makes collision a
  simple test against obstacles near `z = 0`.
- `GameLoop` is the only place that simulates: movement, gravity, biome tracking,
  collision and the camera. Every other component just reads state.
- Game state lives in a plain mutable object, not React state. React re-renders only when
  segments spawn/recycle and when the throttled HUD snapshot changes, so the render loop
  stays allocation free.
- All meshes share a handful of geometries and a per-colour material cache.

In dev builds, `window.__runshift` exposes `{ game, track, startRun }` for console poking.
