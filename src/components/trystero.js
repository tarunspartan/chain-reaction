// serverless matchmaking via Trystero (github.com/dmotz/trystero) — peers find
// each other over the public Nostr relay network using one short room code;
// gameplay itself still flows directly peer-to-peer once connected.

export const APP_ID = 'https://tarunspartan.github.io/chain-reaction'
export const ACTION_ID = 'msg'

// Crockford-ish alphabet: no 0/O, 1/I/L — unambiguous read aloud or handwritten
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 5

export const generateRoomCode = () =>
    Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[~~(Math.random() * ROOM_CODE_ALPHABET.length)]).join('')

export const normalizeRoomCode = (raw) => raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
