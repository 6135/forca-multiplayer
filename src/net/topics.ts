/** Room identifier and topic map. Protocol `forca/v1`. */

export const PROTOCOL = 'forca/v1'
export const PROTOCOL_VERSION = 1 as const

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** RFC 4648 base32, no padding. */
export function base32(bytes: Uint8Array): string {
  let out = ''
  let bits = 0
  let value = 0
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

/** Trim, fold to lower case and collapse the internal whitespace. */
export function normalizeRoomName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Derive the room identifier from the room name and the room key.
 * The room name alone is not enough to reach the topic.
 */
export async function deriveRoomId(roomName: string, roomKey: string): Promise<string> {
  const input = `${PROTOCOL}|${normalizeRoomName(roomName)}|${roomKey}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return base32(new Uint8Array(digest)).slice(0, 16)
}

export type Topics = {
  prefix: string
  room: string
  roster: string
  round: string
  roundEnd: string
  join: string
  wildcard: string
  presence: (clientId: string) => string
}

export function topicsFor(roomId: string): Topics {
  const prefix = `${PROTOCOL}/${roomId}`
  return {
    prefix,
    room: `${prefix}/room`,
    roster: `${prefix}/roster`,
    round: `${prefix}/round`,
    roundEnd: `${prefix}/round/end`,
    join: `${prefix}/join`,
    wildcard: `${prefix}/#`,
    presence: (clientId: string) => `${prefix}/presence/${clientId}`,
  }
}

/** Read the client identifier out of a `presence/<clientId>` topic. */
export function presenceClientId(topic: string): string | null {
  const match = /\/presence\/([^/]+)$/.exec(topic)
  return match ? match[1]! : null
}

/** `forca-` plus 16 random hex characters. Prevents a client ID collision. */
export function newClientId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return `forca-${hex}`
}

/** Stable per-tab player identifier. A rejoin restores the row and the score. */
export function newPlayerId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return `p-${hex}`
}
