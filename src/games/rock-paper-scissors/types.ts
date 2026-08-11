export type RpsChoice = 'rock' | 'paper' | 'scissors'
export type RpsSeat = 'A' | 'B'

export interface RpsState {
  bestOf: number
  scoreA: number
  scoreB: number
  round: number
  choiceA: RpsChoice | null
  choiceB: RpsChoice | null
  lastRound: {
    choiceA: RpsChoice
    choiceB: RpsChoice
    winner: RpsSeat | 'draw'
  } | null
}

export interface RpsMove {
  choice: RpsChoice
}

export const RPS_BEST_OF = [3, 5, 7] as const
export type RpsBestOf = (typeof RPS_BEST_OF)[number]
export const DEFAULT_BEST_OF: RpsBestOf = 3

export const CHOICES: RpsChoice[] = ['rock', 'paper', 'scissors']

export const CHOICE_LABEL: Record<RpsChoice, string> = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
}

export const CHOICE_ICON: Record<RpsChoice, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
}
