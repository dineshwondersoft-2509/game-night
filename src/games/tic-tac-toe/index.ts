import type { GameDefinition } from '../types'
import {
  asBoard,
  checkWinner,
  createInitialBoard,
  isValidMove,
  makeMove,
  parseMove,
} from './gameLogic'
import { Board } from './Board'
import type { CellValue } from './types'

export const ticTacToeGame: GameDefinition = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  description: 'Classic 3x3. Get three in a row.',
  tagline: 'Quick game',
  minPlayers: 2,
  maxPlayers: 2,
  status: 'available',
  accent: '#0d9488',
  icon: '✕○',
  seatSymbols: ['X', 'O'],
  getSeatLabel: (seat) => seat,
  initialState: () => createInitialBoard(),
  validateMove: (state, move, seat, currentTurn) => {
    const parsed = parseMove(move)
    if (!parsed) return false
    const board = asBoard(state)
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
    return makeMove(asBoard(state), parsed.position, seat as 'X' | 'O')
  },
  getWinner: (state) => checkWinner(asBoard(state)),
  isFinished: (state) => checkWinner(asBoard(state)) !== null,
  Board,
}
