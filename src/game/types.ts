export type Biome = 'road' | 'railway' | 'river'

export type Phase = 'menu' | 'playing' | 'over'

export type ObstacleKind =
  // road
  | 'barrier'
  | 'crate'
  | 'car'
  | 'roadblock'
  // railway
  | 'train'
  | 'signalBox'
  | 'trackBlock'
  // river
  | 'rock'
  | 'buoy'
  | 'floatCrate'
  | 'log'

export interface Obstacle {
  id: number
  kind: ObstacleKind
  lane: number
  /** Z offset inside the owning segment (0 .. SEGMENT_LENGTH). */
  z: number
  /** Full size of the collision / render box. */
  size: [number, number, number]
}

export type PropKind =
  | 'tree'
  | 'rock'
  | 'sign'
  | 'lamp'
  | 'building'
  | 'bush'
  | 'polePair'
  | 'reed'

export interface Prop {
  id: number
  kind: PropKind
  x: number
  /** Z offset inside the owning segment. */
  z: number
  scale: number
  rotation: number
  colorIndex: number
}

export interface Segment {
  id: number
  index: number
  biome: Biome
  /** World Z of the segment's near edge. Decreases every frame. */
  z: number
  obstacles: Obstacle[]
  props: Prop[]
}
