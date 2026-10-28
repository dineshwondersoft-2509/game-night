const AUTH_STORAGE_KEY = 'game-night-auth'
const ACCESS_TOKEN_BUFFER_SEC = 30
export const AUTH_TIMEOUT_MS = 10_000

type StoredAuth = {
  access_token?: string
  expires_at?: number
  currentSession?: {
    access_token?: string
    expires_at?: number
  }
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message = 'Connection timed out. Please try again.',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error(message)), ms)
    Promise.resolve(promise).then(
      (value) => {
        globalThis.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        globalThis.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  const signals = [controller.signal]
  if (init?.signal) {
    if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
      signals.push(init.signal)
    } else if (init.signal.aborted) {
      controller.abort()
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  const signal =
    typeof AbortSignal !== 'undefined' && 'any' in AbortSignal
      ? AbortSignal.any(signals)
      : controller.signal

  return fetch(input, { ...init, signal }).finally(() => globalThis.clearTimeout(timeout))
}

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

function getAccessToken(stored: StoredAuth): string | null {
  return stored.access_token ?? stored.currentSession?.access_token ?? null
}

function getExpiresAt(stored: StoredAuth): number | null {
  const expiresAt = stored.expires_at ?? stored.currentSession?.expires_at
  return typeof expiresAt === 'number' ? expiresAt : null
}

export function getTokenExpiry(accessToken: string): number | null {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1] ?? '')) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export function isAccessTokenValid(accessToken: string, bufferSec = ACCESS_TOKEN_BUFFER_SEC): boolean {
  const exp = getTokenExpiry(accessToken)
  if (!exp) return false
  return exp * 1000 > Date.now() + bufferSec * 1000
}

export function isStoredSessionUsable(): boolean {
  const stored = readStoredAuth()
  if (!stored) return false

  const accessToken = getAccessToken(stored)
  if (accessToken && isAccessTokenValid(accessToken)) {
    return true
  }

  const expiresAt = getExpiresAt(stored)
  if (expiresAt && expiresAt * 1000 > Date.now() + ACCESS_TOKEN_BUFFER_SEC * 1000) {
    return true
  }

  return false
}

/** Drop stale sessions so Supabase does not hang on refresh during startup. */
export function clearExpiredStoredSession(): void {
  if (isStoredSessionUsable()) return
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
