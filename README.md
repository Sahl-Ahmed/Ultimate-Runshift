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

## Multiplayer (up to 5 players)

One player picks **Create Room** and gets a 5-character code; everyone else picks
**Join Room** and types it in. Each player gets a random name and their own outfit
colour, and all five line up on a staggered marathon grid.

- **Everyone runs the same track.** The host picks a seed for each round and the
  level generator is fully deterministic, so all five PCs build an identical track.
  A fresh seed every round means the same room never replays the same track.
- **The stagger is cosmetic.** Scoring is always each player's own distance, so
  starting further forward is no advantage.
- **Crashing freezes your score** and switches you to spectating — the camera
  follows whoever is still running. Results appear once everyone has crashed, and
  the last player standing comes 1st.
- A live leaderboard shows the running order during the race.
- Someone who joins mid-race waits in the lobby for the next round.

### Online play setup (optional)

Multiplayer runs over **Supabase Realtime Broadcast**. It needs **no database
tables, no SQL and no auth** — a room exists only in memory inside a realtime
channel, and there is nothing to clean up afterwards.

1. Create a free project at <https://supabase.com>
2. Open **Project Settings → API**
3. Copy `.env.example` to `.env` and paste in the Project URL and the `anon public` key
4. Restart `npm run dev`

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

**Without those values the game still works.** Multiplayer falls back to **local
mode**, which connects browser tabs on the same PC through a `BroadcastChannel` —
handy for testing the whole flow on your own before a real session. The menu
tells you which mode is active.

A race sends about 10 small messages per second per player, which stays well
inside Supabase's free tier.

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
    rng.ts          seeded PRNG, so a room's track is identical everywhere
    state.ts        mutable per-frame game state + throttled HUD store
    track.ts        procedural segment generation, biomes, recycling
    collision.ts    axis-aligned player/obstacle test
    useKeyboard.ts  key bindings
  net/
    types.ts        message shapes and tuning (max players, tick rates)
    identity.ts     random names, room codes, the five outfits
    transports.ts   Supabase Realtime (online) and BroadcastChannel (local)
    room.ts         roster, slots, host election, countdown, ranking
  components/
    GameCanvas.tsx  canvas, lights, fog
    GameLoop.tsx    the single per-frame simulation authority + camera
    Track.tsx       renders the live segment list
    segments/       road / railway / river segment visuals
    Obstacle.tsx    every obstacle kind
    Props.tsx       trees, rocks, signs, lamps, buildings, reeds
    Runner.tsx      the shared blocky character model
    Player.tsx      the local runner
    Ghosts.tsx      remote runners, smoothed between network updates
    Boat.tsx        river boat
    Scenery.tsx     ground, mountains, drifting clouds
  three/
    resources.ts    shared geometries, cached materials, palette
  ui/               menu, lobby, HUD, leaderboard, results, styles
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
- Because distance is the single source of truth, a remote player's on-screen
  position is one subtraction: `theirDistance - myViewDistance`.
- Networking runs on plain timers rather than the render loop, so a player who
  switches tabs (which pauses animation frames) stays in the roster instead of
  being dropped.
- Player slots come from the sorted client ids, so every client independently
  derives the same colours, grid positions and host with no negotiation.
- Multiplayer is peer-to-peer and trusts each client's reported distance. That is
  fine among friends, but it is not cheat-proof.

In dev builds, `window.__runshift` exposes `{ game, track, startRun }` for console poking.
