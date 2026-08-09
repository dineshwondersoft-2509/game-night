import { listGames, listAvailableGames } from '../games/registry'
import { GameCard } from './GameCard'
import type { GameDefinition } from '../games/types'

interface GamePickerProps {
  selectedId: string | null
  onSelect: (game: GameDefinition) => void
  availableOnly?: boolean
}

export function GamePicker({ selectedId, onSelect, availableOnly = false }: GamePickerProps) {
  const games = availableOnly ? listAvailableGames() : listGames()

  return (
    <div className="flex flex-col gap-3">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          interactive
          selected={selectedId === game.id}
          onSelect={() => onSelect(game)}
        />
      ))}
    </div>
  )
}
