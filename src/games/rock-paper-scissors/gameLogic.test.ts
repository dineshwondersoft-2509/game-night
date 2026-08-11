import { describe, expect, it } from 'vitest'
import {
  applyChoice,
  createInitialState,
  getMatchWinner,
  isValidMove,
  roundWinner,
  winsNeeded,
} from './gameLogic'

describe('rock-paper-scissors gameLogic', () => {
  it('computes wins needed', () => {
    expect(winsNeeded(3)).toBe(2)
    expect(winsNeeded(5)).toBe(3)
    expect(winsNeeded(7)).toBe(4)
  })

  it('resolves round winners', () => {
    expect(roundWinner('rock', 'scissors')).toBe('A')
    expect(roundWinner('paper', 'rock')).toBe('A')
    expect(roundWinner('scissors', 'paper')).toBe('A')
    expect(roundWinner('rock', 'paper')).toBe('B')
    expect(roundWinner('rock', 'rock')).toBe('draw')
  })

  it('rejects second choice in same round', () => {
    let state = createInitialState(3)
    state = applyChoice(state, 'A', 'rock').state
    expect(isValidMove(state, 'A', false)).toBe(false)
    expect(() => applyChoice(state, 'A', 'paper')).toThrow('Already chosen')
  })

  it('waits for both players before scoring', () => {
    let state = createInitialState(3)
    const mid = applyChoice(state, 'A', 'rock')
    expect(mid.resolved).toBe(false)
    expect(mid.state.scoreA).toBe(0)
    state = mid.state
    const done = applyChoice(state, 'B', 'scissors')
    expect(done.resolved).toBe(true)
    expect(done.state.scoreA).toBe(1)
    expect(done.state.choiceA).toBeNull()
    expect(done.state.lastRound?.winner).toBe('A')
  })

  it('ends match at best-of-3', () => {
    let state = createInitialState(3)
    // A wins two rounds
    state = applyChoice(state, 'A', 'rock').state
    state = applyChoice(state, 'B', 'scissors').state
    state = applyChoice(state, 'A', 'rock').state
    const end = applyChoice(state, 'B', 'scissors')
    expect(end.state.scoreA).toBe(2)
    expect(end.matchWinner).toBe('A')
    expect(getMatchWinner(end.state)).toBe('A')
  })

  it('round draw does not award points', () => {
    let state = createInitialState(3)
    state = applyChoice(state, 'A', 'paper').state
    const result = applyChoice(state, 'B', 'paper')
    expect(result.state.scoreA).toBe(0)
    expect(result.state.scoreB).toBe(0)
    expect(result.state.lastRound?.winner).toBe('draw')
  })
})
