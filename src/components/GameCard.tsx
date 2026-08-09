import type { GameDefinition } from '../games/types'

interface GameCardProps {
  game: GameDefinition
  selected?: boolean
  onSelect?: () => void
  interactive?: boolean
}

export function GameCard({ game, selected, onSelect, interactive = false }: GameCardProps) {
  const available = game.status === 'available'
  const content = (
    <>
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-display font-bold text-white"
        style={{ backgroundColor: game.accent }}
        aria-hidden
      >
        {game.icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold text-ink">{game.name}</h3>
          {!available && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-muted">
              Soon
            </span>
          )}
        </div>
        <p className="text-sm text-ink-muted">{game.description}</p>
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          {game.maxPlayers} players · {game.tagline}
        </p>
      </div>
    </>
  )

  if (!interactive) {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-surface-2 bg-surface p-4 shadow-sm">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={!available}
      onClick={onSelect}
      className={[
        'flex w-full items-start gap-4 rounded-2xl border-2 bg-surface p-4 text-left shadow-sm transition-all',
        available ? 'hover:border-teal/50 active:scale-[0.99]' : 'opacity-60 cursor-not-allowed',
        selected ? 'border-teal ring-2 ring-teal/20' : 'border-surface-2',
      ].join(' ')}
    >
      {content}
    </button>
  )
}
