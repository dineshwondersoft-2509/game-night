import { useCallback, useEffect, useState } from 'react'
import { ensureAnonymousSession, friendlyError } from '../services/gameService'
import { supabase } from '../lib/supabase'

const NICKNAME_KEY = 'game_night_nickname'
const ROOM_KEY = 'game_night_room'

export function usePlayer() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [nickname, setNicknameState] = useState(() => localStorage.getItem(NICKNAME_KEY) ?? '')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authAttempt, setAuthAttempt] = useState(0)

  const connect = useCallback(async (cancelled: () => boolean) => {
    setReady(false)
    setError(null)
    try {
      const id = await ensureAnonymousSession()
      if (!cancelled()) {
        setPlayerId(id)
        setReady(true)
      }
    } catch (err) {
      if (!cancelled()) {
        setError(friendlyError(err instanceof Error ? err.message : 'Auth failed'))
        setReady(true)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void connect(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [connect, authAttempt])

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setPlayerId(session?.user?.id ?? null)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const retryAuth = useCallback(() => {
    setAuthAttempt((value) => value + 1)
  }, [])

  const setNickname = useCallback((value: string) => {
    const trimmed = value.slice(0, 24)
    setNicknameState(trimmed)
    if (trimmed) {
      localStorage.setItem(NICKNAME_KEY, trimmed)
    } else {
      localStorage.removeItem(NICKNAME_KEY)
    }
  }, [])

  const rememberRoom = useCallback((roomCode: string | null) => {
    if (roomCode) {
      localStorage.setItem(ROOM_KEY, roomCode)
    } else {
      localStorage.removeItem(ROOM_KEY)
    }
  }, [])

  const lastRoom = localStorage.getItem(ROOM_KEY)

  return {
    playerId,
    nickname,
    setNickname,
    ready,
    error,
    retryAuth,
    rememberRoom,
    lastRoom,
  }
}
