import { describe, expect, it } from 'vitest'
import {
  applyLine,
  createInitialState,
  getWinner,
  isFinished,
  isValidMove,
} from './gameLogic'

describe('dots-and-boxes gameLogic', () => {
  it('rejects occupied line', () => {
    let state = createInitialState(2)
    const first = applyLine(state, { orient: 'h', index: 0 }, 'A')
    state = first.state
    expect(isValidMove(state, { orient: 'h', index: 0 }, 'B', 'B', false)).toBe(false)
  })

  it('rejects wrong turn', () => {
    const state = createInitialState(2)
    expect(isValidMove(state, { orient: 'h', index: 0 }, 'B', 'A', false)).toBe(false)
  })

  it('claims a box and keeps turn', () => {
    // 2x2 dots => 1 box. Fill 3 sides then 4th claims.
    let state = createInitialState(1)
    state = applyLine(state, { orient: 'h', index: 0 }, 'A').state // top
    state = applyLine(state, { orient: 'h', index: 1 }, 'B').state // bottom
    state = applyLine(state, { orient: 'v', index: 0 }, 'A').state // left
    const result = applyLine(state, { orient: 'v', index: 1 }, 'B') // right completes
    expect(result.claimed).toBe(1)
    expect(result.keepTurn).toBe(true)
    expect(result.state.boxes[0]).toBe('B')
    expect(isFinished(result.state)).toBe(true)
    expect(getWinner(result.state)).toBe('B')
  })

  it('detects draw when scores tie', () => {
    // Manually craft finished 2-box equal state via size 2 partial play is hard;
    // use size 1 finished by A then we'd need 2 boxes. Build size 2 finished equal:
    const state = createInitialState(2)
    state.h = state.h.map(() => 'A')
    state.v = state.v.map(() => 'B')
    // Force boxes: 2 for A, 2 for B
    state.boxes = ['A', 'B', 'A', 'B']
    expect(isFinished(state)).toBe(true)
    expect(getWinner(state)).toBe('draw')
  })

  it('declares A winner with more boxes', () => {
    const state = createInitialState(2)
    state.boxes = ['A', 'A', 'A', 'B']
    expect(getWinner(state)).toBe('A')
  })

  it('applyLine throws on duplicate', () => {
    const state = createInitialState(2)
    const next = applyLine(state, { orient: 'h', index: 0 }, 'A').state
    expect(() => applyLine(next, { orient: 'h', index: 0 }, 'B')).toThrow('Line already claimed')
  })
})
