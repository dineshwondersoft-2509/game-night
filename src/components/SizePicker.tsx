import type { GameDefinition } from '../games/types'

interface SizePickerProps {
  game: GameDefinition
  value: number
  onChange: (size: number) => void
}

export function SizePicker({ game, value, onChange }: SizePickerProps) {
  if (!game.sizeMode || game.sizeMode === 'none') return null

  if (game.sizeMode === 'fixed') {
    const options = game.sizeOptions ?? []
    const bestOf = game.sizeDisplay === 'bestOf'
    return (
      <div className="space-y-2">
        <p className="text-sm font-bold text-ink-muted">{game.sizeLabel ?? 'Size'}</p>
        <div className="grid grid-cols-3 gap-2">
          {options.map((size) => {
            const selected = value === size
            return (
              <button
                key={size}
                type="button"
                onClick={() => onChange(size)}
                className={[
                  'rounded-2xl border-2 px-3 py-3 font-display text-lg font-bold transition-all',
                  selected
                    ? 'border-teal bg-mint/50 text-teal-dark'
                    : 'border-surface-2 bg-surface text-ink hover:border-teal/40',
                ].join(' ')}
              >
                {bestOf ? `Best of ${size}` : `${size}×${size}`}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const min = game.minSize ?? 2
  const max = game.maxSize ?? 8

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-ink-muted" htmlFor="box-rows">
        {game.sizeLabel ?? 'Rows of boxes'}
      </label>
      <div className="flex items-center gap-3">
        <input
          id="box-rows"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value)
            if (!Number.isFinite(next)) return
            onChange(Math.min(max, Math.max(min, Math.floor(next))))
          }}
          className="w-24 rounded-2xl border-2 border-surface-2 bg-surface px-4 py-3 text-center font-display text-xl font-bold outline-none focus:border-teal"
        />
        <p className="text-sm font-semibold text-ink-muted">
          {value}×{value} boxes (min {min}, max {max})
        </p>
      </div>
    </div>
  )
}
