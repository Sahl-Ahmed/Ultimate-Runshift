import { useState } from 'react'
import { room } from '../net/room'
import { isOnlineConfigured } from '../net/transports'
import { startRun } from '../game/state'
import { Controls } from './Controls'
import { JoinForm } from './JoinForm'

export function MainMenu({ best }: { best: number }) {
  const [showJoin, setShowJoin] = useState(false)

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
            <JoinForm />
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
