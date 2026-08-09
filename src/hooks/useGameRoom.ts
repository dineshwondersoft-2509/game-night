import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createGame as createGameRpc,
  friendlyError,
  heartbeat,
  joinGame as joinGameRpc,
  leaveGame as leaveGameRpc,
  makeMove as makeMoveRpc,
  requestRematch as requestRematchRpc,
} from '../services/gameService'
import { useRealtimeGame } from './useRealtimeGame'
import { getGame } from '../games/registry'

const STALE_MS = 45_000
const LEFT_MS = 150_000

export function useGameRoom(roomCode: string | undefined, playerId: string | null) {
  const { bundle, loading, error, connection, refresh } = useRealtimeGame(roomCode)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!roomCode || !bundle) return
    void heartbeat(roomCode)
    const id = window.setInterval(() => {
      void heartbeat(roomCode)
    }, 15_000)
    return () => window.clearInterval(id)
  }, [roomCode, bundle?.game.id])

  const gameDef = useMemo(
    () => (bundle ? getGame(bundle.game.game_type) : undefined),
    [bundle],
  )

  const me = useMemo(
    () => bundle?.players.find((p) => p.playerId === playerId) ?? null,
    [bundle, playerId],
  )

  const opponent = useMemo(
    () => bundle?.players.find((p) => p.playerId !== playerId) ?? null,
    [bundle, playerId],
  )

  const opponentPresence = useMemo(() => {
    if (!opponent) return 'missing' as const
    const age = now - new Date(opponent.lastSeenAt).getTime()
    if (age > LEFT_MS) return 'left' as const
    if (age > STALE_MS) return 'stale' as const
    return 'online' as const
  }, [opponent, now])

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true)
    setActionError(null)
    try {
      const result = await fn()
      await refresh()
      return result
    } catch (err) {
      setActionError(friendlyError(err instanceof Error ? err.message : 'Action failed'))
      return null
    } finally {
      setBusy(false)
    }
  }, [refresh])

  const createGame = useCallback(
    (gameType: string, nickname: string) => run(() => createGameRpc(gameType, nickname)),
    [run],
  )

  const joinGame = useCallback(
    (code: string, nickname: string) => run(() => joinGameRpc(code, nickname)),
    [run],
  )

  const makeMove = useCallback(
    (move: Record<string, unknown>) => {
      if (!roomCode) return Promise.resolve(null)
      return run(() => makeMoveRpc(roomCode, move))
    },
    [roomCode, run],
  )

  const requestRematch = useCallback(() => {
    if (!roomCode) return Promise.resolve(null)
    return run(() => requestRematchRpc(roomCode))
  }, [roomCode, run])

  const leaveGame = useCallback(() => {
    if (!roomCode) return Promise.resolve(null)
    return run(() => leaveGameRpc(roomCode))
  }, [roomCode, run])

  const isMyTurn =
    !!me &&
    bundle?.game.status === 'active' &&
    bundle.game.current_turn === me.symbol

  const iRequestedRematch = !!(me && bundle?.game.rematch_requests?.[me.symbol])

  return {
    bundle,
    gameDef,
    me,
    opponent,
    opponentPresence,
    loading,
    error: error || actionError,
    connection,
    busy,
    isMyTurn,
    iRequestedRematch,
    createGame,
    joinGame,
    makeMove,
    requestRematch,
    leaveGame,
    refresh,
    clearError: () => setActionError(null),
  }
}
