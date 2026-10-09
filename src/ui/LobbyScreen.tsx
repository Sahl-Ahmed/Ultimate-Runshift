import { useState } from 'react'
import { outfitForSlot } from '../net/identity'
import { room, type RoomSnapshot } from '../net/room'
import { MAX_PLAYERS } from '../net/types'

export function LobbyScreen({ snapshot }: { snapshot: RoomSnapshot }) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(snapshot.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard can be blocked - the code is on screen anyway */
    }
  }

  const full = snapshot.players.length >= MAX_PLAYERS

  return (
    <div className="overlay">
      <div className="card">
        <h2 className="panel-title">Room Lobby</h2>

        <button className="room-code" onClick={copyCode} title="Click to copy">
          {snapshot.code}
          <span className="room-code-hint">{copied ? 'Copied!' : 'Click to copy'}</span>
        </button>

        <p className="tagline" style={{ margin: '4px 0 18px' }}>
          {snapshot.kind === 'online'
            ? 'Share this code with your friends'
            : 'Local mode · open another browser tab and join with this code'}
        </p>

        <div className="player-list">
          {snapshot.players.map((player) => {
            const outfit = outfitForSlot(player.slot)
            return (
              <div className="player-row" key={player.id}>
                <span className="dot" style={{ background: outfit.shirt }} />
                <span className="player-name">{player.name}</span>
                <span className="player-tags">
                  {player.isSelf && <em className="tag you">You</em>}
                  {player.id === hostIdOf(snapshot) && <em className="tag host">Host</em>}
                </span>
                <span className="player-grid">Grid {player.slot + 1}</span>
              </div>
            )
          })}
          {Array.from({ length: MAX_PLAYERS - snapshot.players.length }, (_, i) => (
            <div className="player-row empty" key={`empty-${i}`}>
              <span className="dot" />
              <span className="player-name">Waiting for a player…</span>
            </div>
          ))}
        </div>

        {snapshot.raceInProgress ? (
          <p className="waiting">A race is already running · you join the next round</p>
        ) : snapshot.isHost ? (
          <button className="btn" onClick={() => room.startRace()}>
            Start Race
          </button>
        ) : (
          <p className="waiting">Waiting for the host to start…</p>
        )}

        <div className="menu-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => room.leave()}>
            Leave Room
          </button>
        </div>

        <p className="footnote">
          {full ? 'Room is full' : `${snapshot.players.length} / ${MAX_PLAYERS} players`} · everyone runs the same track
        </p>
      </div>
    </div>
  )
}

/** The host is simply the lowest id, which every client works out identically. */
function hostIdOf(snapshot: RoomSnapshot): string | null {
  let host: string | null = null
  for (const player of snapshot.players) if (host === null || player.id < host) host = player.id
  return host
}
