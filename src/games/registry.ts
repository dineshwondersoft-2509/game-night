import type { GameDefinition } from './types'
import { ticTacToeGame } from './tic-tac-toe'
import { dotsAndBoxesGame } from './dots-and-boxes'
import { rockPaperScissorsGame } from './rock-paper-scissors'
import { memoryMatchGame } from './memory-match'

const comingSoon: GameDefinition[] = [
  {
    id: 'connect-four',
    name: 'Connect Four',
    description: 'Drop discs. Connect four.',
    tagline: 'Coming soon',
    minPlayers: 2,
    maxPlayers: 2,
    status: 'coming_soon',
    accent: '#2563eb',
    icon: '⬤',
    seatSymbols: ['R', 'Y'],
    getSeatLabel: (seat) => seat,
    sizeMode: 'none',
    initialState: () => null,
    validateMove: () => false,
    applyMove: (state) => state,
    getWinner: () => null,
    isFinished: () => false,
    Board: () => null,
  },
]

const games: GameDefinition[] = [
  ticTacToeGame,
  dotsAndBoxesGame,
  rockPaperScissorsGame,
  memoryMatchGame,
  ...comingSoon,
]

export function listGames(): GameDefinition[] {
  return games
}

export function listAvailableGames(): GameDefinition[] {
  return games.filter((game) => game.status === 'available')
}

export function getGame(id: string): GameDefinition | undefined {
  return games.find((game) => game.id === id)
}
