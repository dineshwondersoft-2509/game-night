export type MemorySeat = 'A' | 'B'

export interface MemoryCard {
  /** Pair id 0..pairs-1 */
  pairId: number
  /** Display symbol */
  symbol: string
  matchedBy: MemorySeat | null
}

export interface MemoryState {
  pairs: number
  cols: number
  rows: number
  cards: MemoryCard[]
  /** Currently face-up card indices (0–2) */
  flipped: number[]
  scoreA: number
  scoreB: number
  lastReveal: {
    indices: [number, number]
    matched: boolean
    by: MemorySeat
  } | null
}

export interface MemoryMove {
  index: number
}

export const MEMORY_PAIR_OPTIONS = [8, 12, 18] as const
export type MemoryPairs = (typeof MEMORY_PAIR_OPTIONS)[number]
export const DEFAULT_PAIRS: MemoryPairs = 8

export const MEMORY_SYMBOLS = [
  '🐶', '🐱', '🦊', '🐼', '🦁', '🐸',
  '🐵', '🦄', '🐝', '🦋', '🐙', '🦉',
  '🐧', '🐢', '🐬', '🌸', '🔥', '⭐',
] as const

export function layoutForPairs(pairs: number): { cols: number; rows: number } {
  if (pairs === 8) return { cols: 4, rows: 4 }
  if (pairs === 12) return { cols: 4, rows: 6 }
  if (pairs === 18) return { cols: 6, rows: 6 }
  // fallback rectangular-ish
  const cols = Math.ceil(Math.sqrt(pairs * 2))
  const rows = Math.ceil((pairs * 2) / cols)
  return { cols, rows }
}
