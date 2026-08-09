import type { GameBoardProps } from '../types'
import { asBoard, getWinningLine } from './gameLogic'
import { Cell } from './Cell'

export function Board({
  state,
  isMyTurn,
  disabled,
  winner,
  status,
  onMove,
}: GameBoardProps) {
  const board = asBoard(state)
  const winningLine = status === 'finished' ? getWinningLine(board) : null
  const locked = disabled || !isMyTurn || status !== 'active'

  return (
    <div
      className={[
        'grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mx-auto p-2',
        status === 'active' ? 'animate-[fadeIn_300ms_ease-out]' : '',
        winner ? 'animate-[celebrate_500ms_ease-out]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="grid"
      aria-label="Tic-Tac-Toe board"
    >
      {board.map((value, index) => (
        <Cell
          key={index}
          value={value}
          highlight={winningLine?.includes(index) ?? false}
          disabled={locked}
          onClick={() => onMove({ position: index })}
        />
      ))}
    </div>
  )
}
