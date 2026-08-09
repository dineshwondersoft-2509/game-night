export type CellValue = 'X' | 'O' | null
export type BoardCells = CellValue[]
export type WinnerResult = 'X' | 'O' | 'draw' | null

export interface TicTacToeState {
  size: number
  cells: BoardCells
}

export interface TicTacToeMove {
  position: number
}

/** @deprecated kept for older tests — prefer TicTacToeState */
export type Board = BoardCells

export const TTT_SIZES = [3, 5, 7] as const
export type TttSize = (typeof TTT_SIZES)[number]
export const DEFAULT_TTT_SIZE: TttSize = 3
