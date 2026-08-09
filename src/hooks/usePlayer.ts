import { useCallback, useEffect, useState } from 'react'
import { ensureAnonymousSession } from '../services/gameService'
import { supabase } from '../lib/supabase'

const NICKNAME_KEY = 'game_night_nickname'
const ROOM_KEY = 'game_night_room'

export function usePlayer() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [nickname, setNicknameState] = useState(() => localStorage.getItem(NICKNAME_KEY) ?? '')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const id = await ensureAnonymousSession()
        if (!cancelled) {
          setPlayerId(id)
          setReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Auth failed')
          setReady(true)
        }
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setPlayerId(session?.user?.id ?? null)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
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
    rememberRoom,
    lastRoom,
  }
}
