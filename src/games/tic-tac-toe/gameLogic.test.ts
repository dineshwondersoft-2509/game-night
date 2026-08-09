import { describe, expect, it } from 'vitest'
import {
  checkWinner,
  createInitialState,
  getNextTurn,
  isValidMove,
  makeMove,
  resetGame,
} from './gameLogic'

describe('tic-tac-toe gameLogic', () => {
  it('X wins horizontally on 3x3', () => {
    const state = createInitialState(3)
    state.cells = ['X', 'X', 'X', 'O', 'O', null, null, null, null]
    expect(checkWinner(state)).toBe('X')
  })

  it('X wins vertically', () => {
    const state = createInitialState(3)
    state.cells = ['X', 'O', null, 'X', 'O', null, 'X', null, null]
    expect(checkWinner(state)).toBe('X')
  })

  it('X wins diagonally', () => {
    const state = createInitialState(3)
    state.cells = ['X', 'O', null, null, 'X', 'O', null, null, 'X']
    expect(checkWinner(state)).toBe('X')
  })

  it('O wins', () => {
    const state = createInitialState(3)
    state.cells = ['X', 'X', null, 'X', null, null, 'O', 'O', 'O']
    expect(checkWinner(state)).toBe('O')
  })

  it('detects a draw', () => {
    const state = createInitialState(3)
    state.cells = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']
    expect(checkWinner(state)).toBe('draw')
  })

  it('rejects occupied cell', () => {
    const state = createInitialState(3)
    state.cells[4] = 'X'
    expect(isValidMove(state, 4, 'O', 'O', false)).toBe(false)
  })

  it('rejects wrong turn', () => {
    const state = createInitialState(3)
    expect(isValidMove(state, 0, 'O', 'X', false)).toBe(false)
  })

  it('rejects moves when finished', () => {
    const state = createInitialState(3)
    state.cells = ['X', 'X', 'X', 'O', 'O', null, null, null, null]
    expect(isValidMove(state, 5, 'O', 'O', true)).toBe(false)
  })

  it('plays a sequence of moves', () => {
    let state = createInitialState(3)
    let turn: 'X' | 'O' = 'X'
    state = makeMove(state, 0, turn)
    turn = getNextTurn(turn)
    state = makeMove(state, 1, turn)
    turn = getNextTurn(turn)
    state = makeMove(state, 4, turn)
    turn = getNextTurn(turn)
    state = makeMove(state, 2, turn)
    turn = getNextTurn(turn)
    state = makeMove(state, 8, turn)
    expect(checkWinner(state)).toBe('X')
  })

  it('resets the game', () => {
    const reset = resetGame(5)
    expect(reset.board.size).toBe(5)
    expect(reset.board.cells).toHaveLength(25)
    expect(reset.currentTurn).toBe('X')
    expect(reset.winner).toBeNull()
  })

  it('makeMove throws on occupied cell', () => {
    const state = createInitialState(3)
    state.cells[0] = 'X'
    expect(() => makeMove(state, 0, 'O')).toThrow('Cell already occupied')
  })

  it('supports 5x5 win across a full row', () => {
    const state = createInitialState(5)
    state.cells = Array.from({ length: 25 }, (_, i) => (i < 5 ? 'X' : null))
    expect(checkWinner(state)).toBe('X')
  })
})
