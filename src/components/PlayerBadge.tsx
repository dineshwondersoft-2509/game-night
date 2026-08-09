interface PlayerBadgeProps {
  symbol: string
  nickname: string
  isYou?: boolean
  online?: boolean
  accent?: string
}

export function PlayerBadge({
  symbol,
  nickname,
  isYou,
  online = true,
  accent = '#0d9488',
}: PlayerBadgeProps) {
  return (
    <div
      className={[
        'flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300',
        isYou ? 'bg-mint/60' : 'bg-transparent',
      ].join(' ')}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-bold text-white"
        style={{ backgroundColor: accent }}
      >
        {symbol}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{nickname}</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {isYou && <span className="font-bold text-teal-dark">You</span>}
        <span
          className={['inline-block h-2.5 w-2.5 rounded-full', online ? 'bg-success' : 'bg-ink-muted/40'].join(
            ' ',
          )}
          title={online ? 'Online' : 'Away'}
        />
      </div>
    </div>
  )
}
