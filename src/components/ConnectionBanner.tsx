import type { ConnectionStatus } from '../hooks/useRealtimeGame'

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') {
    return (
      <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white shadow-md animate-[fadeIn_200ms_ease-out]">
        Connected
      </div>
    )
  }

  return (
    <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full bg-amber px-3 py-1.5 text-xs font-bold text-ink shadow-md">
      {status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
    </div>
  )
}
