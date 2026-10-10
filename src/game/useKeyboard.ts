import { useEffect } from 'react'
import { room } from '../net/room'
import { game, jump, moveLane, startRun } from './state'

/**
 * Global keyboard bindings:
 *   A / ArrowLeft  - one lane left
 *   D / ArrowRight - one lane right
 *   Space          - jump (or start the run from the title screen)
 *   R              - restart after game over
 */
export function useKeyboard() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const key = event.key.toLowerCase()
      // Solo start / restart keys must not fire while a room is in control,
      // and never while typing a room code.
      const target = event.target as HTMLElement | null
      const typing = target?.tagName === 'INPUT'
      const soloControls = room.getSnapshot().status === 'idle' && !typing

      switch (key) {
        case 'a':
        case 'arrowleft':
          if (typing) break
          event.preventDefault()
          moveLane(-1)
          break
        case 'd':
        case 'arrowright':
          if (typing) break
          event.preventDefault()
          moveLane(1)
          break
        case ' ':
        case 'spacebar':
          if (typing) break
          event.preventDefault()
          if (game.phase === 'playing') jump()
          else if (soloControls) startRun()
          break
        case 'enter':
          if (game.phase !== 'playing' && soloControls) startRun()
          break
        case 'r':
          if (game.phase !== 'playing' && soloControls) startRun()
          break
        case 'b':
          // Held, not toggled: the rear view lasts only while the key is down.
          if (!typing) game.lookBack = true
          break
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b') game.lookBack = false
    }
    // Releasing the key outside the window would otherwise stick the view.
    const onBlur = () => {
      game.lookBack = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
