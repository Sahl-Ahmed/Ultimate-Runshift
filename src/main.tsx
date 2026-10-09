import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { game, startRun } from './game/state'
import { track } from './game/track'
import './index.css'

// Dev-only handle, handy for poking at the simulation from the console.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__runshift = { game, track, startRun }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
