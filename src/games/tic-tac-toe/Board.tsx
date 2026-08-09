import type { GameBoardProps } from '../types'
import { asState, getWinningLine } from './gameLogic'
import { Cell } from './Cell'

export function Board({
  state,
  isMyTurn,
  disabled,
  winner,
  status,
  onMove,
}: GameBoardProps) {
  const board = asState(state)
  const winningLine = status === 'finished' ? getWinningLine(board) : null
  const locked = disabled || !isMyTurn || status !== 'active'
  const textSize =
    board.size >= 7 ? 'text-lg sm:text-xl' : board.size >= 5 ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl'

  return (
    <div
      className={[
        'grid gap-1.5 sm:gap-2 w-full max-w-md mx-auto p-2',
        status === 'active' ? 'animate-[fadeIn_300ms_ease-out]' : '',
        winner ? 'animate-[celebrate_500ms_ease-out]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))` }}
      role="grid"
      aria-label={`Tic-Tac-Toe ${board.size} by ${board.size} board`}
    >
      {board.cells.map((value, index) => (
        <Cell
          key={index}
          value={value}
          highlight={winningLine?.includes(index) ?? false}
          disabled={locked}
          className={textSize}
          onClick={() => onMove({ position: index })}
        />
      ))}
    </div>
  )
}
