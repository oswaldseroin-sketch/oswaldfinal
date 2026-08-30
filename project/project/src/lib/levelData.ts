export type LevelImage = {
  id: number
  src: string
}

export const LEVEL_IMAGES: LevelImage[] = [
  { id: 1, src: '/level-1.webp' },
  { id: 2, src: '/level-2.webp' },
  { id: 3, src: '/level-3.webp' },
  { id: 4, src: '/level-4.webp' },
  { id: 5, src: '/level-5.webp' },
]

export type RoadEvent = 'FORWARD' | 'BACK' | 'TRAVELER' | 'DEATH'

export type RoadWeights = {
  FORWARD: number
  TRAVELER: number
  BACK: number
  DEATH: number
}

export function getRoadWeights(level: number): RoadWeights {
  if (level <= 5) return { FORWARD: 50, TRAVELER: 25, BACK: 20, DEATH: 5 }
  if (level <= 10) return { FORWARD: 47, TRAVELER: 25, BACK: 20, DEATH: 8 }
  if (level <= 15) return { FORWARD: 43, TRAVELER: 25, BACK: 20, DEATH: 12 }
  return { FORWARD: 40, TRAVELER: 25, BACK: 20, DEATH: 15 }
}
