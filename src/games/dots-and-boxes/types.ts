export type LineOwner = 'A' | 'B' | null

export interface DotsAndBoxesState {
  size: number
  h: LineOwner[]
  v: LineOwner[]
  boxes: LineOwner[]
}

export interface DotsAndBoxesMove {
  orient: 'h' | 'v'
  index: number
}

export const DEFAULT_SIZE = 3
export const MIN_SIZE = 2
export const MAX_SIZE = 8

export function clampSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_SIZE
  const n = Math.floor(size)
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, n))
}

export function horizontalCount(size: number): number {
  return size * (size + 1)
}

export function verticalCount(size: number): number {
  return size * (size + 1)
}

export function boxCount(size: number): number {
  return size * size
}
