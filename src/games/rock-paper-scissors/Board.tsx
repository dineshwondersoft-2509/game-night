import type { GameBoardProps } from '../types'
import {
  asState,
  hasChosen,
  winsNeeded,
} from './gameLogic'
import {
  CHOICES,
  CHOICE_ICON,
  CHOICE_LABEL,
  type RpsChoice,
  type RpsSeat,
} from './types'

export function Board({
  state,
  yourSeat,
  disabled,
  status,
  players,
  onMove,
}: GameBoardProps) {
  const board = asState(state)
  const seat = (yourSeat === 'A' || yourSeat === 'B' ? yourSeat : null) as RpsSeat | null
  const youChose = seat ? hasChosen(board, seat) : false
  const opponentSeat: RpsSeat | null = seat === 'A' ? 'B' : seat === 'B' ? 'A' : null
  const opponentChose = opponentSeat ? hasChosen(board, opponentSeat) : false
  const locked = disabled || status !== 'active' || !seat || youChose
  const need = winsNeeded(board.bestOf)
  const opponentName =
    players.find((p) => p.symbol === opponentSeat)?.nickname ?? opponentSeat ?? 'Friend'

  const pick = (choice: RpsChoice) => {
    if (locked) return
    onMove({ choice })
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 animate-[fadeIn_300ms_ease-out]">
      <div className="flex items-center justify-between rounded-2xl border border-surface-2 bg-surface px-4 py-3 text-sm font-bold">
        <span className="text-teal-dark">
          A {board.scoreA}
          {yourSeat === 'A' ? ' · You' : ''}
        </span>
        <span className="text-ink-muted">
          Best of {board.bestOf} · First to {need}
        </span>
        <span className="text-coral">
          B {board.scoreB}
          {yourSeat === 'B' ? ' · You' : ''}
        </span>
      </div>

      <p className="text-center font-display text-lg font-semibold text-ink">
        Round {board.round}
      </p>

      {board.lastRound && (
        <div className="rounded-2xl bg-mint/40 px-4 py-3 text-center text-sm font-semibold text-ink animate-[celebrate_400ms_ease-out]">
          Last round:{' '}
          {CHOICE_ICON[board.lastRound.choiceA]} vs {CHOICE_ICON[board.lastRound.choiceB]}
          {' — '}
          {board.lastRound.winner === 'draw'
            ? 'Draw'
            : board.lastRound.winner === yourSeat
              ? 'You scored!'
              : `${board.lastRound.winner} scored`}
        </div>
      )}

      {status === 'active' && (
        <p className="text-center text-sm font-semibold text-ink-muted">
          {!seat
            ? 'Spectating…'
            : youChose
              ? opponentChose
                ? 'Revealing…'
                : `Locked in. Waiting for ${opponentName}…`
              : 'Pick rock, paper, or scissors'}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={locked}
            onClick={() => pick(choice)}
            className={[
              'flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-5 transition-all',
              'font-display font-bold active:scale-95',
              locked
                ? 'border-surface-2 bg-surface opacity-60 cursor-not-allowed'
                : 'border-surface-2 bg-surface hover:border-teal/50 hover:bg-mint/30 cursor-pointer',
            ].join(' ')}
          >
            <span className="text-3xl" aria-hidden>
              {CHOICE_ICON[choice]}
            </span>
            <span className="text-sm text-ink">{CHOICE_LABEL[choice]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
