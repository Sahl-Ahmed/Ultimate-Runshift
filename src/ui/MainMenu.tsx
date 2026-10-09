import { useState } from 'react'
import { normalizeRoomCode } from '../net/identity'
import { room } from '../net/room'
import { isOnlineConfigured } from '../net/transports'
import { startRun } from '../game/state'
import { Controls } from './Controls'

export function MainMenu({ best }: { best: number }) {
  const [code, setCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)

  const joinRoom = () => {
    if (normalizeRoomCode(code).length >= 4) void room.join(code)
  }

  return (
    <div className="overlay">
      <div className="card">
        <h1 className="title">ULTIMATE RUNSHIFT</h1>
        <p className="tagline">Run. Shift. Survive.</p>

        <Controls />

        <div className="menu-actions">
          <button className="btn" onClick={() => startRun()}>
            Play Solo
          </button>
          <button className="btn btn-alt" onClick={() => void room.create()}>
            Create Room
          </button>
          {showJoin ? (
            <div className="join-row">
              <input
                className="code-input"
                value={code}
                autoFocus
                spellCheck={false}
                placeholder="ROOM CODE"
                maxLength={8}
                onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') joinRoom()
                }}
              />
              <button className="btn btn-alt" onClick={joinRoom} disabled={normalizeRoomCode(code).length < 4}>
                Join
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={() => setShowJoin(true)}>
              Join Room
            </button>
          )}
        </div>

        <p className="footnote">
          {best > 0 ? `Best score ${best.toLocaleString()} · ` : ''}
          Up to 5 players · {isOnlineConfigured ? 'Online play ready' : 'Local mode: same PC, extra browser tabs'}
        </p>
      </div>
    </div>
  )
}
