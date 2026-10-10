import * as THREE from 'three'
import { GRAVITY, LANE_SHIFT_SPEED, LANE_X } from './constants'
import { checkCollision } from './collision'
import { endRun, game, speedForDistance, syncHud } from './state'
import { groundYFor, track } from './track'
import { room } from '../net/room'

/** Fixed simulation step. Keeps physics identical however fast we render. */
const STEP = 1 / 60
/**
 * Most steps one call may run. A tab that was hidden for a long time catches
 * up over several calls instead of blocking the page with one huge burst;
 * nothing is thrown away, the leftover simply waits in the accumulator.
 */
const MAX_STEPS_PER_CALL = 3000
const HUD_INTERVAL = 0.08

let accumulator = 0
let lastTime = 0
let wasPlaying = false
let hudTimer = 0

/** One fixed step of the world: movement, gravity, biome, collision. */
function stepGame(delta: number) {
  const previousView = game.viewDistance

  if (game.alive) {
    game.speed = speedForDistance(game.distance)
    game.distance += game.speed * delta
    game.viewDistance = game.distance
    game.runTime += delta

    // Lane change, including the sideways nudge for a shared lane.
    const targetX = LANE_X[game.lane] + game.laneOffset
    game.x = THREE.MathUtils.damp(game.x, targetX, LANE_SHIFT_SPEED, delta)

    if (!game.onGround) {
      game.velocityY += GRAVITY * delta
      game.jumpY += game.velocityY * delta
      if (game.jumpY <= 0) {
        game.jumpY = 0
        game.velocityY = 0
        game.onGround = true
      }
    }
  } else {
    // Spectating: drift the view toward whoever is still running.
    const leader = room.leaderDistance()
    if (Number.isFinite(leader)) {
      game.viewDistance = THREE.MathUtils.damp(game.viewDistance, leader, 2.5, delta)
    }
  }

  const shift = game.viewDistance - previousView
  track.update(shift)

  const biome = track.biomeAtPlayer()
  game.biome = biome
  game.groundY = THREE.MathUtils.damp(game.groundY, groundYFor(biome), 7, delta)
  game.boat = THREE.MathUtils.damp(game.boat, biome === 'river' ? 1 : 0, 5, delta)

  // The sweep matters at high speed, where one step can cover more ground
  // than an obstacle is deep.
  if (game.alive && checkCollision(track.getSegments(), shift)) {
    game.alive = false
    if (game.multiplayer) {
      room.reportCrash(game.distance)
    } else {
      endRun()
    }
  }

  hudTimer += delta
  if (hudTimer >= HUD_INTERVAL) {
    hudTimer = 0
    syncHud()
  }
}

/**
 * Brings the world up to `now`. Safe to call from anywhere as often as you
 * like - the render loop and the worker clock both call it, and whichever
 * runs first does the work.
 */
export function advanceSimulation(now = performance.now()) {
  const playing = game.phase === 'playing'

  // A fresh run starts the clock from here, so a long pause on the menu or
  // the results screen is never simulated as running time.
  if (playing && !wasPlaying) {
    lastTime = now
    accumulator = 0
    hudTimer = 0
  }
  wasPlaying = playing

  if (!playing) {
    lastTime = now
    accumulator = 0
    return
  }

  accumulator += (now - lastTime) / 1000
  lastTime = now

  let steps = 0
  while (accumulator >= STEP && steps < MAX_STEPS_PER_CALL) {
    stepGame(STEP)
    accumulator -= STEP
    steps++
  }
}
