import type { NetMessage, Transport } from './types'

type Handler = (message: NetMessage) => void

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isOnlineConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

/** Free instances sleep when idle, and waking one takes most of a minute. */
const RELAY_TIMEOUT_MS = 75_000

/**
 * Same machine, different browser tabs. Costs nothing, needs no account and
 * is how the whole multiplayer flow can be tested locally.
 */
export function createLocalTransport(roomCode: string, onMessage: Handler): Transport {
  const channel = new BroadcastChannel(`runshift:${roomCode}`)
  channel.onmessage = (event) => onMessage(event.data as NetMessage)
  return {
    send(message) {
      channel.postMessage(message)
    },
    close() {
      channel.onmessage = null
      channel.close()
    },
  }
}

/**
 * Real online play over Supabase Realtime Broadcast. This uses no database
 * tables, no auth and no SQL - the room only ever exists in memory inside the
 * realtime channel. supabase-js is imported lazily so solo play never pays for it.
 */
export async function createOnlineTransport(roomCode: string, onMessage: Handler): Promise<Transport> {
  if (!isOnlineConfigured) throw new Error('Supabase is not configured')

  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    realtime: { params: { eventsPerSecond: 20 } },
  })

  const channel = client.channel(`runshift-${roomCode}`, { config: { broadcast: { self: false } } })
  channel.on('broadcast', { event: 'm' }, (payload) => {
    onMessage(payload.payload as NetMessage)
  })

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out connecting to the room')), 12000)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer)
        resolve()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer)
        reject(new Error(`Could not join the room (${status})`))
      }
    })
  })

  return {
    send(message) {
      void channel.send({ type: 'broadcast', event: 'm', payload: message })
    },
    close() {
      void channel.unsubscribe()
      void client.removeAllChannels()
    },
  }
}

const WS_URL = import.meta.env.VITE_WS_URL as string | undefined

/** Normalises http(s):// to ws(s):// so either form works in the env var. */
function websocketUrl(base: string, roomCode: string): string {
  const trimmed = base.trim().replace(/\/+$/, '')
  const scheme = trimmed.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  const withScheme = /^wss?:/.test(scheme) ? scheme : `wss://${scheme}`
  return `${withScheme}/?room=${encodeURIComponent(roomCode)}`
}

export const isRelayConfigured = Boolean(WS_URL)

/**
 * Which transport this build will actually use, so the menu can say so.
 * Handy for confirming a deploy really picked up its environment variables.
 */
/**
 * Pokes the relay so a sleeping free instance starts waking up immediately,
 * rather than only when someone opens a room. Players spend a few seconds on
 * the menu anyway, which is usually enough to cover the whole cold start.
 *
 * Fire and forget: a failure here means nothing, the room connection will
 * report any real problem.
 */
let woken = false

export function wakeRelay(): void {
  if (!WS_URL || woken) return
  woken = true
  const base = WS_URL.trim().replace(/\/+$/, '').replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
  const url = /^https?:/.test(base) ? base : `https://${base}`
  void fetch(`${url}/health`, { mode: 'cors', cache: 'no-store' }).catch(() => {})
}

export function transportLabel(): string {
  if (isRelayConfigured) return 'Own server'
  if (isOnlineConfigured) return 'Supabase'
  return 'Local mode: same PC, extra browser tabs'
}

/**
 * The game's own relay server. Unlike Supabase this is billed by bandwidth
 * rather than per message, so rooms cost almost nothing to run.
 *
 * The connect timeout is deliberately long: a free instance sleeps after a
 * few idle minutes and takes most of a minute to wake up again.
 */
export function createRelayTransport(
  roomCode: string,
  onMessage: Handler,
  onWaking?: () => void,
): Promise<Transport> {
  if (!WS_URL) throw new Error('No relay server is configured')

  const socket = new WebSocket(websocketUrl(WS_URL, roomCode))

  return new Promise<Transport>((resolve, reject) => {
    // If it has not connected quickly the instance is almost certainly
    // asleep, so tell the UI to explain the wait rather than look frozen.
    const wakingTimer = setTimeout(() => onWaking?.(), 2500)
    const failTimer = setTimeout(() => {
      socket.close()
      reject(new Error('The game server did not respond in time'))
    }, RELAY_TIMEOUT_MS)

    const settled = () => {
      clearTimeout(wakingTimer)
      clearTimeout(failTimer)
    }

    socket.onopen = () => {
      settled()
      socket.onmessage = (event) => {
        try {
          onMessage(JSON.parse(String(event.data)) as NetMessage)
        } catch {
          /* ignore anything that is not one of our messages */
        }
      }
      resolve({
        send(message) {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
        },
        close() {
          socket.onclose = null
          socket.close()
        },
      })
    }

    socket.onerror = () => {
      settled()
      reject(new Error('Could not reach the game server'))
    }
    socket.onclose = () => {
      settled()
      reject(new Error('The game server closed the connection'))
    }
  })
}
