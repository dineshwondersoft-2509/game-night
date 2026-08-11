import {
  DEFAULT_PAIRS,
  MEMORY_PAIR_OPTIONS,
  MEMORY_SYMBOLS,
  layoutForPairs,
  type MemoryCard,
  type MemoryMove,
  type MemoryPairs,
  type MemorySeat,
  type MemoryState,
} from './types'

function clampPairs(pairs: number): number {
  return MEMORY_PAIR_OPTIONS.includes(pairs as MemoryPairs) ? pairs : DEFAULT_PAIRS
}

/** Fisher–Yates shuffle (pure, seeded optionally via Math.random). */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

export function buildDeck(pairs: number, random: () => number = Math.random): MemoryCard[] {
  const n = clampPairs(pairs)
  const cards: MemoryCard[] = []
  for (let pairId = 0; pairId < n; pairId++) {
    const symbol = MEMORY_SYMBOLS[pairId % MEMORY_SYMBOLS.length]!
    cards.push({ pairId, symbol, matchedBy: null })
    cards.push({ pairId, symbol, matchedBy: null })
  }
  return shuffle(cards, random)
}

export function createInitialState(
  pairs: number = DEFAULT_PAIRS,
  random: () => number = Math.random,
): MemoryState {
  const n = clampPairs(pairs)
  const { cols, rows } = layoutForPairs(n)
  return {
    pairs: n,
    cols,
    rows,
    cards: buildDeck(n, random),
    flipped: [],
    scoreA: 0,
    scoreB: 0,
    lastReveal: null,
  }
}

export function asState(raw: unknown): MemoryState {
  if (!raw || typeof raw !== 'object') return createInitialState(DEFAULT_PAIRS, () => 0.5)
  const obj = raw as Partial<MemoryState>
  const pairs = clampPairs(typeof obj.pairs === 'number' ? obj.pairs : DEFAULT_PAIRS)
  const { cols, rows } = layoutForPairs(pairs)
  const cards: MemoryCard[] = Array.isArray(obj.cards)
    ? obj.cards.map((c) => {
        const card = c as Partial<MemoryCard>
        return {
          pairId: typeof card.pairId === 'number' ? card.pairId : 0,
          symbol: typeof card.symbol === 'string' ? card.symbol : '❓',
          matchedBy: card.matchedBy === 'A' || card.matchedBy === 'B' ? card.matchedBy : null,
        }
      })
    : buildDeck(pairs, () => 0.5)

  const flipped = Array.isArray(obj.flipped)
    ? obj.flipped.filter((i): i is number => typeof i === 'number')
    : []

  let lastReveal: MemoryState['lastReveal'] = null
  if (obj.lastReveal && typeof obj.lastReveal === 'object') {
    const lr = obj.lastReveal as MemoryState['lastReveal']
    if (
      lr &&
      Array.isArray(lr.indices) &&
      lr.indices.length === 2 &&
      (lr.by === 'A' || lr.by === 'B')
    ) {
      lastReveal = {
        indices: [lr.indices[0]!, lr.indices[1]!],
        matched: !!lr.matched,
        by: lr.by,
      }
    }
  }

  return {
    pairs,
    cols: typeof obj.cols === 'number' ? obj.cols : cols,
    rows: typeof obj.rows === 'number' ? obj.rows : rows,
    cards,
    flipped,
    scoreA: typeof obj.scoreA === 'number' ? obj.scoreA : 0,
    scoreB: typeof obj.scoreB === 'number' ? obj.scoreB : 0,
    lastReveal,
  }
}

export function parseMove(move: unknown): MemoryMove | null {
  if (!move || typeof move !== 'object') return null
  const index = (move as { index?: unknown }).index
  if (typeof index !== 'number' || !Number.isInteger(index)) return null
  return { index }
}

export function isFinished(state: MemoryState): boolean {
  return state.cards.length > 0 && state.cards.every((c) => c.matchedBy !== null)
}

export function getWinner(state: MemoryState): MemorySeat | 'draw' | null {
  if (!isFinished(state)) return null
  if (state.scoreA === state.scoreB) return 'draw'
  return state.scoreA > state.scoreB ? 'A' : 'B'
}

export function isValidMove(
  state: MemoryState,
  index: number,
  seat: MemorySeat,
  currentTurn: string,
  finished: boolean,
): boolean {
  if (finished) return false
  if (seat !== currentTurn) return false
  if (index < 0 || index >= state.cards.length) return false
  const card = state.cards[index]
  if (!card || card.matchedBy) return false
  if (state.flipped.includes(index)) return false
  if (state.flipped.length >= 2) return false
  return true
}

export function applyFlip(
  state: MemoryState,
  index: number,
  seat: MemorySeat,
): {
  state: MemoryState
  keepTurn: boolean
  nextTurn: MemorySeat
} {
  if (!isValidMove(state, index, seat, seat, isFinished(state))) {
    throw new Error('Invalid move')
  }

  const flipped = [...state.flipped, index]

  // First card of the turn
  if (flipped.length === 1) {
    return {
      state: {
        ...state,
        flipped,
        lastReveal: null,
      },
      keepTurn: true,
      nextTurn: seat,
    }
  }

  // Second card — resolve
  const [a, b] = flipped as [number, number]
  const cardA = state.cards[a]!
  const cardB = state.cards[b]!
  const matched = cardA.pairId === cardB.pairId

  if (matched) {
    const cards = state.cards.map((card, i) =>
      i === a || i === b ? { ...card, matchedBy: seat } : card,
    )
    const scoreA = state.scoreA + (seat === 'A' ? 1 : 0)
    const scoreB = state.scoreB + (seat === 'B' ? 1 : 0)
    return {
      state: {
        ...state,
        cards,
        flipped: [],
        scoreA,
        scoreB,
        lastReveal: { indices: [a, b], matched: true, by: seat },
      },
      keepTurn: true,
      nextTurn: seat,
    }
  }

  return {
    state: {
      ...state,
      flipped: [],
      lastReveal: { indices: [a, b], matched: false, by: seat },
    },
    keepTurn: false,
    nextTurn: seat === 'A' ? 'B' : 'A',
  }
}
