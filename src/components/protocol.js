// the online protocol, minus the wire — message shapes and the pure rules that decide
// who hosts, who gets which color, when a match may start and whether two boards still
// agree. Deliberately free of React and Trystero so it runs (and is tested) in plain
// node: these are the parts where a subtle bug is invisible until two people are
// mid-match. See online.js for the room that speaks it, online.test.js for the tests.

import { MAX_BOARD, MAX_ONLINE_PLAYERS, MIN_BOARD, PLAYERS, sizeDims, teamsPlayable } from './constants.js'

// Crockford-ish alphabet: no 0/O, 1/I/L — unambiguous read aloud or handwritten
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 5

export const generateRoomCode = () =>
    Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[~~(Math.random() * ROOM_CODE_ALPHABET.length)]).join('')

export const normalizeRoomCode = (raw) => raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

// an invite is just the app's own URL with the room on it, so opening it drops you
// straight into that lobby — nothing to install, nothing to type
export const ROOM_PARAM = 'room'

export const inviteUrl = (code) => {
    const url = new URL(window.location.href)
    url.hash = ''
    url.search = `?${ROOM_PARAM}=${code}`
    return url.toString()
}

export const inviteText = (code) =>
    `Join my Chain Reaction match — room code ${code}`

// the code this page was opened with, if any
export const codeFromUrl = () => {
    const raw = new URLSearchParams(window.location.search).get(ROOM_PARAM)
    if(!raw) return null
    const code = normalizeRoomCode(raw)
    return code.length === ROOM_CODE_LENGTH ? code : null
}

// ?tab=online — used by the installed app's "Play online" shortcut
export const tabFromUrl = () => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    return tab === 'online' || tab === 'local' ? tab : null
}

export const MSG = {
    HELLO:  'hello',  // guest → host: I'm here, and this is how big my screen is
    LOBBY:  'lobby',  // host → all: the whole authoritative lobby
    PICK:   'pick',   // guest → host: I want this color
    READY:  'ready',  // guest → host: ready flag
    REJECT: 'reject', // host → one: you can't come in (room full)
    KICK:   'kick',   // host → one: you're out
    START:  'start',  // host → all: match config, go
    MOVE:   'move',   // mover → all: seq, cell, post-move checksum
    LEFT:   'left',   // host → all: this player is out of the match, as of seq N
    RESYNC: 'resync', // client → host: my board disagrees, send me yours
    STATE:  'state',  // host → one: full match snapshot
    BYE:    'bye',    // any → all: leaving cleanly
}

// everything the match layer handles rather than the lobby
export const MATCH_MESSAGES = new Set([MSG.START, MSG.MOVE, MSG.LEFT, MSG.RESYNC, MSG.STATE])

// FNV-1a over every cell's count and owner. Rides along with each move so a receiver
// can tell, in one pass, whether its board still matches the mover's
export const boardChecksum = (board) => {
    let h = 2166136261
    for(let i = 0; i < board.length; i++){
        const row = board[i]
        for(let j = 0; j < row.length; j++){
            const [count, owner] = row[j]
            h = Math.imul(h ^ (count + 1), 16777619)
            if(owner) for(let k = 1; k < owner.length; k++) h = Math.imul(h ^ owner.charCodeAt(k), 16777619)
        }
    }
    return h >>> 0
}

// first unclaimed color in palette order — a new joiner gets a seat immediately rather
// than sitting colorless until they pick
export const freeColor = (players) => {
    const taken = new Set(players.map(p => p.color))
    return PLAYERS.find(p => !taken.has(p.color))?.color ?? null
}

// host-side color pick. A taken color is refused rather than duplicated: the host is
// the only place picks are serialised, so whoever's message arrives second loses
export const applyColorPick = (players, id, color) => {
    if(!PLAYERS.some(p => p.color === color)) return players
    if(players.some(p => p.color === color && p.id !== id)) return players
    return players.map(p => p.id === id ? { ...p, color } : p)
}

// every client runs this over the same player list, so they all elect the same
// successor when the host disappears: earliest joiner still in the room
export const nextHostId = (players, presentIds, leavingId) =>
    players.find(p => p.id !== leavingId && presentIds.includes(p.id))?.id ?? null

// null when the match can start, otherwise why it can't — the host's START is gated on
// this and the same string is shown to everyone in the lobby
export const startBlocker = (settings, players, hostId) => {
    if(players.length < 2) return 'need at least 2 players'
    if(players.length > MAX_ONLINE_PLAYERS) return 'too many players'
    if(settings.mode === 'teams' && !teamsPlayable(players.length)) return 'teams needs an even number of players (4+)'
    // the host is the one pressing the button, so they count as ready
    if(!players.every(p => p.ready || p.id === hostId)) return 'waiting for everyone to be ready'
    return null
}

// the board is only as big as the smallest screen in the room can show. A player whose
// dimensions never arrived falls back to the hard ceiling rather than to no ceiling
export const matchDims = (settings, players) =>
    players.reduce((dims, p) => ({
        cols: Math.max(MIN_BOARD.cols, Math.min(dims.cols, p.dims?.cols ?? MAX_BOARD.cols)),
        rows: Math.max(MIN_BOARD.rows, Math.min(dims.rows, p.dims?.rows ?? MAX_BOARD.rows)),
    }), sizeDims(settings.size, MAX_BOARD))

// Moves are broadcast peer-to-peer, so a later move can outrun an earlier one on a
// different connection. Everything ordered by seq goes through here and comes out in
// order — the match never applies move N+2 before N+1.
export const createOrderQueue = () => {
    const pending = new Map()
    return {
        add: (seq, item) => { pending.set(seq, item) },
        // applying a move is animated and asynchronous, so the caller takes exactly the
        // one it can use next and comes back for the rest when that finishes
        take: (seq) => {
            const item = pending.get(seq)
            if(item === undefined) return null
            pending.delete(seq)
            return item
        },
        // everything now applicable, in order, given the last seq already applied
        drain: (appliedSeq) => {
            const ready = []
            let next = appliedSeq + 1
            while(pending.has(next)){
                ready.push(pending.get(next))
                pending.delete(next)
                next += 1
            }
            return ready
        },
        // a gap that won't fill means a message was lost — the caller asks for a resync
        gapAt: (appliedSeq) => pending.size > 0 && !pending.has(appliedSeq + 1),
        clear: () => pending.clear(),
        get size(){ return pending.size },
    }
}
