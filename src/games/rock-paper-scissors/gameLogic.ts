import {
  CHOICES,
  DEFAULT_BEST_OF,
  RPS_BEST_OF,
  type RpsBestOf,
  type RpsChoice,
  type RpsMove,
  type RpsSeat,
  type RpsState,
} from './types'

export function winsNeeded(bestOf: number): number {
  return Math.ceil(bestOf / 2)
}

export function createInitialState(bestOf: number = DEFAULT_BEST_OF): RpsState {
  const n = RPS_BEST_OF.includes(bestOf as RpsBestOf) ? bestOf : DEFAULT_BEST_OF
  return {
    bestOf: n,
    scoreA: 0,
    scoreB: 0,
    round: 1,
    choiceA: null,
    choiceB: null,
    lastRound: null,
  }
}

export function asState(raw: unknown): RpsState {
  if (!raw || typeof raw !== 'object') return createInitialState()
  const obj = raw as Partial<RpsState>
  const bestOf =
    typeof obj.bestOf === 'number' && RPS_BEST_OF.includes(obj.bestOf as RpsBestOf)
      ? obj.bestOf
      : DEFAULT_BEST_OF
  const parseChoice = (v: unknown): RpsChoice | null =>
    v === 'rock' || v === 'paper' || v === 'scissors' ? v : null
  return {
    bestOf,
    scoreA: typeof obj.scoreA === 'number' ? obj.scoreA : 0,
    scoreB: typeof obj.scoreB === 'number' ? obj.scoreB : 0,
    round: typeof obj.round === 'number' && obj.round > 0 ? obj.round : 1,
    choiceA: parseChoice(obj.choiceA),
    choiceB: parseChoice(obj.choiceB),
    lastRound:
      obj.lastRound &&
      typeof obj.lastRound === 'object' &&
      parseChoice((obj.lastRound as RpsState['lastRound'])?.choiceA) &&
      parseChoice((obj.lastRound as RpsState['lastRound'])?.choiceB)
        ? {
            choiceA: parseChoice((obj.lastRound as RpsState['lastRound'])!.choiceA)!,
            choiceB: parseChoice((obj.lastRound as RpsState['lastRound'])!.choiceB)!,
            winner:
              (obj.lastRound as RpsState['lastRound'])!.winner === 'A' ||
              (obj.lastRound as RpsState['lastRound'])!.winner === 'B' ||
              (obj.lastRound as RpsState['lastRound'])!.winner === 'draw'
                ? (obj.lastRound as RpsState['lastRound'])!.winner
                : 'draw',
          }
        : null,
  }
}

export function parseMove(move: unknown): RpsMove | null {
  if (!move || typeof move !== 'object') return null
  const choice = (move as { choice?: unknown }).choice
  if (choice !== 'rock' && choice !== 'paper' && choice !== 'scissors') return null
  return { choice }
}

export function roundWinner(a: RpsChoice, b: RpsChoice): RpsSeat | 'draw' {
  if (a === b) return 'draw'
  if (
    (a === 'rock' && b === 'scissors') ||
    (a === 'paper' && b === 'rock') ||
    (a === 'scissors' && b === 'paper')
  ) {
    return 'A'
  }
  return 'B'
}

export function getMatchWinner(state: RpsState): RpsSeat | 'draw' | null {
  const need = winsNeeded(state.bestOf)
  if (state.scoreA >= need) return 'A'
  if (state.scoreB >= need) return 'B'
  return null
}

export function isFinished(state: RpsState): boolean {
  return getMatchWinner(state) !== null
}

export function hasChosen(state: RpsState, seat: RpsSeat): boolean {
  return seat === 'A' ? state.choiceA !== null : state.choiceB !== null
}

export function isValidMove(state: RpsState, seat: RpsSeat, finished: boolean): boolean {
  if (finished) return false
  if (!CHOICES.length) return false
  return !hasChosen(state, seat)
}

export function applyChoice(
  state: RpsState,
  seat: RpsSeat,
  choice: RpsChoice,
): { state: RpsState; resolved: boolean; matchWinner: RpsSeat | 'draw' | null } {
  if (hasChosen(state, seat)) {
    throw new Error('Already chosen')
  }

  const next: RpsState = {
    ...state,
    choiceA: seat === 'A' ? choice : state.choiceA,
    choiceB: seat === 'B' ? choice : state.choiceB,
  }

  if (next.choiceA === null || next.choiceB === null) {
    return { state: next, resolved: false, matchWinner: null }
  }

  const winner = roundWinner(next.choiceA, next.choiceB)
  const scoreA = next.scoreA + (winner === 'A' ? 1 : 0)
  const scoreB = next.scoreB + (winner === 'B' ? 1 : 0)
  const resolved: RpsState = {
    bestOf: next.bestOf,
    scoreA,
    scoreB,
    round: next.round + 1,
    choiceA: null,
    choiceB: null,
    lastRound: {
      choiceA: next.choiceA,
      choiceB: next.choiceB,
      winner,
    },
  }

  return {
    state: resolved,
    resolved: true,
    matchWinner: getMatchWinner(resolved),
  }
}
