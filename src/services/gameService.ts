import {
  AUTH_TIMEOUT_MS,
  clearExpiredStoredSession,
  isAccessTokenValid,
  withTimeout,
} from '../lib/authSession'
import { supabase } from '../lib/supabase'
import type { GameBundle, GameRow } from '../lib/database.types'
import { normalizeRoomCode } from '../utils/roomCode'

function mapBundle(raw: unknown): GameBundle | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as {
    game?: GameRow
    players?: Array<{
      id: string
      playerId: string
      nickname: string
      symbol: string
      joinedAt: string
      lastSeenAt: string
    }>
  }
  if (!data.game) return null
  return {
    game: {
      ...data.game,
      rematch_requests: (data.game.rematch_requests ?? {}) as Record<string, boolean>,
    },
    players: (data.players ?? []).map((p) => ({
      id: p.id,
      playerId: p.playerId,
      nickname: p.nickname,
      symbol: p.symbol,
      joinedAt: p.joinedAt,
      lastSeenAt: p.lastSeenAt,
    })),
  }
}

async function signInFreshAnonymousSession(): Promise<string> {
  clearExpiredStoredSession()
  await supabase.auth.signOut({ scope: 'local' })

  const { data, error } = await withTimeout(
    supabase.auth.signInAnonymously(),
    AUTH_TIMEOUT_MS,
    'Could not connect to the game server. Check your internet and try again.',
  )
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Could not start anonymous session')
  }
  return data.user.id
}

export async function ensureAnonymousSession(): Promise<string> {
  try {
    const { data: existing, error } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS,
      'Could not connect to the game server. Check your internet and try again.',
    )
    if (error) throw error

    const session = existing.session
    if (
      session?.user?.id &&
      session.access_token &&
      isAccessTokenValid(session.access_token)
    ) {
      return session.user.id
    }
  } catch {
    // Stale session or slow refresh — start a fresh anonymous session.
  }

  return signInFreshAnonymousSession()
}

export async function createGame(
  gameType: string,
  nickname: string,
  options: { size?: number } = {},
): Promise<GameRow> {
  await ensureAnonymousSession()
  const { data, error } = await supabase.rpc('create_game', {
    p_game_type: gameType,
    p_nickname: nickname.trim(),
    p_options: options,
  })
  if (error) throw new Error(error.message)
  return data as GameRow
}

export async function updateNickname(roomCode: string, nickname: string): Promise<void> {
  const { error } = await supabase.rpc('update_nickname', {
    p_room_code: normalizeRoomCode(roomCode),
    p_nickname: nickname.trim(),
  })
  if (error) throw new Error(error.message)
}

export async function joinGame(roomCode: string, nickname: string): Promise<GameRow> {
  await ensureAnonymousSession()
  const { data, error } = await supabase.rpc('join_game', {
    p_room_code: normalizeRoomCode(roomCode),
    p_nickname: nickname.trim(),
  })
  if (error) throw new Error(error.message)
  return data as GameRow
}

export async function makeMove(
  roomCode: string,
  move: Record<string, unknown>,
): Promise<GameRow> {
  const { data, error } = await supabase.rpc('make_move', {
    p_room_code: normalizeRoomCode(roomCode),
    p_move: move,
  })
  if (error) throw new Error(error.message)
  return data as GameRow
}

export async function requestRematch(roomCode: string): Promise<GameRow> {
  const { data, error } = await supabase.rpc('request_rematch', {
    p_room_code: normalizeRoomCode(roomCode),
  })
  if (error) throw new Error(error.message)
  return data as GameRow
}

export async function leaveGame(roomCode: string): Promise<GameRow> {
  const { data, error } = await supabase.rpc('leave_game', {
    p_room_code: normalizeRoomCode(roomCode),
  })
  if (error) throw new Error(error.message)
  return data as GameRow
}

export async function heartbeat(roomCode: string): Promise<void> {
  await supabase.rpc('heartbeat', {
    p_room_code: normalizeRoomCode(roomCode),
  })
}

export async function fetchGameBundle(roomCode: string): Promise<GameBundle | null> {
  await ensureAnonymousSession()
  const { data, error } = await supabase.rpc('get_game_by_room', {
    p_room_code: normalizeRoomCode(roomCode),
  })
  if (error) throw new Error(error.message)
  return mapBundle(data)
}

export function friendlyError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('not found')) return 'Game not found'
  if (lower.includes('full')) return 'This room is already full.'
  if (lower.includes('expired') || lower.includes('abandoned')) return 'This game has ended.'
  if (lower.includes('not your turn')) return 'It is not your turn.'
  if (lower.includes('line occupied') || lower.includes('occupied')) return 'That spot is already taken.'
  if (lower.includes('not active')) return 'This game is not active yet.'
  if (lower.includes('not authenticated')) return 'Could not connect. Please refresh.'
  if (lower.includes('timed out') || lower.includes('timeout') || lower.includes('abort')) {
    return 'Connection timed out. Please refresh and try again.'
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Could not reach the game server. Check your internet and try again.'
  }
  if (lower.includes('nickname')) return 'Please enter a valid nickname.'
  if (lower.includes('invalid size') || lower.includes('size')) return 'Choose a valid board size.'
  return message || 'Something went wrong. Please try again.'
}
