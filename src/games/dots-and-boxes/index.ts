import type { GameDefinition } from '../types'
import {
  applyLine,
  asState,
  createInitialState,
  getWinner,
  isFinished,
  isValidMove,
  parseMove,
} from './gameLogic'
import { Board } from './Board'

export const dotsAndBoxesGame: GameDefinition = {
  id: 'dots-and-boxes',
  name: 'Dots and Boxes',
  description: 'Claim squares by drawing lines.',
  tagline: 'Classic pencil game',
  minPlayers: 2,
  maxPlayers: 2,
  status: 'available',
  accent: '#0369a1',
  icon: '▦',
  seatSymbols: ['A', 'B'],
  getSeatLabel: (seat) => seat,
  initialState: () => createInitialState(),
  validateMove: (state, move, seat, currentTurn) => {
    const parsed = parseMove(move)
    if (!parsed) return false
    const board = asState(state)
    return isValidMove(board, parsed, seat, currentTurn, isFinished(board))
  },
  applyMove: (state, move, seat) => {
    const parsed = parseMove(move)
    if (!parsed) throw new Error('Invalid move')
    return applyLine(asState(state), parsed, seat as 'A' | 'B').state
  },
  getWinner: (state) => getWinner(asState(state)),
  isFinished: (state) => isFinished(asState(state)),
  Board,
}
