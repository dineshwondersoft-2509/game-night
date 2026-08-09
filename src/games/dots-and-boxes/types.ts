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

export function horizontalCount(size: number): number {
  return size * (size + 1)
}

export function verticalCount(size: number): number {
  return size * (size + 1)
}

export function boxCount(size: number): number {
  return size * size
}
