import {
  DEFAULT_TTT_SIZE,
  TTT_SIZES,
  type CellValue,
  type TicTacToeMove,
  type TicTacToeState,
  type TttSize,
  type WinnerResult,
} from './types'

export function createInitialState(size: number = DEFAULT_TTT_SIZE): TicTacToeState {
  const n = TTT_SIZES.includes(size as TttSize) ? size : DEFAULT_TTT_SIZE
  return {
    size: n,
    cells: Array.from({ length: n * n }, () => null),
  }
}

/** @deprecated use createInitialState */
export function createInitialBoard(size = DEFAULT_TTT_SIZE) {
  return createInitialState(size).cells
}

export function asState(raw: unknown): TicTacToeState {
  if (Array.isArray(raw)) {
    const len = raw.length
    const size = Math.sqrt(len)
    if (Number.isInteger(size) && size >= 3) {
      return {
        size,
        cells: raw.map((cell) => (cell === 'X' || cell === 'O' ? cell : null)),
      }
    }
    return createInitialState()
  }
  if (!raw || typeof raw !== 'object') return createInitialState()
  const obj = raw as { size?: unknown; cells?: unknown }
  const size =
    typeof obj.size === 'number' && Number.isInteger(obj.size) && obj.size >= 3
      ? obj.size
      : DEFAULT_TTT_SIZE
  if (!Array.isArray(obj.cells) || obj.cells.length !== size * size) {
    return createInitialState(size)
  }
  return {
    size,
    cells: obj.cells.map((cell) => (cell === 'X' || cell === 'O' ? cell : null)),
  }
}

/** @deprecated use asState */
export function asBoard(raw: unknown) {
  return asState(raw).cells
}

export function buildWinLines(size: number): number[][] {
  const lines: number[][] = []
  for (let r = 0; r < size; r++) {
    lines.push(Array.from({ length: size }, (_, c) => r * size + c))
  }
  for (let c = 0; c < size; c++) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c))
  }
  lines.push(Array.from({ length: size }, (_, i) => i * size + i))
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)))
  return lines
}

export function isValidMove(
  state: TicTacToeState,
  position: number,
  seat: CellValue,
  currentTurn: CellValue,
  finished: boolean,
): boolean {
  if (finished) return false
  if (seat !== currentTurn) return false
  if (position < 0 || position >= state.cells.length) return false
  return state.cells[position] === null
}

export function makeMove(state: TicTacToeState, position: number, seat: 'X' | 'O'): TicTacToeState {
  if (state.cells[position] !== null) {
    throw new Error('Cell already occupied')
  }
  const cells = [...state.cells]
  cells[position] = seat
  return { size: state.size, cells }
}

export function checkWinner(state: TicTacToeState): WinnerResult {
  for (const line of buildWinLines(state.size)) {
    const first = state.cells[line[0]!]
    if (first && line.every((i) => state.cells[i] === first)) {
      return first
    }
  }
  if (state.cells.every((cell) => cell !== null)) {
    return 'draw'
  }
  return null
}

export function isDraw(state: TicTacToeState): boolean {
  return checkWinner(state) === 'draw'
}

export function getNextTurn(current: 'X' | 'O'): 'X' | 'O' {
  return current === 'X' ? 'O' : 'X'
}

export function resetGame(size = DEFAULT_TTT_SIZE) {
  return {
    board: createInitialState(size),
    currentTurn: 'X' as const,
    winner: null,
  }
}

export function getWinningLine(state: TicTacToeState): number[] | null {
  for (const line of buildWinLines(state.size)) {
    const first = state.cells[line[0]!]
    if (first && line.every((i) => state.cells[i] === first)) {
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
