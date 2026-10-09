import { useEffect } from 'react'
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

      switch (key) {
        case 'a':
        case 'arrowleft':
          event.preventDefault()
          moveLane(-1)
          break
        case 'd':
        case 'arrowright':
          event.preventDefault()
          moveLane(1)
          break
        case ' ':
        case 'spacebar':
          event.preventDefault()
          if (game.phase === 'playing') jump()
          else startRun()
          break
        case 'enter':
          if (game.phase !== 'playing') startRun()
          break
        case 'r':
          if (game.phase !== 'playing') startRun()
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
