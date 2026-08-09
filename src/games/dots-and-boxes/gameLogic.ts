import {
  DEFAULT_SIZE,
  boxCount,
  clampSize,
  horizontalCount,
  verticalCount,
  type DotsAndBoxesMove,
  type DotsAndBoxesState,
  type LineOwner,
} from './types'

function emptyLines(count: number): LineOwner[] {
  return Array.from({ length: count }, () => null)
}

export function createInitialState(size = DEFAULT_SIZE): DotsAndBoxesState {
  const n = clampSize(size)
  return {
    size: n,
    h: emptyLines(horizontalCount(n)),
    v: emptyLines(verticalCount(n)),
    boxes: emptyLines(boxCount(n)),
  }
}

export function asState(raw: unknown): DotsAndBoxesState {
  if (!raw || typeof raw !== 'object') return createInitialState()
  const obj = raw as Partial<DotsAndBoxesState>
  const size = typeof obj.size === 'number' && obj.size > 0 ? obj.size : DEFAULT_SIZE
  const normalize = (arr: unknown, len: number): LineOwner[] => {
    if (!Array.isArray(arr) || arr.length !== len) return emptyLines(len)
    return arr.map((v) => (v === 'A' || v === 'B' ? v : null))
  }
  return {
    size,
    h: normalize(obj.h, horizontalCount(size)),
    v: normalize(obj.v, verticalCount(size)),
    boxes: normalize(obj.boxes, boxCount(size)),
  }
}

export function parseMove(move: unknown): DotsAndBoxesMove | null {
  if (!move || typeof move !== 'object') return null
  const orient = (move as { orient?: unknown }).orient
  const index = (move as { index?: unknown }).index
  if ((orient !== 'h' && orient !== 'v') || typeof index !== 'number' || !Number.isInteger(index)) {
    return null
  }
  return { orient, index }
}

function boxSides(state: DotsAndBoxesState, boxIndex: number): [LineOwner, LineOwner, LineOwner, LineOwner] {
  const { size, h, v } = state
  const row = Math.floor(boxIndex / size)
  const col = boxIndex % size
  const top = h[row * size + col]!
  const bottom = h[(row + 1) * size + col]!
  const left = v[row * (size + 1) + col]!
  const right = v[row * (size + 1) + col + 1]!
  return [top, bottom, left, right]
}

export function isBoxComplete(state: DotsAndBoxesState, boxIndex: number): boolean {
  return boxSides(state, boxIndex).every((side) => side !== null)
}

export function isValidMove(
  state: DotsAndBoxesState,
  move: DotsAndBoxesMove,
  seat: string,
  currentTurn: string,
  finished: boolean,
): boolean {
  if (finished) return false
  if (seat !== currentTurn) return false
  const lines = move.orient === 'h' ? state.h : state.v
  if (move.index < 0 || move.index >= lines.length) return false
  return lines[move.index] === null
}

export function applyLine(
  state: DotsAndBoxesState,
  move: DotsAndBoxesMove,
  seat: 'A' | 'B',
): { state: DotsAndBoxesState; claimed: number; keepTurn: boolean } {
  const lines = move.orient === 'h' ? [...state.h] : [...state.v]
  if (lines[move.index] !== null) {
    throw new Error('Line already claimed')
  }
  lines[move.index] = seat

  const next: DotsAndBoxesState = {
    size: state.size,
    h: move.orient === 'h' ? lines : [...state.h],
    v: move.orient === 'v' ? lines : [...state.v],
    boxes: [...state.boxes],
  }

  let claimed = 0
  for (let i = 0; i < next.boxes.length; i++) {
    if (next.boxes[i] === null && isBoxComplete(next, i)) {
      next.boxes[i] = seat
      claimed += 1
    }
  }

  return { state: next, claimed, keepTurn: claimed > 0 }
}

export function countBoxes(state: DotsAndBoxesState, seat: 'A' | 'B'): number {
  return state.boxes.filter((b) => b === seat).length
}

export function isFinished(state: DotsAndBoxesState): boolean {
  return state.boxes.every((b) => b !== null)
}

export function getWinner(state: DotsAndBoxesState): 'A' | 'B' | 'draw' | null {
  if (!isFinished(state)) return null
  const a = countBoxes(state, 'A')
  const b = countBoxes(state, 'B')
  if (a === b) return 'draw'
  return a > b ? 'A' : 'B'
}

export function getNextTurn(current: 'A' | 'B', keepTurn: boolean): 'A' | 'B' {
  if (keepTurn) return current
  return current === 'A' ? 'B' : 'A'
}

export function resetGame(size = DEFAULT_SIZE): DotsAndBoxesState {
  return createInitialState(size)
}
