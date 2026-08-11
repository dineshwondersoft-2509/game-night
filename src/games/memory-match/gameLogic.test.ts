import { describe, expect, it } from 'vitest'
import {
  applyFlip,
  createInitialState,
  getWinner,
  isFinished,
  isValidMove,
} from './gameLogic'

/** Deterministic RNG cycling through fixed values. */
function seqRandom(values: number[]) {
  let i = 0
  return () => {
    const v = values[i % values.length]!
    i += 1
    return v
  }
}

describe('memory-match gameLogic', () => {
  it('builds a deck with correct pair counts', () => {
    const state = createInitialState(8, () => 0)
    expect(state.cards).toHaveLength(16)
    expect(state.cols).toBe(4)
    expect(state.rows).toBe(4)
    const counts = new Map<number, number>()
    for (const card of state.cards) {
      counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1)
    }
    expect([...counts.values()].every((n) => n === 2)).toBe(true)
  })

  it('rejects flips out of turn or already matched', () => {
    const state = createInitialState(8, () => 0)
    expect(isValidMove(state, 0, 'B', 'A', false)).toBe(false)
    state.cards[0]!.matchedBy = 'A'
    expect(isValidMove(state, 0, 'A', 'A', false)).toBe(false)
  })

  it('keeps turn and scores on a match', () => {
    let state = createInitialState(8, () => 0)
    // Force adjacent identical pair at 0 and 1
    state.cards[0] = { pairId: 0, symbol: '🐶', matchedBy: null }
    state.cards[1] = { pairId: 0, symbol: '🐶', matchedBy: null }
    state = applyFlip(state, 0, 'A').state
    const result = applyFlip(state, 1, 'A')
    expect(result.state.scoreA).toBe(1)
    expect(result.keepTurn).toBe(true)
    expect(result.nextTurn).toBe('A')
    expect(result.state.cards[0]?.matchedBy).toBe('A')
    expect(result.state.cards[1]?.matchedBy).toBe('A')
  })

  it('switches turn on mismatch', () => {
    let state = createInitialState(8, () => 0)
    state.cards[0] = { pairId: 0, symbol: '🐶', matchedBy: null }
    state.cards[2] = { pairId: 1, symbol: '🐱', matchedBy: null }
    state = applyFlip(state, 0, 'A').state
    const result = applyFlip(state, 2, 'A')
    expect(result.state.scoreA).toBe(0)
    expect(result.keepTurn).toBe(false)
    expect(result.nextTurn).toBe('B')
    expect(result.state.lastReveal?.matched).toBe(false)
  })

  it('detects finished game and winner', () => {
    const state = createInitialState(8, () => 0)
    state.cards = state.cards.map((c, i) => ({
      ...c,
      matchedBy: i < 10 ? 'A' : 'B',
    })) as typeof state.cards
    // 8 pairs: first 5 pairs (10 cards) A, last 3 pairs B — but matchedBy is per card
    // Fix: assign by pairId
    state.cards = state.cards.map((c) => ({
      ...c,
      matchedBy: c.pairId < 5 ? 'A' : 'B',
    }))
    state.scoreA = 5
    state.scoreB = 3
    expect(isFinished(state)).toBe(true)
    expect(getWinner(state)).toBe('A')
  })

  it('draw when scores tie', () => {
    const state = createInitialState(8, seqRandom([0.1, 0.2, 0.3]))
    state.cards = state.cards.map((c) => ({
      ...c,
      matchedBy: c.pairId % 2 === 0 ? 'A' : 'B',
    }))
    state.scoreA = 4
    state.scoreB = 4
    expect(getWinner(state)).toBe('draw')
  })
})
