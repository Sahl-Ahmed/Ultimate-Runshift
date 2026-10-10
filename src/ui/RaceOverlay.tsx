import { useEffect, useState } from 'react'
import { SCORE_PER_UNIT } from '../game/constants'
import { outfitForSlot } from '../net/identity'
import { room, type RoomSnapshot } from '../net/room'
import type { RoomPlayer } from '../net/types'
import { JoinForm } from './JoinForm'

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']

export const scoreOf = (player: RoomPlayer) =>
  Math.floor((player.finalDistance ?? player.distance) * SCORE_PER_UNIT)

/** Live ranking panel shown during a race. */
export function Leaderboard({ snapshot }: { snapshot: RoomSnapshot }) {
  const standings = [...snapshot.players].sort((a, b) => scoreOf(b) - scoreOf(a))
  const myPlace = standings.findIndex((player) => player.isSelf)

  // A full room would not fit on screen, so show the leaders and make sure
  // your own row is always there even when you are further down.
  const TOP = 6
  const shown = standings.slice(0, TOP)
  const selfHidden = myPlace >= TOP
  if (selfHidden) shown.push(standings[myPlace])

  return (
    <div className="leaderboard">
      <div className="leaderboard-head">
        Race · {ORDINALS[myPlace] ?? `${myPlace + 1}th`} of {standings.length}
      </div>
      {shown.map((player) => {
        const place = standings.indexOf(player)
        const outfit = outfitForSlot(player.slot)
        const gap = selfHidden && player.isSelf
        return (
          <div
            className={`lb-row${player.isSelf ? ' me' : ''}${player.alive ? '' : ' out'}${gap ? ' gap' : ''}`}
            key={player.id}
          >
            <span className="lb-pos">{place + 1}</span>
            <span className="dot" style={{ background: outfit.shirt }} />
            <span className="lb-name">{player.name}</span>
            <span className="lb-score">{scoreOf(player).toLocaleString()}</span>
          </div>
        )
      })}
    </div>
  )
}

/** 3 - 2 - 1 - GO before the race starts. */
export function Countdown({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => endsAt - Date.now())

  useEffect(() => {
    const timer = setInterval(() => setRemaining(endsAt - Date.now()), 80)
    return () => clearInterval(timer)
  }, [endsAt])

  const seconds = Math.ceil(remaining / 1000)
  const label = remaining <= 250 ? 'GO!' : seconds > 0 ? String(Math.min(3, seconds)) : 'GO!'

  return (
    <div className="countdown">
      <div className="countdown-number" key={label}>
        {label}
      </div>
      <div className="countdown-hint">Get ready — same track for everyone</div>
    </div>
  )
}

export function SpectatingBanner() {
  return <div className="spectating">You crashed · spectating · your score is locked</div>
}

/**
 * Shown to everyone once a single runner is left: the race is about to be
 * called, so the winner is not left running alone.
 */
export function LastRunnerBanner({ endsAt, isLastRunner }: { endsAt: number; isLastRunner: boolean }) {
  const [remaining, setRemaining] = useState(() => endsAt - Date.now())

  useEffect(() => {
    const timer = setInterval(() => setRemaining(endsAt - Date.now()), 100)
    return () => clearInterval(timer)
  }, [endsAt])

  const seconds = Math.max(0, Math.ceil(remaining / 1000))

  return (
    <div className="last-runner">
      {isLastRunner ? 'You are the last runner' : 'Last runner left'} · race ends in {seconds}
    </div>
  )
}

export function ResultsScreen({ snapshot, best }: { snapshot: RoomSnapshot; best: number }) {
  const standings = [...snapshot.players].sort((a, b) => scoreOf(b) - scoreOf(a))
  const self = standings.find((player) => player.isSelf)
  const myPlace = standings.findIndex((player) => player.isSelf)

  return (
    <div className="overlay">
      <div className="card">
        <h1 className="title">RACE OVER</h1>
        <p className="tagline">
          {myPlace === 0 ? 'You won!' : `You finished ${ORDINALS[myPlace] ?? `${myPlace + 1}th`}`}
        </p>

        <div className="podium">
          {standings.map((player, index) => {
            const outfit = outfitForSlot(player.slot)
            return (
              <div className={`podium-row place-${index + 1}${player.isSelf ? ' me' : ''}`} key={player.id}>
                <span className="podium-place">{ORDINALS[index] ?? `${index + 1}th`}</span>
                <span className="dot" style={{ background: outfit.shirt }} />
                <span className="podium-name">
                  {player.name}
                  {player.isSelf && <em className="tag you">You</em>}
                </span>
                <span className="podium-score">{scoreOf(player).toLocaleString()}</span>
              </div>
            )
          })}
        </div>

        <div className="scores">
          <div>
            <span className="label">Your score</span>
            <span className="value">{self ? scoreOf(self).toLocaleString() : '0'}</span>
          </div>
          <div>
            <span className="label">Best</span>
            <span className="value best">{best.toLocaleString()}</span>
          </div>
        </div>

        {snapshot.isHost ? (
          <button className="btn" onClick={() => room.returnToLobby()}>
            Back to Lobby
          </button>
        ) : (
          <p className="waiting">Waiting for the host to start the next race…</p>
        )}

        <div className="menu-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => room.leave()}>
            Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConnectingScreen() {
  return (
    <div className="overlay">
      <div className="card">
        <h2 className="panel-title">Connecting…</h2>
        <p className="tagline">Setting up the room</p>
      </div>
    </div>
  )
}

export function RoomErrorScreen({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <div className="overlay">
      <div className="card">
        <h2 className="panel-title error-title">{snapshot.error ?? 'Could not join'}</h2>
        {snapshot.errorDetail && <p className="error-detail">{snapshot.errorDetail}</p>}

        {/* Let them fix the code here instead of starting over. */}
        <JoinForm initialCode={snapshot.attemptedCode} />

        <div className="menu-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-alt" onClick={() => void room.create()}>
            Create a Room Instead
          </button>
          <button className="btn btn-ghost" onClick={() => room.leave()}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}
