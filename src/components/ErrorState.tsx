import { Link } from 'react-router-dom'
import { Button } from './Button'

interface ErrorStateProps {
  title: string
  message?: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}

export function ErrorState({
  title,
  message,
  actionLabel = 'Back Home',
  actionTo = '/',
  onAction,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      {message && <p className="max-w-sm text-ink-muted">{message}</p>}
      {onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : (
        <Link to={actionTo}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
    </div>
  )
}
