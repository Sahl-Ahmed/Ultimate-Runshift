import { DIFFICULTIES } from '../game/constants'
import type { Difficulty } from '../game/types'

const ORDER: Difficulty[] = ['normal', 'medium', 'extreme']

interface Props {
  value: Difficulty
  onChange: (difficulty: Difficulty) => void
  /** Non-hosts see the room's setting but cannot change it. */
  readOnly?: boolean
  label?: string
}

export function DifficultyPicker({ value, onChange, readOnly = false, label = 'Speed' }: Props) {
  return (
    <div className="difficulty">
      <span className="difficulty-label">
        {label}
        {readOnly && ' · set by the host'}
      </span>
      <div className="difficulty-row">
        {ORDER.map((key) => {
          const preset = DIFFICULTIES[key]
          const selected = key === value
          return (
            <button
              key={key}
              type="button"
              disabled={readOnly && !selected}
              className={`difficulty-option${selected ? ' selected' : ''}${readOnly ? ' locked' : ''}`}
              onClick={() => !readOnly && onChange(key)}
            >
              <strong>{preset.label}</strong>
              <em>{preset.blurb}</em>
              <span>
                {preset.start} → {preset.top}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
