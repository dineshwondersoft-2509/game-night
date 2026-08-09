import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { GameCard } from '../components/GameCard'
import { listGames } from '../games/registry'

export function Home() {
  const games = listGames()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-12 pt-10 sm:pt-16">
      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-teal-dark">Play together</p>
        <h1 className="font-display text-5xl font-bold tracking-tight text-ink sm:text-6xl">
          Game Night
        </h1>
        <p className="mt-4 max-w-sm text-lg text-ink-muted">
          Play quick games with your friends.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Link to="/create">
            <Button fullWidth>Create Game</Button>
          </Link>
          <Link to="/join">
            <Button variant="secondary" fullWidth>
              Join Game
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Games</h2>
        <div className="flex flex-col gap-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </main>
  )
}
