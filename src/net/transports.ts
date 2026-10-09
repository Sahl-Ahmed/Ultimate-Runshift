import type { NetMessage, Transport } from './types'

type Handler = (message: NetMessage) => void

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isOnlineConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

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
