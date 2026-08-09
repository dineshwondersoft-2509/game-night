import {
  EMPTY_BOARD,
  WIN_LINES,
  type Board,
  type CellValue,
  type TicTacToeMove,
  type WinnerResult,
} from './types'

export function createInitialBoard(): Board {
  return [...EMPTY_BOARD]
}

export function isValidMove(
  board: Board,
  position: number,
  seat: CellValue,
  currentTurn: CellValue,
  finished: boolean,
): boolean {
  if (finished) return false
  if (seat !== currentTurn) return false
  if (position < 0 || position > 8) return false
  if (board[position] !== null) return false
  return true
}

export function makeMove(board: Board, position: number, seat: 'X' | 'O'): Board {
  if (board[position] !== null) {
    throw new Error('Cell already occupied')
  }
  const next = [...board]
  next[position] = seat
  return next
}

export function checkWinner(board: Board): WinnerResult {
  for (const [a, b, c] of WIN_LINES) {
    const value = board[a]
    if (value && value === board[b] && value === board[c]) {
      return value
    }
  }
  if (board.every((cell) => cell !== null)) {
    return 'draw'
  }
  return null
}

export function isDraw(board: Board): boolean {
  return checkWinner(board) === 'draw'
}

export function getNextTurn(current: 'X' | 'O'): 'X' | 'O' {
  return current === 'X' ? 'O' : 'X'
}

export function resetGame(): { board: Board; currentTurn: 'X'; winner: null } {
  return {
    board: createInitialBoard(),
    currentTurn: 'X',
    winner: null,
  }
}

export function getWinningLine(board: Board): number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    const value = board[a]
    if (value && value === board[b] && value === board[c]) {
      return line
    }
  }
  return null
}

export function parseMove(move: unknown): TicTacToeMove | null {
  if (!move || typeof move !== 'object') return null
  const position = (move as { position?: unknown }).position
  if (typeof position !== 'number' || !Number.isInteger(position)) return null
  return { position }
}

export function asBoard(state: unknown): Board {
  if (!Array.isArray(state) || state.length !== 9) {
    return createInitialBoard()
  }
  return state.map((cell) => (cell === 'X' || cell === 'O' ? cell : null)) as Board
}
