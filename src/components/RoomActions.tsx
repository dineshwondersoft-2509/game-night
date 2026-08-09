import { useState } from 'react'
import { Button } from './Button'

interface RoomActionsProps {
  inviteUrl: string
  onLeave: () => void
  showRematch?: boolean
  rematchLabel?: string
  rematchDisabled?: boolean
  onRematch?: () => void
  busy?: boolean
}

export function RoomActions({
  inviteUrl,
  onLeave,
  showRematch,
  rematchLabel = 'Rematch',
  rematchDisabled,
  onRematch,
  busy,
}: RoomActionsProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {showRematch && onRematch && (
        <Button onClick={onRematch} disabled={busy || rematchDisabled} fullWidth>
          {rematchLabel}
        </Button>
      )}
      <Button variant="secondary" onClick={copy} fullWidth>
        {copied ? 'Link copied!' : 'Copy Invite Link'}
      </Button>
      <Button variant="ghost" onClick={onLeave} disabled={busy} fullWidth>
        Leave Game
      </Button>
    </div>
  )
}
