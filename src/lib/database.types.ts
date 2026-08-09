export type GameStatus = 'waiting' | 'active' | 'finished' | 'abandoned'

export interface GameRow {
  id: string
  room_code: string
  game_type: string
  status: GameStatus
  board: unknown
  current_turn: string | null
  winner: string | null
  rematch_requests: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface GamePlayerRow {
  id: string
  game_id: string
  player_id: string
  nickname: string
  symbol: string
  joined_at: string
  last_seen_at: string
}

export interface GamePlayerDto {
  id: string
  playerId: string
  nickname: string
  symbol: string
  joinedAt: string
  lastSeenAt: string
}

export interface GameBundle {
  game: GameRow
  players: GamePlayerDto[]
}

export interface Database {
  public: {
    Tables: {
      games: {
        Row: GameRow
        Insert: Partial<GameRow>
        Update: Partial<GameRow>
      }
      game_players: {
        Row: GamePlayerRow
        Insert: Partial<GamePlayerRow>
        Update: Partial<GamePlayerRow>
      }
    }
    Functions: {
      create_game: {
        Args: { p_game_type: string; p_nickname: string }
        Returns: GameRow
      }
      join_game: {
        Args: { p_room_code: string; p_nickname: string }
        Returns: GameRow
      }
      make_move: {
        Args: { p_room_code: string; p_move: Record<string, unknown> }
        Returns: GameRow
      }
      request_rematch: {
        Args: { p_room_code: string }
        Returns: GameRow
      }
      leave_game: {
        Args: { p_room_code: string }
        Returns: GameRow
      }
      heartbeat: {
        Args: { p_room_code: string }
        Returns: undefined
      }
      get_game_by_room: {
        Args: { p_room_code: string }
        Returns: GameBundle | null
      }
    }
  }
}
