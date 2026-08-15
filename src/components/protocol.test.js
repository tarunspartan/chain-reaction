// node --test src/components/protocol.test.js
//
// Covers the rules that decide a match but are invisible until two people are playing:
// move ordering, board agreement, host succession, color arbitration and the start gate.

import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_BOARD, PLAYERS } from './constants.js'
import {
    applyColorPick, boardChecksum, createOrderQueue, freeColor, matchDims,
    nextHostId, normalizeRoomCode, startBlocker,
} from './protocol.js'

const board = (rows, cols, fill = () => [0, null]) =>
    Array.from({length: rows}, (_, r) => Array.from({length: cols}, (_, c) => fill(r, c)))

const players = (...specs) => specs.map(([id, color, ready = false, dims]) => ({ id, color, ready, dims }))

test('order queue releases moves in seq order and holds early ones back', () => {
    const q = createOrderQueue()
    q.add(3, 'c')
    q.add(2, 'b')
    assert.deepEqual(q.drain(0), [], 'nothing is applicable while seq 1 is missing')
    assert.equal(q.gapAt(0), true)
    q.add(1, 'a')
    assert.deepEqual(q.drain(0), ['a', 'b', 'c'], 'the whole run releases at once')
    assert.equal(q.size, 0)
    assert.equal(q.gapAt(3), false)
})

test('order queue drains only up to the next gap', () => {
    const q = createOrderQueue()
    q.add(1, 'a')
    q.add(3, 'c')
    assert.deepEqual(q.drain(0), ['a'])
    assert.equal(q.gapAt(1), true, 'seq 2 never arrived')
    assert.equal(q.size, 1)
})

test('checksum tracks the board, not the object', () => {
    const a = board(5, 4)
    const b = board(5, 4)
    assert.equal(boardChecksum(a), boardChecksum(b), 'equal boards agree')

    b[2][1] = [1, PLAYERS[0].color]
    assert.notEqual(boardChecksum(a), boardChecksum(b), 'an added orb shows up')

    const c = board(5, 4)
    c[2][1] = [1, PLAYERS[1].color]
    assert.notEqual(boardChecksum(b), boardChecksum(c), 'same orb, different owner, differs')

    const d = board(5, 4)
    d[1][2] = [1, PLAYERS[0].color]
    assert.notEqual(boardChecksum(b), boardChecksum(d), 'position matters')
})

test('colors are handed out and arbitrated by the host', () => {
    const roster = players(['a', PLAYERS[0].color], ['b', PLAYERS[1].color])
    assert.equal(freeColor(roster), PLAYERS[2].color, 'next free color in palette order')

    const taken = applyColorPick(roster, 'b', PLAYERS[0].color)
    assert.equal(taken[1].color, PLAYERS[1].color, "a taken color doesn't move")

    const moved = applyColorPick(roster, 'b', PLAYERS[4].color)
    assert.equal(moved[1].color, PLAYERS[4].color, 'a free color is granted')

    const bogus = applyColorPick(roster, 'b', '#123456')
    assert.equal(bogus[1].color, PLAYERS[1].color, 'a color outside the palette is refused')

    assert.equal(freeColor(PLAYERS.map((p, i) => ({ id: i, color: p.color }))), null, 'full room has none left')
})

test('everyone elects the same heir when the host drops', () => {
    const roster = players(['host', PLAYERS[0].color], ['b', PLAYERS[1].color], ['c', PLAYERS[2].color])
    // each client runs the election with itself plus its own peers — same answer
    assert.equal(nextHostId(roster, ['b', 'c'], 'host'), 'b')
    assert.equal(nextHostId(roster, ['c', 'b'], 'host'), 'b', 'peer order must not matter')
    assert.equal(nextHostId(roster, ['c'], 'host'), 'c', 'skips players who already left')
    assert.equal(nextHostId(roster, [], 'host'), null, 'last one out')
})

test('start gate', () => {
    const two = players(['h', PLAYERS[0].color, true], ['b', PLAYERS[1].color, true])
    assert.equal(startBlocker({ mode: 'classic' }, two, 'h'), null)

    assert.match(startBlocker({ mode: 'classic' }, two.slice(0, 1), 'h'), /at least 2/)

    const notReady = players(['h', PLAYERS[0].color, false], ['b', PLAYERS[1].color, false])
    assert.match(startBlocker({ mode: 'classic' }, notReady, 'h'), /ready/)
    assert.equal(startBlocker({ mode: 'classic' }, players(['h', PLAYERS[0].color, false], ['b', PLAYERS[1].color, true]), 'h'), null,
        'the host counts as ready — they are the one pressing start')

    assert.match(startBlocker({ mode: 'teams' }, two, 'h'), /teams/, 'teams needs 4+')
    const three = [...two, { id: 'c', color: PLAYERS[2].color, ready: true }]
    assert.match(startBlocker({ mode: 'teams' }, three, 'h'), /teams/, 'teams needs even sides')
    const four = [...three, { id: 'd', color: PLAYERS[3].color, ready: true }]
    assert.equal(startBlocker({ mode: 'teams' }, four, 'h'), null)
})

test('the board fits the smallest screen in the room', () => {
    const roster = players(
        ['h', PLAYERS[0].color, true, { cols: 16, rows: 14 }],
        ['b', PLAYERS[1].color, true, { cols: 7, rows: 9 }],
    )
    assert.deepEqual(matchDims({ size: 'large' }, roster), { cols: 7, rows: 9 })
    assert.deepEqual(matchDims({ size: 'small' }, roster), { cols: 6, rows: 8 }, 'never bigger than the chosen size')
    assert.deepEqual(matchDims({ size: 'large' }, players(['h', PLAYERS[0].color, true])), MAX_BOARD,
        'a peer that never reported dims falls back to the hard ceiling, not to no ceiling')
})

test('room codes normalize the way people type them', () => {
    assert.equal(normalizeRoomCode(' ab-c d2 '), 'ABCD2')
})
