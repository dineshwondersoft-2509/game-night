export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-mint border-t-teal" />
      <p className="font-semibold text-ink-muted">{message}</p>
    </div>
  )
}
