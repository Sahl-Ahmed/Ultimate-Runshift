import * as THREE from 'three'

/**
 * Shared geometries and materials. Every block in the world reuses these,
 * so the GPU only ever sees a handful of distinct buffers and programs.
 */
export const BOX = new THREE.BoxGeometry(1, 1, 1)
export const PLANE = new THREE.PlaneGeometry(1, 1)
export const CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 8)
export const CONE = new THREE.ConeGeometry(0.5, 1, 6)

const materialCache = new Map<string, THREE.MeshLambertMaterial>()

/** Unlit material, used for things that should never darken (clouds). */
export const UNLIT_WHITE = new THREE.MeshBasicMaterial({ color: '#ffffff' })

/** Flat, cheap material per colour - cached and shared across the scene. */
export function mat(color: string): THREE.MeshLambertMaterial {
  let material = materialCache.get(color)
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color })
    materialCache.set(color, material)
  }
  return material
}

export const COLORS = {
  // road
  asphalt: '#3b3f46',
  laneLine: '#e8e4d8',
  kerb: '#8d9099',
  // railway
  ballast: '#4a4038',
  sleeper: '#5a4632',
  rail: '#b9bec6',
  // river
  water: '#2f7fb5',
  waterDeep: '#246590',
  foam: '#d9eef7',
  boatHull: '#7a4f2a',
  boatDeck: '#b07a43',
  boatTrim: '#5c3a1f',
  // nature
  grass: '#5fa75a',
  grassDark: '#4c8d49',
  dirt: '#8a6f4d',
  trunk: '#6b4a2c',
  leaf1: '#3f8f4a',
  leaf2: '#357f41',
  leaf3: '#4fa057',
  stone: '#8b8f96',
  stoneDark: '#70747b',
  // props
  signPost: '#9aa0a8',
  signFace: '#e2c044',
  lamp: '#5d646e',
  lampGlow: '#ffe9a8',
  building1: '#c9b79c',
  building2: '#a8927a',
  building3: '#d9d2c5',
  roof: '#8c4a3f',
  cloud: '#ffffff',
  mountain: '#7f93ad',
  mountainSnow: '#e9f1f7',
  // player
  skin: '#f2c290',
  shirt: '#e8503a',
  pants: '#2f4a7a',
  shoes: '#2c2c2c',
  hair: '#3a2a1c',
  // obstacles
  barrier: '#e6613c',
  barrierStripe: '#f2f2f2',
  crate: '#b5793a',
  car: '#3f7fd6',
  carDark: '#2b5c9e',
  train: '#5b6472',
  trainDark: '#3f4753',
  signalBox: '#9c5f3a',
  buoy: '#e8453c',
  log: '#6b4a2c',
} as const

export const LEAF_COLORS = [COLORS.leaf1, COLORS.leaf2, COLORS.leaf3]
export const BUILDING_COLORS = [COLORS.building1, COLORS.building2, COLORS.building3]
export const STONE_COLORS = [COLORS.stone, COLORS.stoneDark, COLORS.kerb]
