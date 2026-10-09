import { useSyncExternalStore } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { hudStore } from './game/state'
import { useKeyboard } from './game/useKeyboard'
import { GameOverScreen } from './ui/GameOverScreen'
import { HUD } from './ui/HUD'
import { StartScreen } from './ui/StartScreen'
import './ui/ui.css'

export default function App() {
  useKeyboard()
  const snapshot = useSyncExternalStore(hudStore.subscribe, hudStore.getSnapshot)

  return (
    <div className="app">
      <GameCanvas />
      <div className="ui-layer">
        {snapshot.phase === 'playing' && <HUD snapshot={snapshot} />}
        {snapshot.phase === 'menu' && <StartScreen best={snapshot.best} />}
        {snapshot.phase === 'over' && <GameOverScreen score={snapshot.score} best={snapshot.best} />}
      </div>
    </div>
  )
}
