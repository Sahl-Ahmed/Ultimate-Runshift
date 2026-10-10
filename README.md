# ULTIMATE RUNSHIFT

**Run. Shift. Survive.**

A browser-based low-poly 3D endless runner built as a class project with Vite + React +
TypeScript + Three.js (`@react-three/fiber` / `@react-three/drei`). The look is deliberately
blocky and Minecraft-ish: boxes, cylinders, flat colours, two lights, no external assets.
Own server check <https://runshift-server.onrender.com/health>

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

## Multiplayer (up to 10 players)

One player picks **Create Room** and gets a 5-character code; everyone else picks
**Join Room** and types it in. Each player gets a random name and their own outfit
colour, and everyone lines up on the same start line so the whole field is on
screen together from the first second.

Lanes fill round robin: the first five players take a lane each, the next five
double up, and so on. Players sharing a lane fan out sideways by a few
centimetres rather than standing inside each other, your own runner is drawn
solid while everyone else is faded, and a marker floats above your head - so
you can always pick yourself out of the crowd.

- **Everyone runs the same track.** The host picks a seed for each round and the
  level generator is fully deterministic, so all five PCs build an identical track.
  A fresh seed every round means the same room never replays the same track.
- **The host picks the speed preset** for the room, and it is sent with the start
  signal, so everyone races on the same settings.
- **Crashing freezes your score** and switches you to spectating — the camera
  follows whoever is still running.
- **Once only one runner is left, the race is called after 3 seconds**, so the
  winner is not left running alone while everyone waits. Everyone sees the
  countdown, then the full placing.
- A live leaderboard shows the running order during the race.
- **The room locks when the race starts.** Anyone who tries the code after that
  is told the run already started, and waits for a fresh round.
- **Switching tabs does not stop you.** The simulation is driven by a worker
  clock, so a player who alt-tabs keeps running (and can still crash) rather
  than freezing mid-track.

Joining tells you what went wrong, and lets you fix the code on the spot:

| Situation | What you see |
| --- | --- |
| Code nobody is hosting | **No room found** |
| Room already has 5 players | **Room is full** |
| Fewer than 4 characters typed | **Incomplete code** |

### Option A: your own relay (recommended)

The folder [`server/`](server) holds a ~100 line WebSocket relay: clients
connect to `wss://<host>/?room=ABCDE` and anything one sends is forwarded to
the others. It stores nothing - a room is a `Set` of sockets that disappears
when the last player leaves - and it never parses the game's messages.

Deploy it anywhere that runs Node. On Render's free tier:

| Setting | Value |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

Then set `VITE_WS_URL=wss://your-server.onrender.com` and rebuild. Free
instances sleep after 15 idle minutes and take up to a minute to wake, which
the game shows as a "waking the server" screen; `GET /health` is there for an
uptime pinger if you would rather it stayed up.

### Option B: Supabase Realtime

Supabase Realtime Broadcast works with **no database tables, no SQL and no
auth** — a room exists only in memory inside a realtime
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

### What it costs

Each racing player broadcasts its position **10 times a second**, and the room
is quiet otherwise - during a race the position updates already prove a player
is alive, so no separate heartbeat is sent. Solo play never touches the
network at all.

How much that costs depends entirely on **who is billing it**:

| | Supabase free | Own relay on a free host |
| --- | --- | --- |
| Billed by | messages, counted once per recipient | bandwidth |
| Full room, 3 min match | 183,600 messages | ~15 MB |
| Monthly allowance | 2,000,000 messages | ~100 GB |
| **Full rooms per month** | **~10** | **~6,500** |
| 4-player matches per month | ~80 | tens of thousands |

That is why the relay exists. Its whole job is to move the cost from a
per-message quota to bandwidth, which this game barely uses.

## Controls

| Key | Action |
| --- | --- |
| `A` / `←` | Move one lane left |
| `D` / `→` | Move one lane right |
| `Space` | Jump |
| `B` (hold) | Look behind you |
| `R` / `Enter` / `Space` | Start or restart |

## Gameplay

- The character runs forward automatically across **five lanes** and can never leave them.
- Score grows with distance travelled; the best score is kept in `localStorage`.
- Speed climbs the longer you survive, all the way to 100 units/s, at which
  point surviving is no longer really the point. The HUD shows the current
  speed, the preset and a progress bar toward top speed.

### Speed presets

Pick one before starting (solo: on the menu; multiplayer: the host picks for the
room). Speed grows as `start × e^(accel × seconds)`, so it builds smoothly rather
than in steps.

| Preset | Start | Top | At 30s | At 60s | Reaches top |
| --- | --- | --- | --- | --- | --- |
| Normal | 5 | 100 | 12.3 | 30.2 | ~100s |
| Medium | 15 | 100 | 42.9 | 100 | ~54s |
| Extreme | 25 | 100 | 83.0 | 100 | ~35s |

The first **5 seconds of every run are obstacle free**, so there is time to get
settled before anything can hit you.

Your solo choice is remembered in `localStorage`. The numbers live in
`DIFFICULTIES` in [src/game/constants.ts](src/game/constants.ts) if you want to
tune them.
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
    collision.ts    swept player/obstacle test
    simulate.ts     fixed-timestep world step, driven by frames and the worker
    clock.worker.ts worker metronome, so a hidden tab keeps simulating
    useKeyboard.ts  key bindings
  net/
    types.ts        message shapes and tuning (max players, tick rates)
    transports.ts   own relay, Supabase, or browser tabs - picked by env
    identity.ts     random names, room codes, per-slot outfits
    room.ts         roster, slots, host election, countdown, ranking
  components/
    GameCanvas.tsx  canvas, lights, fog
    GameLoop.tsx    drives the simulation and owns the camera
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
server/
  index.js          the WebSocket relay (no database, nothing stored)
```

## How it works

- The player never actually moves along Z. The track scrolls toward the player instead,
  which keeps floating point precision stable for an endless run and makes collision a
  simple test against obstacles near `z = 0`.
- The simulation lives in `simulate.ts` on a fixed 1/60 timestep, and is driven
  from two places: the render loop, and a worker clock that keeps ticking while
  the page is hidden. Whichever fires first does the work, so a backgrounded
  player keeps running. `GameLoop` then only owns the camera.
- Collision is swept, not instantaneous. At 100 units/s one step covers more
  ground than a thin obstacle is deep, so each obstacle is tested against the
  whole span it crossed during the step instead of just where it ended up.
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
  derives the same colours and lane positions with no negotiation. The lane and
  the sideways nudge are a pure function of the slot and the head count.
- Lane 0 is at +X, not -X. The camera looks toward +Z, and a camera facing that
  way has world -X on its right, so the lane table runs positive to negative.
- The player who **created** the room is the host, and announces that when
  introducing themselves. If the host leaves, every client promotes the lowest
  remaining id — a rule they all apply identically, so a room is never left
  without a host.
- Multiplayer is peer-to-peer and trusts each client's reported distance. That is
  fine among friends, but it is not cheat-proof.

In dev builds, `window.__runshift` exposes `{ game, track, startRun }` for console poking.
