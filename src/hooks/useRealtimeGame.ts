import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { fetchGameBundle } from '../services/gameService'
import type { GameBundle } from '../lib/database.types'
import { normalizeRoomCode } from '../utils/roomCode'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting'

export function useRealtimeGame(roomCode: string | undefined) {
  const [bundle, setBundle] = useState<GameBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionStatus>('connecting')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const code = roomCode ? normalizeRoomCode(roomCode) : ''

  const refresh = useCallback(async () => {
    if (!code) return null
    try {
      const data = await fetchGameBundle(code)
      setBundle(data)
      setError(data ? null : 'Game not found')
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game')
      return null
    }
  }, [code])

  useEffect(() => {
    if (!code) {
      setLoading(false)
      setError('Game not found')
      return
    }

    let cancelled = false
    setLoading(true)
    setConnection('connecting')

    ;(async () => {
      await refresh()
      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [code, refresh])

  useEffect(() => {
    if (!code || !bundle?.game.id) return

    const gameId = bundle.game.id

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`game-room:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        () => {
          void refresh()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnection('connected')
          void refresh()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnection('reconnecting')
        } else if (status === 'CLOSED') {
          setConnection('reconnecting')
        }
      })

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      if (channelRef.current === channel) {
        channelRef.current = null
      }
    }
  }, [code, bundle?.game.id, refresh])

  return {
    bundle,
    setBundle,
    loading,
    error,
    connection,
    refresh,
  }
}
