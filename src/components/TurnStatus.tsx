import type { GameDefinition } from '../games/types'
import type { GamePlayerDto } from '../lib/database.types'
import type { GameStatus } from '../lib/database.types'

interface GameStatusProps {
  gameDef: GameDefinition
  status: GameStatus
  yourSeat: string | null
  currentTurn: string | null
  winner: string | null
  players: GamePlayerDto[]
  waitingForRematchName?: string | null
}

export function TurnStatus({
  gameDef,
  status,
  yourSeat,
  currentTurn,
  winner,
  players,
  waitingForRematchName,
}: GameStatusProps) {
  if (waitingForRematchName) {
    return (
      <p className="text-center font-display text-lg font-semibold text-ink animate-[fadeIn_250ms_ease-out]">
        Waiting for {waitingForRematchName}…
      </p>
    )
  }

  if (status === 'waiting') {
    return (
      <p className="text-center font-display text-lg font-semibold text-ink-muted animate-pulse">
        Waiting for your friend to join…
      </p>
    )
  }

  if (status === 'abandoned') {
    return (
      <p className="text-center font-display text-lg font-semibold text-coral">
        The other player left the game.
      </p>
    )
  }

  if (status === 'finished' && winner) {
    if (winner === 'draw') {
      return (
        <p className="text-center font-display text-xl font-bold text-ink animate-[celebrate_500ms_ease-out]">
          It&apos;s a draw
        </p>
      )
    }
    if (yourSeat === winner) {
      return (
        <p className="text-center font-display text-xl font-bold text-teal-dark animate-[celebrate_500ms_ease-out]">
          You won! 🎉
        </p>
      )
    }
    return (
      <p className="text-center font-display text-xl font-bold text-ink animate-[fadeIn_250ms_ease-out]">
        You lost
      </p>
    )
  }

  const custom = gameDef.renderStatus?.({
    yourSeat,
    currentTurn,
    winner,
    status,
    players: players.map((p) => ({
      playerId: p.playerId,
      nickname: p.nickname,
      symbol: p.symbol,
      lastSeenAt: p.lastSeenAt,
    })),
  })
  if (custom) {
    return (
      <p className="text-center font-display text-lg font-semibold text-ink-muted">{custom}</p>
    )
  }

  if (status === 'active' && currentTurn) {
    if (yourSeat === currentTurn) {
      return (
        <p className="text-center font-display text-lg font-semibold text-teal-dark">Your turn</p>
      )
    }
    const other = players.find((p) => p.symbol === currentTurn)
    return (
      <p className="text-center font-display text-lg font-semibold text-ink-muted">
        {other?.nickname ?? gameDef.getSeatLabel(currentTurn)}&apos;s turn
      </p>
    )
  }

  return null
}
