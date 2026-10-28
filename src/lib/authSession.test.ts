import { describe, expect, it } from 'vitest'
import { getTokenExpiry, isAccessTokenValid } from './authSession'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.sig`
}

describe('authSession', () => {
  it('reads token expiry from jwt', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    expect(getTokenExpiry(makeJwt({ exp }))).toBe(exp)
  })

  it('treats expired tokens as invalid', () => {
    const exp = Math.floor(Date.now() / 1000) - 60
    expect(isAccessTokenValid(makeJwt({ exp }))).toBe(false)
  })

  it('treats fresh tokens as valid', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    expect(isAccessTokenValid(makeJwt({ exp }))).toBe(true)
  })
})
