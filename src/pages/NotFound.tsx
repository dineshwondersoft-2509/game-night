import { Link } from 'react-router-dom'
import { Button } from '../components/Button'

export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-ink">Page not found</h1>
      <p className="text-ink-muted">That link doesn’t lead anywhere in Game Night.</p>
      <Link to="/">
        <Button>Back Home</Button>
      </Link>
    </main>
  )
}
