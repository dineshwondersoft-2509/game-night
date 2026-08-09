import type { ComponentType } from 'react'

export type GameCatalogStatus = 'available' | 'coming_soon'

export type GameRoomStatus = 'waiting' | 'active' | 'finished' | 'abandoned'

export interface GamePlayerView {
  playerId: string
  nickname: string
  symbol: string
  lastSeenAt: string
}

export interface GameBoardProps {
  state: unknown
  yourSeat: string | null
  currentTurn: string | null
  winner: string | null
  status: GameRoomStatus
  isMyTurn: boolean
  disabled: boolean
  players: GamePlayerView[]
  onMove: (payload: Record<string, unknown>) => void
}

export interface GameDefinition {
  id: string
  name: string
  description: string
  tagline: string
  minPlayers: number
  maxPlayers: number
  status: GameCatalogStatus
  accent: string
  icon: string
  seatSymbols: string[]
  getSeatLabel: (seat: string) => string
  initialState: () => unknown
  validateMove: (state: unknown, move: unknown, seat: string, currentTurn: string) => boolean
  applyMove: (state: unknown, move: unknown, seat: string) => unknown
  getWinner: (state: unknown) => string | 'draw' | null
  isFinished: (state: unknown) => boolean
  Board: ComponentType<GameBoardProps>
  renderStatus?: (ctx: {
    yourSeat: string | null
    currentTurn: string | null
    winner: string | null
    status: GameRoomStatus
    players: GamePlayerView[]
  }) => string | null
}
