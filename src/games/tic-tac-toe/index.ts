import type { GameDefinition } from '../types'
import {
  asState,
  checkWinner,
  createInitialState,
  isValidMove,
  makeMove,
  parseMove,
} from './gameLogic'
import { Board } from './Board'
import { DEFAULT_TTT_SIZE, TTT_SIZES, type CellValue } from './types'

export const ticTacToeGame: GameDefinition = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  description: 'Classic grid. Get a full line.',
  tagline: 'Quick game',
  minPlayers: 2,
  maxPlayers: 2,
  status: 'available',
  accent: '#0d9488',
  icon: '✕○',
  seatSymbols: ['X', 'O'],
  getSeatLabel: (seat) => seat,
  sizeMode: 'fixed',
  sizeOptions: [...TTT_SIZES],
  defaultSize: DEFAULT_TTT_SIZE,
  sizeLabel: 'Board size',
  initialState: (options) => createInitialState(options?.size ?? DEFAULT_TTT_SIZE),
  validateMove: (state, move, seat, currentTurn) => {
    const parsed = parseMove(move)
    if (!parsed) return false
    const board = asState(state)
    const finished = checkWinner(board) !== null
    return isValidMove(
      board,
      parsed.position,
      seat as CellValue,
      currentTurn as CellValue,
      finished,
    )
  },
  applyMove: (state, move, seat) => {
    const parsed = parseMove(move)
    if (!parsed) throw new Error('Invalid move')
    return makeMove(asState(state), parsed.position, seat as 'X' | 'O')
  },
  getWinner: (state) => checkWinner(asState(state)),
  isFinished: (state) => checkWinner(asState(state)) !== null,
  Board,
}
