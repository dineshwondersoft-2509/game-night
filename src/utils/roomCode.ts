const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 6): string {
  let code = ''
  const values = crypto.getRandomValues(new Uint32Array(length))
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[values[i]! % ROOM_CODE_ALPHABET.length]
  }
  return code
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}
