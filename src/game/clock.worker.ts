/**
 * A plain metronome. Browsers throttle (or stop) timers and animation frames
 * on a hidden page, which would freeze a running player the moment they
 * switched tabs. Worker timers keep firing, so the simulation is driven from
 * here instead of from the render loop.
 */
let timer: ReturnType<typeof setInterval> | undefined

self.onmessage = (event: MessageEvent<'start' | 'stop'>) => {
  if (event.data === 'start') {
    if (timer === undefined) timer = setInterval(() => self.postMessage('tick'), 16)
  } else if (event.data === 'stop') {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }
}
