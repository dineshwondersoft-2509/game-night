import type { GameBoardProps } from '../types'
import { asState, countBoxes } from './gameLogic'
import type { LineOwner } from './types'

const SEAT_COLOR: Record<string, string> = {
  A: '#0d9488',
  B: '#e85d4c',
}

function lineClass(owner: LineOwner, locked: boolean, isHoverable: boolean) {
  if (owner) {
    return 'opacity-100'
  }
  if (locked) return 'opacity-20'
  return isHoverable ? 'opacity-35 hover:opacity-80 cursor-pointer' : 'opacity-25'
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
  const { size, h, v, boxes } = board
  const locked = disabled || !isMyTurn || status !== 'active'
  const cell = 56
  const gap = 14
  const boardPx = size * cell + (size + 1) * gap

  const scoreA = countBoxes(board, 'A')
  const scoreB = countBoxes(board, 'B')

  return (
    <div className="mx-auto w-full max-w-md space-y-4 animate-[fadeIn_300ms_ease-out]">
      <div className="flex justify-center gap-6 text-sm font-bold">
        <span style={{ color: SEAT_COLOR.A }}>
          A {scoreA}
          {yourSeat === 'A' ? ' · You' : ''}
        </span>
        <span style={{ color: SEAT_COLOR.B }}>
          B {scoreB}
          {yourSeat === 'B' ? ' · You' : ''}
        </span>
      </div>

      <div
        className="relative mx-auto"
        style={{ width: boardPx, height: boardPx }}
        role="grid"
        aria-label="Dots and Boxes board"
      >
        {/* Boxes fill */}
        {boxes.map((owner, i) => {
          const row = Math.floor(i / size)
          const col = i % size
          const left = gap + col * (cell + gap)
          const top = gap + row * (cell + gap)
          return (
            <div
              key={`box-${i}`}
              className="absolute rounded-lg transition-all duration-200"
              style={{
                left,
                top,
                width: cell,
                height: cell,
                backgroundColor: owner ? `${SEAT_COLOR[owner]}33` : 'transparent',
              }}
            />
          )
        })}

        {/* Horizontal lines */}
        {h.map((owner, index) => {
          const row = Math.floor(index / size)
          const col = index % size
          const left = gap + col * (cell + gap)
          const top = row * (cell + gap) + gap / 2 - 5
          return (
            <button
              key={`h-${index}`}
              type="button"
              disabled={locked || owner !== null}
              aria-label={`Horizontal line ${index + 1}`}
              onClick={() => onMove({ orient: 'h', index })}
              className={[
                'absolute rounded-full transition-all duration-150 active:scale-95',
                lineClass(owner, locked, !locked && owner === null),
              ].join(' ')}
              style={{
                left,
                top,
                width: cell,
                height: 10,
                backgroundColor: owner ? SEAT_COLOR[owner] : '#4a635c',
              }}
            />
          )
        })}

        {/* Vertical lines */}
        {v.map((owner, index) => {
          const row = Math.floor(index / (size + 1))
          const col = index % (size + 1)
          const left = col * (cell + gap) + gap / 2 - 5
          const top = gap + row * (cell + gap)
          return (
            <button
              key={`v-${index}`}
              type="button"
              disabled={locked || owner !== null}
              aria-label={`Vertical line ${index + 1}`}
              onClick={() => onMove({ orient: 'v', index })}
              className={[
                'absolute rounded-full transition-all duration-150 active:scale-95',
                lineClass(owner, locked, !locked && owner === null),
              ].join(' ')}
              style={{
                left,
                top,
                width: 10,
                height: cell,
                backgroundColor: owner ? SEAT_COLOR[owner] : '#4a635c',
              }}
            />
          )
        })}

        {/* Dots */}
        {Array.from({ length: (size + 1) * (size + 1) }, (_, i) => {
          const row = Math.floor(i / (size + 1))
          const col = i % (size + 1)
          const left = col * (cell + gap) + gap / 2 - 5
          const top = row * (cell + gap) + gap / 2 - 5
          return (
            <div
              key={`dot-${i}`}
              className="absolute h-2.5 w-2.5 rounded-full bg-ink"
              style={{ left, top }}
            />
          )
        })}
      </div>

      <p className="text-center text-xs font-semibold text-ink-muted">
        Claim lines. Complete a box to play again.
      </p>
    </div>
  )
}
