import { describe, expect, it } from 'vitest'
import {
  checkWinner,
  createInitialBoard,
  getNextTurn,
  isValidMove,
  makeMove,
  resetGame,
} from './gameLogic'
import type { Board } from './types'

describe('tic-tac-toe gameLogic', () => {
  it('X wins horizontally', () => {
    const board: Board = ['X', 'X', 'X', 'O', 'O', null, null, null, null]
    expect(checkWinner(board)).toBe('X')
  })

  it('X wins vertically', () => {
    const board: Board = ['X', 'O', null, 'X', 'O', null, 'X', null, null]
    expect(checkWinner(board)).toBe('X')
  })

  it('X wins diagonally', () => {
    const board: Board = ['X', 'O', null, null, 'X', 'O', null, null, 'X']
    expect(checkWinner(board)).toBe('X')
  })

  it('O wins', () => {
    const board: Board = ['X', 'X', null, 'X', null, null, 'O', 'O', 'O']
    expect(checkWinner(board)).toBe('O')
  })

  it('detects a draw', () => {
    const board: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']
    expect(checkWinner(board)).toBe('draw')
  })

  it('rejects occupied cell', () => {
    const board = createInitialBoard()
    board[4] = 'X'
    expect(isValidMove(board, 4, 'O', 'O', false)).toBe(false)
  })

  it('rejects wrong turn', () => {
    const board = createInitialBoard()
    expect(isValidMove(board, 0, 'O', 'X', false)).toBe(false)
  })

  it('rejects moves when finished', () => {
    const board: Board = ['X', 'X', 'X', 'O', 'O', null, null, null, null]
    expect(isValidMove(board, 5, 'O', 'O', true)).toBe(false)
  })

  it('plays a sequence of moves', () => {
    let board = createInitialBoard()
    let turn: 'X' | 'O' = 'X'
    board = makeMove(board, 0, turn)
    turn = getNextTurn(turn)
    board = makeMove(board, 1, turn)
    turn = getNextTurn(turn)
    board = makeMove(board, 4, turn)
    turn = getNextTurn(turn)
    board = makeMove(board, 2, turn)
    turn = getNextTurn(turn)
    board = makeMove(board, 8, turn)
    expect(checkWinner(board)).toBe('X')
  })

  it('resets the game', () => {
    const reset = resetGame()
    expect(reset.board).toEqual(createInitialBoard())
    expect(reset.currentTurn).toBe('X')
    expect(reset.winner).toBeNull()
  })

  it('makeMove throws on occupied cell', () => {
    const board = createInitialBoard()
    board[0] = 'X'
    expect(() => makeMove(board, 0, 'O')).toThrow('Cell already occupied')
  })
})
