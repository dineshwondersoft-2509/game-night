interface CellProps {
  value: 'X' | 'O' | null
  highlight: boolean
  disabled: boolean
  onClick: () => void
  className?: string
}

export function Cell({ value, highlight, disabled, onClick, className = '' }: CellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || value !== null}
      aria-label={value ? `Cell ${value}` : 'Empty cell'}
      className={[
        'aspect-square rounded-2xl font-display font-bold',
        'flex items-center justify-center transition-all duration-150',
        'border-2 active:scale-95',
        className || 'text-4xl sm:text-5xl',
        highlight
          ? 'bg-mint border-teal text-teal-dark scale-[1.02] shadow-md'
          : 'bg-surface border-surface-2 text-ink hover:border-teal/40',
        disabled && !value ? 'opacity-60 cursor-not-allowed' : '',
        !disabled && !value ? 'cursor-pointer hover:bg-mint/40' : '',
        value === 'X' ? 'text-teal-dark' : '',
        value === 'O' ? 'text-coral' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={value ? 'animate-[pop_200ms_ease-out]' : ''}>{value}</span>
    </button>
  )
}
