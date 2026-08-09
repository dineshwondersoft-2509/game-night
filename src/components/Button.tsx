import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  fullWidth?: boolean
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-teal text-white hover:bg-teal-dark shadow-sm disabled:bg-teal/50',
  secondary:
    'bg-surface-2 text-ink hover:bg-mint border border-surface-2',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-2',
  danger: 'bg-coral text-white hover:bg-coral-dark',
}

export function Button({
  children,
  variant = 'primary',
  fullWidth,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3',
        'font-sans font-bold text-base transition-all duration-150',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        'min-h-12',
        variants[variant],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
