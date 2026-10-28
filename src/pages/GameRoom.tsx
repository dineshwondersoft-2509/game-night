import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { ErrorState } from '../components/ErrorState'
import { AuthErrorScreen } from '../components/AuthErrorScreen'
import { LoadingScreen } from '../components/LoadingScreen'
import { NicknameField } from '../components/NicknameField'
import { PlayerList } from '../components/PlayerList'
import { RoomActions } from '../components/RoomActions'
import { RoomHeader } from '../components/RoomHeader'
import { TurnStatus } from '../components/TurnStatus'
import { useGameRoom } from '../hooks/useGameRoom'
import { usePlayer } from '../hooks/usePlayer'
import { friendlyError, joinGame } from '../services/gameService'
import { getGame } from '../games/registry'
import type { GamePlayerView } from '../games/types'

export function GameRoom() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { playerId, nickname, setNickname, ready, error: authError, retryAuth, rememberRoom } = usePlayer()
  const room = useGameRoom(roomId, playerId)
  const [joinBusy, setJoinBusy] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [showConnectedFlash, setShowConnectedFlash] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameBusy, setNameBusy] = useState(false)

  useEffect(() => {
    if (room.connection === 'connected') {
      setShowConnectedFlash(true)
      const t = window.setTimeout(() => setShowConnectedFlash(false), 1200)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [room.connection])

  useEffect(() => {
    if (room.bundle?.game.room_code) {
      rememberRoom(room.bundle.game.room_code)
    }
  }, [room.bundle?.game.room_code, rememberRoom])

  const inviteUrl = useMemo(() => {
    if (!roomId || typeof window === 'undefined') return ''
    return `${window.location.origin}/game/${roomId.toUpperCase()}`
  }, [roomId])

  if (!ready) {
    return <LoadingScreen message="Loading game…" />
  }

  if (authError) {
    return <AuthErrorScreen message={authError} onRetry={retryAuth} />
  }

  if (room.loading) {
    return <LoadingScreen message="Loading game…" />
  }

  if (!room.bundle) {
    return (
      <ErrorState
        title="Game not found"
        message="This room doesn’t exist or the link is wrong."
      />
    )
  }

  const { game, players } = room.bundle
  const gameDef = room.gameDef ?? getGame(game.game_type)

  if (!gameDef) {
    return (
      <ErrorState
        title="Game not supported"
        message="This game isn’t available in this version of Game Night."
      />
    )
  }

  if (game.status === 'abandoned' || room.opponentPresence === 'left') {
    const name = room.opponent?.nickname ?? 'Your friend'
    return (
      <ErrorState
        title={`${name} left the game.`}
        message="You can head home and start a new room anytime."
      />
    )
  }

  const isMember = !!room.me
  const isFull = players.length >= gameDef.maxPlayers

  if (!isMember) {
    if (isFull || game.status !== 'waiting') {
      return (
        <ErrorState
          title="This room is already full."
          message="Ask your friend for a new invite link."
        />
      )
    }

    const onJoin = async () => {
      if (!roomId || !nickname.trim()) return
      setJoinBusy(true)
      setJoinError(null)
      try {
        await joinGame(roomId, nickname.trim())
        rememberRoom(roomId.toUpperCase())
        await room.refresh()
      } catch (err) {
        setJoinError(friendlyError(err instanceof Error ? err.message : 'Could not join'))
      } finally {
        setJoinBusy(false)
      }
    }

    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
        <Link to="/" className="mb-6 text-sm font-bold text-teal-dark hover:underline">
          ← Back
        </Link>
        <section className="space-y-6">
          <div>
            <p className="text-sm font-bold text-ink-muted">{gameDef.name}</p>
            <h1 className="font-display text-3xl font-bold text-ink">What&apos;s your name?</h1>
          </div>
          <NicknameField value={nickname} onChange={setNickname} autoFocus />
          {joinError && <p className="text-sm font-semibold text-coral">{joinError}</p>}
          <Button fullWidth disabled={!nickname.trim() || joinBusy} onClick={onJoin}>
            {joinBusy ? 'Joining…' : 'Join Game'}
          </Button>
        </section>
      </main>
    )
  }

  const Board = gameDef.Board
  const playerViews: GamePlayerView[] = players.map((p) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    symbol: p.symbol,
    lastSeenAt: p.lastSeenAt,
  }))

  const waitingForRematchName =
    game.status === 'finished' && room.iRequestedRematch
      ? room.opponent?.nickname ?? 'opponent'
      : null

  const onLeave = async () => {
    await room.leaveGame()
    rememberRoom(null)
    navigate('/')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-5 py-6">
      {(room.connection !== 'connected' || showConnectedFlash) && (
        <ConnectionBanner status={showConnectedFlash ? 'connected' : room.connection} />
      )}

      <RoomHeader gameName={gameDef.name} />

      {room.me && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-sm font-bold text-ink-muted">
            You are {gameDef.getSeatLabel(room.me.symbol)}
          </p>
          {!editingName ? (
            <button
              type="button"
              className="text-sm font-bold text-teal-dark hover:underline"
              onClick={() => {
                setNameDraft(room.me?.nickname ?? nickname)
                setEditingName(true)
              }}
            >
              Change name ({room.me.nickname})
            </button>
          ) : (
            <div className="w-full max-w-sm space-y-2">
              <NicknameField value={nameDraft} onChange={setNameDraft} label="Change your name" />
              <div className="flex gap-2">
                <Button
                  fullWidth
                  disabled={!nameDraft.trim() || nameBusy}
                  onClick={() => {
                    void (async () => {
                      setNameBusy(true)
                      const ok = await room.updateNickname(nameDraft.trim())
                      if (ok !== null) {
                        setNickname(nameDraft.trim())
                        setEditingName(false)
                      }
                      setNameBusy(false)
                    })()
                  }}
                >
                  {nameBusy ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  disabled={nameBusy}
                  onClick={() => setEditingName(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <PlayerList
        players={players}
        yourPlayerId={playerId}
        gameDef={gameDef}
        opponentOnline={room.opponentPresence === 'online'}
      />

      {room.opponentPresence === 'stale' && (
        <p className="text-center text-sm font-semibold text-amber">
          {room.opponent?.nickname ?? 'Friend'} may be reconnecting…
        </p>
      )}

      <TurnStatus
        gameDef={gameDef}
        status={game.status}
        yourSeat={room.me?.symbol ?? null}
        currentTurn={game.current_turn}
        winner={game.winner}
        players={players}
        waitingForRematchName={waitingForRematchName}
      />

      <Board
        state={game.board}
        yourSeat={room.me?.symbol ?? null}
        currentTurn={game.current_turn}
        winner={game.winner}
        status={game.status}
        isMyTurn={room.isMyTurn}
        disabled={room.busy || game.status !== 'active'}
        players={playerViews}
        onMove={(payload) => {
          void room.makeMove(payload)
        }}
      />

      {room.error && (
        <p className="text-center text-sm font-semibold text-coral">{room.error}</p>
      )}

      <RoomActions
        inviteUrl={inviteUrl}
        onLeave={() => {
          void onLeave()
        }}
        showRematch={game.status === 'finished'}
        rematchLabel={room.iRequestedRematch ? `Waiting for ${room.opponent?.nickname ?? 'friend'}…` : 'Rematch'}
        rematchDisabled={room.iRequestedRematch || room.busy}
        onRematch={() => {
          void room.requestRematch()
        }}
        busy={room.busy}
      />
    </main>
  )
}
