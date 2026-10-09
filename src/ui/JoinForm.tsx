import { useState } from 'react'
import { normalizeRoomCode } from '../net/identity'
import { room } from '../net/room'

/**
 * Room code entry. Used on the menu and again on the error screen, so a wrong
 * code can be corrected without going back and retyping everything.
 */
export function JoinForm({ initialCode = '', autoFocus = true }: { initialCode?: string; autoFocus?: boolean }) {
  const [code, setCode] = useState(initialCode)
  const ready = normalizeRoomCode(code).length >= 4

  const submit = () => {
    if (ready) void room.join(code)
  }

  return (
    <div className="join-row">
      <input
        className="code-input"
        value={code}
        autoFocus={autoFocus}
        spellCheck={false}
        placeholder="ROOM CODE"
        maxLength={8}
        onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
      />
      <button className="btn btn-alt" onClick={submit} disabled={!ready}>
        Join
      </button>
    </div>
  )
}
