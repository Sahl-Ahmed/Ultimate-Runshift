import { MAX_PLAYERS } from './types'

const ADJECTIVES = [
  'Swift', 'Turbo', 'Blocky', 'Neon', 'Rapid', 'Jumpy', 'Cosmic', 'Wild',
  'Iron', 'Shadow', 'Pixel', 'Rocket', 'Thunder', 'Zippy', 'Mega', 'Lucky',
]

const NOUNS = [
  'Fox', 'Tiger', 'Falcon', 'Panda', 'Shark', 'Comet', 'Bolt', 'Yak',
  'Otter', 'Raven', 'Puma', 'Gecko', 'Moose', 'Hawk', 'Cobra', 'Bison',
]

/** One distinct outfit per player slot, so everyone is instantly tellable apart. */
export const OUTFITS: { name: string; shirt: string; pants: string; chip: string }[] = [
  { name: 'Red', shirt: '#e8503a', pants: '#2f4a7a', chip: '#ff7a63' },
  { name: 'Cyan', shirt: '#2fb8c6', pants: '#1f3b57', chip: '#56e0ec' },
  { name: 'Lime', shirt: '#7cc23d', pants: '#3b4a22', chip: '#a6e86a' },
  { name: 'Violet', shirt: '#9b59d0', pants: '#3a2a59', chip: '#c08cf0' },
  { name: 'Amber', shirt: '#eaa32b', pants: '#5a3a16', chip: '#ffc45f' },
]

export function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${a}${n}`
}

/** Random client id, also used for deterministic slot ordering and host election. */
export function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 - easy to read out loud

export function randomRoomCode(length = 5): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export function outfitForSlot(slot: number) {
  return OUTFITS[((slot % MAX_PLAYERS) + MAX_PLAYERS) % MAX_PLAYERS]
}
