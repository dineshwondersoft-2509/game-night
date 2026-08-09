import { PlayerBadge } from './PlayerBadge'
import type { GamePlayerDto } from '../lib/database.types'
import type { GameDefinition } from '../games/types'

interface PlayerListProps {
  players: GamePlayerDto[]
  yourPlayerId: string | null
  gameDef?: GameDefinition
  opponentOnline?: boolean
}

export function PlayerList({
  players,
  yourPlayerId,
  gameDef,
  opponentOnline = true,
}: PlayerListProps) {
  const seats = gameDef?.seatSymbols ?? []
  const bySymbol = new Map(players.map((p) => [p.symbol, p]))

  return (
    <div className="rounded-2xl border border-surface-2 bg-surface p-2 shadow-sm animate-[fadeIn_300ms_ease-out]">
      {seats.map((seat) => {
        const player = bySymbol.get(seat)
        const isYou = player?.playerId === yourPlayerId
        return (
          <PlayerBadge
            key={seat}
            symbol={gameDef?.getSeatLabel(seat) ?? seat}
            nickname={player?.nickname ?? 'Waiting…'}
            isYou={isYou}
            online={player ? (isYou ? true : opponentOnline) : false}
            accent={gameDef?.accent}
          />
        )
      })}
    </div>
  )
}
