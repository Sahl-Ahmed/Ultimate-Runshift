import { useSyncExternalStore } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { game, hudStore } from './game/state'
import { useKeyboard } from './game/useKeyboard'
import { room } from './net/room'
import { GameOverScreen } from './ui/GameOverScreen'
import { HUD } from './ui/HUD'
import { LobbyScreen } from './ui/LobbyScreen'
import { MainMenu } from './ui/MainMenu'
import {
  ConnectingScreen,
  Countdown,
  LastRunnerBanner,
  Leaderboard,
  ResultsScreen,
  RoomErrorScreen,
  SpectatingBanner,
} from './ui/RaceOverlay'
import './ui/ui.css'

export default function App() {
  useKeyboard()
  const hud = useSyncExternalStore(hudStore.subscribe, hudStore.getSnapshot)
  const net = useSyncExternalStore(room.subscribe, room.getSnapshot)

  const solo = net.status === 'idle'

  return (
    <div className="app">
      <GameCanvas />
      <div className="ui-layer">
        {/* ---------------- solo flow ---------------- */}
        {solo && hud.phase === 'playing' && <HUD snapshot={hud} />}
        {solo && hud.phase === 'menu' && <MainMenu best={hud.best} difficulty={hud.difficulty} />}
        {solo && hud.phase === 'over' && <GameOverScreen score={hud.score} best={hud.best} />}

        {/* ---------------- room flow ---------------- */}
        {net.status === 'connecting' && <ConnectingScreen waking={net.wakingServer} />}
        {net.status === 'error' && <RoomErrorScreen snapshot={net} />}
        {net.status === 'lobby' && <LobbyScreen snapshot={net} />}
        {net.status === 'countdown' && <Countdown endsAt={net.countdownEndsAt} />}
        {net.status === 'racing' && (
          <>
            <HUD snapshot={hud} />
            <Leaderboard snapshot={net} />
            {!game.alive && <SpectatingBanner />}
            {net.finishEndsAt > 0 && (
              <LastRunnerBanner endsAt={net.finishEndsAt} isLastRunner={game.alive} />
            )}
          </>
        )}
        {net.status === 'results' && <ResultsScreen snapshot={net} best={hud.best} />}
      </div>
    </div>
  )
}
