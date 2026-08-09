export type CellValue = 'X' | 'O' | null
export type Board = CellValue[]
export type WinnerResult = 'X' | 'O' | 'draw' | null

export interface TicTacToeMove {
  position: number
}

export const EMPTY_BOARD: Board = [null, null, null, null, null, null, null, null, null]

export const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]
