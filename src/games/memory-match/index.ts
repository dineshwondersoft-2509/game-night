import type { GameDefinition } from '../types'
import {
  applyFlip,
  asState,
  createInitialState,
  getWinner,
  isFinished,
  isValidMove,
  parseMove,
} from './gameLogic'
import { Board } from './Board'
import { DEFAULT_PAIRS, MEMORY_PAIR_OPTIONS, type MemorySeat } from './types'

export const memoryMatchGame: GameDefinition = {
  id: 'memory-match',
  name: 'Memory Match',
  description: 'Flip cards and find the matching pairs.',
  tagline: 'Train your memory',
  minPlayers: 2,
  maxPlayers: 2,
  status: 'available',
  accent: '#0891b2',
  icon: '🧠',
  seatSymbols: ['A', 'B'],
  getSeatLabel: (seat) => seat,
  sizeMode: 'fixed',
  sizeOptions: [...MEMORY_PAIR_OPTIONS],
  defaultSize: DEFAULT_PAIRS,
  sizeLabel: 'Pairs',
  sizeDisplay: 'pairs',
  initialState: (options) => createInitialState(options?.size ?? DEFAULT_PAIRS),
  validateMove: (state, move, seat, currentTurn) => {
    const parsed = parseMove(move)
    if (!parsed) return false
    const board = asState(state)
    return isValidMove(
      board,
      parsed.index,
      seat as MemorySeat,
      currentTurn,
      isFinished(board),
    )
  },
  applyMove: (state, move, seat) => {
    const parsed = parseMove(move)
    if (!parsed) throw new Error('Invalid move')
    return applyFlip(asState(state), parsed.index, seat as MemorySeat).state
  },
  getWinner: (state) => getWinner(asState(state)),
  isFinished: (state) => isFinished(asState(state)),
  Board,
}
