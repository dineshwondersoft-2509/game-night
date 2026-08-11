import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { GamePicker } from '../components/GamePicker'
import { NicknameField } from '../components/NicknameField'
import { SizePicker } from '../components/SizePicker'
import { usePlayer } from '../hooks/usePlayer'
import { createGame, friendlyError } from '../services/gameService'
import type { GameDefinition } from '../games/types'
import { listAvailableGames } from '../games/registry'
import { LoadingScreen } from '../components/LoadingScreen'

type Step = 'name' | 'choose' | 'ready'

export function CreateGame() {
  const navigate = useNavigate()
  const { nickname, setNickname, ready, rememberRoom } = usePlayer()
  const available = listAvailableGames()
  const [step, setStep] = useState<Step>(nickname ? 'choose' : 'name')
  const [selected, setSelected] = useState<GameDefinition | null>(available[0] ?? null)
  const [boardSize, setBoardSize] = useState(available[0]?.defaultSize ?? 3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (selected?.defaultSize) {
      setBoardSize(selected.defaultSize)
    }
  }, [selected?.id, selected?.defaultSize])

  if (!ready) return <LoadingScreen message="Getting ready…" />

  const inviteUrl =
    createdCode && typeof window !== 'undefined'
      ? `${window.location.origin}/game/${createdCode}`
      : ''

  const onCreate = async () => {
    if (!selected || !nickname.trim()) return
    setBusy(true)
    setError(null)
    try {
      const game = await createGame(selected.id, nickname.trim(), { size: boardSize })
      rememberRoom(game.room_code)
      setCreatedCode(game.room_code)
      setStep('ready')
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : 'Could not create game'))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  const sizeSummary =
    selected?.sizeDisplay === 'bestOf'
      ? ` · Best of ${boardSize}`
      : selected?.sizeMode === 'fixed' || selected?.sizeMode === 'input'
        ? ` · ${boardSize}×${boardSize}`
        : ''

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <Link to="/" className="mb-6 text-sm font-bold text-teal-dark hover:underline">
        ← Back
      </Link>

      {step === 'name' && (
        <section className="space-y-6 animate-[fadeIn_250ms_ease-out]">
          <h1 className="font-display text-3xl font-bold text-ink">What&apos;s your name?</h1>
          <NicknameField value={nickname} onChange={setNickname} autoFocus />
          <Button fullWidth disabled={!nickname.trim()} onClick={() => setStep('choose')}>
            Continue
          </Button>
        </section>
      )}

      {step === 'choose' && (
        <section className="space-y-6 animate-[fadeIn_250ms_ease-out]">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Choose a game</h1>
          </div>
          <NicknameField
            value={nickname}
            onChange={setNickname}
            label="Your name"
            allowEditToggle
          />
          <GamePicker
            selectedId={selected?.id ?? null}
            onSelect={(game) => {
              setSelected(game)
              setBoardSize(game.defaultSize ?? 3)
            }}
          />
          {selected && (
            <SizePicker game={selected} value={boardSize} onChange={setBoardSize} />
          )}
          {error && <p className="text-sm font-semibold text-coral">{error}</p>}
          <Button fullWidth disabled={!selected || !nickname.trim() || busy} onClick={onCreate}>
            {busy ? 'Creating…' : 'Create Game'}
          </Button>
        </section>
      )}

      {step === 'ready' && createdCode && selected && (
        <section className="space-y-6 animate-[fadeIn_250ms_ease-out]">
          <h1 className="font-display text-3xl font-bold text-ink">Your game is ready!</h1>
          <div className="rounded-2xl border border-surface-2 bg-surface p-5 shadow-sm space-y-3">
            <p className="text-ink-muted">
              Game:{' '}
              <span className="font-bold text-ink">
                {selected.name}
                {sizeSummary}
              </span>
            </p>
            <p className="text-ink-muted">
              Room ID:{' '}
              <span className="font-display text-xl font-bold tracking-wider text-teal-dark">
                {createdCode}
              </span>
            </p>
            <div>
              <p className="mb-1 text-sm font-bold text-ink-muted">Share link</p>
              <p className="break-all rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold text-ink">
                {inviteUrl}
              </p>
            </div>
          </div>
          <Button fullWidth onClick={copy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <p className="text-center font-semibold text-ink-muted animate-pulse">
            Waiting for your friend to join…
          </p>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate(`/game/${createdCode}`)}
          >
            Enter Game Room
          </Button>
        </section>
      )}
    </main>
  )
}
