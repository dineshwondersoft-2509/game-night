import { Button } from './Button'

export function AuthErrorScreen({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="max-w-sm text-sm font-semibold text-coral">{message}</p>
      <Button type="button" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
