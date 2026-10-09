import { startRun } from '../game/state'
import { Controls } from './Controls'

export function StartScreen({ best }: { best: number }) {
  return (
    <div className="overlay">
      <div className="card">
        <h1 className="title">ULTIMATE RUNSHIFT</h1>
        <p className="tagline">Run. Shift. Survive.</p>
        <Controls />
        <button className="btn" onClick={startRun} autoFocus>
          Start Game
        </button>
        <p className="footnote">
          {best > 0 ? `Best score ${best.toLocaleString()}` : 'Dodge through road, railway and river'}
        </p>
      </div>
    </div>
  )
}
