import { useEffect, useState } from 'react'
import type { GameBoardProps } from '../types'
import { asState } from './gameLogic'

const SEAT_COLOR: Record<string, string> = {
  A: '#0d9488',
  B: '#e85d4c',
}

export function Board({
  state,
  yourSeat,
  isMyTurn,
  disabled,
  status,
  onMove,
}: GameBoardProps) {
  const board = asState(state)
  const locked = disabled || !isMyTurn || status !== 'active'

  // Briefly show mismatched cards from lastReveal
  const [peek, setPeek] = useState<number[]>([])
  useEffect(() => {
    if (!board.lastReveal || board.lastReveal.matched) {
      setPeek([])
      return
    }
    setPeek([...board.lastReveal.indices])
    const t = window.setTimeout(() => setPeek([]), 900)
    return () => window.clearTimeout(t)
  }, [board.lastReveal?.indices[0], board.lastReveal?.indices[1], board.lastReveal?.matched, board.scoreA, board.scoreB, board.flipped.length])

  const faceUp = new Set<number>([...board.flipped, ...peek])
  for (let i = 0; i < board.cards.length; i++) {
    if (board.cards[i]?.matchedBy) faceUp.add(i)
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 animate-[fadeIn_300ms_ease-out]">
      <div className="flex items-center justify-between rounded-2xl border border-surface-2 bg-surface px-4 py-3 text-sm font-bold">
        <span style={{ color: SEAT_COLOR.A }}>
          A {board.scoreA}
          {yourSeat === 'A' ? ' · You' : ''}
        </span>
        <span className="text-ink-muted">
          {board.pairs} pairs · {board.cols}×{board.rows}
        </span>
        <span style={{ color: SEAT_COLOR.B }}>
          B {board.scoreB}
          {yourSeat === 'B' ? ' · You' : ''}
        </span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Memory Match board"
      >
        {board.cards.map((card, index) => {
          const up = faceUp.has(index)
          const matched = !!card.matchedBy
          const canClick = !locked && !up && !matched
          return (
            <button
              key={index}
              type="button"
              disabled={!canClick}
              aria-label={up ? `Card ${card.symbol}` : 'Face-down card'}
              onClick={() => onMove({ index })}
              className={[
                'aspect-square rounded-xl border-2 font-display text-xl sm:text-2xl',
                'flex items-center justify-center transition-all duration-200 active:scale-95',
                matched
                  ? 'border-transparent'
                  : up
                    ? 'border-teal bg-surface'
                    : canClick
                      ? 'border-surface-2 bg-teal text-white hover:bg-teal-dark cursor-pointer'
                      : 'border-surface-2 bg-teal/70 text-white cursor-not-allowed opacity-80',
              ].join(' ')}
              style={
                matched
                  ? { backgroundColor: `${SEAT_COLOR[card.matchedBy!]}33`, color: SEAT_COLOR[card.matchedBy!] }
                  : undefined
              }
            >
              {up || matched ? card.symbol : '✦'}
            </button>
          )
        })}
      </div>

      <p className="text-center text-xs font-semibold text-ink-muted">
        Flip two cards. Match a pair to score and go again.
      </p>
    </div>
  )
}
