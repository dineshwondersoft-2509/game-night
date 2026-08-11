import type { GameDefinition } from '../types'
import {
  applyChoice,
  asState,
  createInitialState,
  getMatchWinner,
  isFinished,
  isValidMove,
  parseMove,
} from './gameLogic'
import { Board } from './Board'
import { DEFAULT_BEST_OF, RPS_BEST_OF, type RpsSeat } from './types'

export const rockPaperScissorsGame: GameDefinition = {
  id: 'rock-paper-scissors',
  name: 'Rock Paper Scissors',
  description: 'Lock in rock, paper, or scissors. First to the majority wins.',
  tagline: 'Quick duel',
  minPlayers: 2,
  maxPlayers: 2,
  status: 'available',
  accent: '#ea580c',
  icon: '✊',
  seatSymbols: ['A', 'B'],
  getSeatLabel: (seat) => seat,
  sizeMode: 'fixed',
  sizeOptions: [...RPS_BEST_OF],
  defaultSize: DEFAULT_BEST_OF,
  sizeLabel: 'Best of',
  sizeDisplay: 'bestOf',
  initialState: (options) => createInitialState(options?.size ?? DEFAULT_BEST_OF),
  validateMove: (state, _move, seat) => {
    const board = asState(state)
    return isValidMove(board, seat as RpsSeat, isFinished(board))
  },
  applyMove: (state, move, seat) => {
    const parsed = parseMove(move)
    if (!parsed) throw new Error('Invalid move')
    return applyChoice(asState(state), seat as RpsSeat, parsed.choice).state
  },
  getWinner: (state) => getMatchWinner(asState(state)),
  isFinished: (state) => isFinished(asState(state)),
  Board,
  renderStatus: ({ yourSeat, status, winner }) => {
    if (status === 'finished' && winner) return null
    if (status !== 'active') return null
    if (!yourSeat) return 'Spectating…'
    return 'Choose at the same time — first to the majority wins'
  },
}
