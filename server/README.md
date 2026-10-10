# ULTIMATE RUNSHIFT - relay server

A ~100 line WebSocket relay for the game's multiplayer rooms. Clients connect
to `wss://<host>/?room=ABCDE` and anything one of them sends is forwarded to
the others in the same room.

There is no database, no account system and nothing stored: a room is a `Set`
of sockets held in memory, and it is deleted as soon as the last player
disconnects. The server never even parses the game's messages.

## Running locally

```bash
cd server
npm install
npm start          # listens on 8787, or $PORT
```

Then point the game at it with `VITE_WS_URL=ws://localhost:8787` in the
project's `.env`.

## Deploying on Render (free tier)

| Setting | Value |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

Free instances sleep after 15 minutes idle and take 30-60s to wake, which the
game shows as a "waking the server" message. `GET /health` returns a small
JSON body and is a good target for an uptime pinger if you would rather it
stayed awake.
