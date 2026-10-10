const ROWS: [string[], string][] = [
  [['A', '←'], 'Move one lane left'],
  [['D', '→'], 'Move one lane right'],
  [['Space'], 'Jump'],
  [['B'], 'Hold to look behind'],
  [['R'], 'Restart after game over'],
]

/** Shared controls guide used by the title and game over screens. */
export function Controls() {
  return (
    <div className="controls">
      {ROWS.map(([keys, label]) => (
        <div className="control-row" key={label}>
          {keys.map((key) => (
            <kbd key={key}>{key}</kbd>
          ))}
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
