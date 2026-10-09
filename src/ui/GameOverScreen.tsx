import { startRun } from '../game/state'
import { Controls } from './Controls'

export function GameOverScreen({ score, best }: { score: number; best: number }) {
  const isNewBest = score > 0 && score >= best

  return (
    <div className="overlay gameover">
      <div className="card">
        <h1 className="title">GAME OVER</h1>
        <p className="tagline">You crashed</p>
        <div className="scores">
          <div>
            <span className="label">Score</span>
            <span className="value">{score.toLocaleString()}</span>
          </div>
          <div>
            <span className="label">Best</span>
            <span className="value best">{best.toLocaleString()}</span>
          </div>
        </div>
        {isNewBest && <p className="new-best">New personal best!</p>}
        <Controls />
        <button className="btn" onClick={startRun} autoFocus>
          Restart
        </button>
        <p className="footnote">Or press R</p>
      </div>
    </div>
  )
}
