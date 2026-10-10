/**
 * ULTIMATE RUNSHIFT - multiplayer relay.
 *
 * One job: whatever a client sends, forward it to the other clients in the
 * same room. There is no database, no account and no persistence - a room is
 * a Set of sockets that exists only while someone is connected, and vanishes
 * the moment the last player leaves.
 *
 * Messages are forwarded as the raw frame they arrived in. The server never
 * parses them, which keeps it fast enough for a 0.1 CPU free instance and
 * means the game's message format can change without touching this file.
 */
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8787
/** Safety valves, so a stray client cannot exhaust a small free instance. */
const MAX_ROOMS = 200
const MAX_PER_ROOM = 32
const MAX_MESSAGE_BYTES = 4096
/** A socket that has not sent or ponged for this long is dropped. */
const IDLE_TIMEOUT_MS = 60_000

/** roomCode -> Set<WebSocket> */
const rooms = new Map()

const server = createServer((req, res) => {
  // Health check, also used by uptime pingers to keep the instance awake.
  if (req.url === '/health' || req.url === '/') {
    const players = [...rooms.values()].reduce((n, set) => n + set.size, 0)
    // Readable from the game page, which pings it on load to wake the
    // instance before anyone actually clicks Create Room.
    res.writeHead(200, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    })
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES })

function roomCodeFrom(url) {
  const code = new URL(url, 'http://x').searchParams.get('room')
  if (!code) return null
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return clean.length >= 4 ? clean : null
}

function leave(socket) {
  const room = rooms.get(socket.roomCode)
  if (!room) return
  room.delete(socket)
  // An empty room is deleted outright: nothing about a finished match is kept.
  if (room.size === 0) rooms.delete(socket.roomCode)
}

wss.on('connection', (socket, request) => {
  const code = roomCodeFrom(request.url || '')
  if (!code) {
    socket.close(1008, 'missing room code')
    return
  }

  let room = rooms.get(code)
  if (!room) {
    if (rooms.size >= MAX_ROOMS) {
      socket.close(1013, 'server busy')
      return
    }
    room = new Set()
    rooms.set(code, room)
  }
  if (room.size >= MAX_PER_ROOM) {
    socket.close(1013, 'room full')
    return
  }

  socket.roomCode = code
  socket.isAlive = true
  room.add(socket)

  socket.on('message', (data, isBinary) => {
    socket.isAlive = true
    const peers = rooms.get(code)
    if (!peers) return
    // Straight passthrough to everyone else - never back to the sender.
    for (const peer of peers) {
      if (peer !== socket && peer.readyState === peer.OPEN) {
        peer.send(data, { binary: isBinary })
      }
    }
  })

  socket.on('pong', () => {
    socket.isAlive = true
  })
  socket.on('close', () => leave(socket))
  socket.on('error', () => leave(socket))
})

// Drop sockets that went away without closing cleanly, so rooms do not leak.
const sweeper = setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) {
      socket.terminate()
      leave(socket)
      continue
    }
    socket.isAlive = false
    try {
      socket.ping()
    } catch {
      /* socket is on its way out anyway */
    }
  }
}, IDLE_TIMEOUT_MS / 2)

wss.on('close', () => clearInterval(sweeper))

server.listen(PORT, () => {
  console.log(`runshift relay listening on ${PORT}`)
})
