import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { AuthErrorScreen } from '../components/AuthErrorScreen'
import { LoadingScreen } from '../components/LoadingScreen'
import { NicknameField } from '../components/NicknameField'
import { usePlayer } from '../hooks/usePlayer'
import { friendlyError, joinGame } from '../services/gameService'
import { normalizeRoomCode } from '../utils/roomCode'

export function JoinGame() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { nickname, setNickname, ready, error: authError, retryAuth, rememberRoom } = usePlayer()
  const [code, setCode] = useState(roomId ? normalizeRoomCode(roomId) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!ready) return <LoadingScreen message="Getting ready…" />
  if (authError) return <AuthErrorScreen message={authError} onRetry={retryAuth} />

  const onJoin = async () => {
    if (!nickname.trim() || !code.trim()) return
    setBusy(true)
    setError(null)
    try {
      const game = await joinGame(code, nickname.trim())
      rememberRoom(game.room_code)
      navigate(`/game/${game.room_code}`, { replace: true })
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : 'Could not join'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <Link to="/" className="mb-6 text-sm font-bold text-teal-dark hover:underline">
        ← Back
      </Link>
      <section className="space-y-6 animate-[fadeIn_250ms_ease-out]">
        <h1 className="font-display text-3xl font-bold text-ink">Join a game</h1>
        {!roomId && (
          <div>
            <label className="mb-1 block text-sm font-bold text-ink-muted">Room code</label>
            <input
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              maxLength={8}
              placeholder="A7K92P"
              className="w-full rounded-2xl border-2 border-surface-2 bg-surface px-4 py-3 font-display text-xl font-bold tracking-wider outline-none focus:border-teal"
            />
          </div>
        )}
        {roomId && (
          <p className="text-ink-muted">
            Room{' '}
            <span className="font-display font-bold tracking-wider text-teal-dark">
              {normalizeRoomCode(roomId)}
            </span>
          </p>
        )}
        <NicknameField value={nickname} onChange={setNickname} autoFocus />
        {error && <p className="text-sm font-semibold text-coral">{error}</p>}
        <Button
          fullWidth
          disabled={!nickname.trim() || !code.trim() || busy}
          onClick={onJoin}
        >
          {busy ? 'Joining…' : 'Join Game'}
        </Button>
      </section>
    </main>
  )
}
