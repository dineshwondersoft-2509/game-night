interface RoomHeaderProps {
  gameName: string
}

export function RoomHeader({ gameName }: RoomHeaderProps) {
  return (
    <header className="text-center space-y-1">
      <p className="font-display text-sm font-semibold tracking-wide text-teal-dark">Game Night</p>
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{gameName}</h1>
    </header>
  )
}
