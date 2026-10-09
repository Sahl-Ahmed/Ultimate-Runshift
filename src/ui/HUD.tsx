import { BASE_SPEED, MAX_SPEED } from '../game/constants'
import type { HudSnapshot } from '../game/state'

const BIOME_LABEL: Record<HudSnapshot['biome'], string> = {
  road: 'Normal Road',
  railway: 'Railway',
  river: 'River',
}

export function HUD({ snapshot }: { snapshot: HudSnapshot }) {
  const progress = Math.round(((snapshot.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 100)

  return (
    <div className="hud">
      <div className="hud-score">
        <span className="label">Score</span>
        <span className="value">{snapshot.score.toLocaleString()}</span>
        <span className="label">Best {snapshot.best.toLocaleString()}</span>
      </div>

      <div className="hud-right">
        <div className={`chip biome-${snapshot.biome}`}>
          Zone <b>{BIOME_LABEL[snapshot.biome]}</b>
        </div>
        <div className="chip">
          Speed <b>{snapshot.speed.toFixed(1)}</b>
        </div>
        <div className="speed-meter" title={`Difficulty ${progress}%`}>
          <span style={{ width: `${Math.max(2, Math.min(100, progress))}%` }} />
        </div>
      </div>

      <div className="hud-hint">A / D or ← → to shift &nbsp;·&nbsp; Space to jump</div>
    </div>
  )
}
