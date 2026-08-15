// serverless matchmaking via Trystero (github.com/dmotz/trystero) — peers find each
// other over the public Nostr relay network using one short room code; gameplay then
// flows directly peer-to-peer.
//
// Two different problems get two different answers here:
//
//   * the LOBBY (who's in, colors, ready flags, settings) is host-authoritative. The
//     host owns it and broadcasts the whole thing on every change; guests render what
//     they're handed and never compute it themselves. Two players grabbing the same
//     color, a join racing a start — the host serialises all of it.
//   * MOVES are broadcast peer-to-peer with no relay hop through the host. Only one
//     player can legally move at a time, so a single seq counter totally orders the
//     match, and every client replays the same ordered stream through the same pure
//     engine. Boards stay identical without ever shipping a board.

import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_ONLINE_PLAYERS, PLAYERS } from './constants'
import {
    MATCH_MESSAGES, MSG, ROOM_CODE_LENGTH, applyColorPick, freeColor, generateRoomCode,
    matchDims, nextHostId, normalizeRoomCode, startBlocker,
} from './protocol'

export const APP_ID = 'https://tarunspartan.github.io/chain-reaction'

// Bumped for the 8-player rewrite. v1 spoke a different, incompatible protocol
// ({type:'host-config'} and friends) over the action name 'msg', and shares this
// appId and the same 5-character room codes — so a v1 client could join a v2 room,
// connect over WebRTC, and then sit there exchanging messages neither side
// understands, with no error on either end. A separate action name means old and new
// clients simply never hear each other, and a stale client fails honestly instead.
export const ACTION_ID = 'msg-v2'

// Trystero has no "join failed" event — a bad code just looks like the lobby never arriving
const CONNECT_TIMEOUT_MS = 20000

// Trystero and its WebRTC/relay machinery is 21 KB gzipped and is dead weight for
// anyone playing locally, so it's fetched the first time a room is opened — by which
// point we're about to wait on the network anyway. Both bindings stay module-level so
// every existing use site keeps working unchanged once they're filled in.
let joinRoom = null
let selfId = ''

const loadTrystero = async () => {
    if(joinRoom) return
    const ts = await import('trystero')
    joinRoom = ts.joinRoom
    selfId = ts.selfId
}

const emptyLobby = (hostId, settings) => ({
    hostId,
    matchId: 0,
    phase: 'lobby',
    settings,
    players: [],
})

// ---------------------------------------------------------------------------
// the room itself
// ---------------------------------------------------------------------------

// `handlers` is a ref so the message pump never goes stale and never needs re-wiring:
//   onMatchMessage(msg, fromId)  start/move/left/resync/state — the match layer's business
//   onPeerLeave(peerId, lobby)   so a match in progress can announce the drop
//   getDims()                    this screen's max board dimensions
export const useOnlineRoom = (handlers) => {
    const [ net, setNet ] = useState({
        active: false, connecting: false, code: '', isHost: false, error: null, lobby: null,
    })

    const roomRef = useRef(null)
    const actionRef = useRef(null)
    const lobbyRef = useRef(null)
    const timeoutRef = useRef(null)
    const pumpRef = useRef(null)

    const patch = useCallback((next) => setNet(prev => ({ ...prev, ...next })), [])

    const send = useCallback((msg, target) => {
        try { actionRef.current?.send(msg, target ? { target } : undefined)?.catch?.(() => {}) }
        catch { /* peer vanished mid-send — the leave handlers clean up */ }
    }, [])

    const peerIds = useCallback(() => Object.keys(roomRef.current?.getPeers() ?? {}), [])

    // mirror the authoritative lobby into state (and onto the wire, when we own it)
    const publishLobby = useCallback((broadcast = true) => {
        const lobby = lobbyRef.current
        if(!lobby) return
        if(broadcast && lobby.hostId === selfId) send({ t: MSG.LOBBY, lobby })
        patch({ lobby: { ...lobby } })
    }, [send, patch])

    const editLobby = useCallback((fn) => {
        if(!lobbyRef.current || lobbyRef.current.hostId !== selfId) return
        const next = fn(lobbyRef.current)
        if(!next) return
        lobbyRef.current = next
        publishLobby()
    }, [publishLobby])

    const closeRoom = useCallback(() => {
        clearTimeout(timeoutRef.current)
        // detach the receiver before leaving: leave() is asynchronous, so anything the
        // room already had in flight would otherwise still land on us. A stale lobby
        // broadcast arriving one beat after a kick used to overwrite the very message
        // explaining why we'd been removed.
        if(actionRef.current) actionRef.current.onMessage = null
        if(roomRef.current){
            roomRef.current.onPeerJoin = null
            roomRef.current.onPeerLeave = null
            try { roomRef.current.leave() } catch { /* already gone */ }
        }
        roomRef.current = null
        actionRef.current = null
        lobbyRef.current = null
    }, [])

    const leave = useCallback(() => {
        send({ t: MSG.BYE })
        closeRoom()
        setNet({ active: false, connecting: false, code: '', isHost: false, error: null, lobby: null })
    }, [send, closeRoom])

    // ---- inbound ----

    // shared by an explicit BYE and Trystero's own peer-leave, so a closing tab doesn't
    // linger in the lobby for however long the connection takes to time out. Safe to
    // run twice for the same peer — the second pass finds nothing left to remove.
    const dropPeer = useCallback((peerId) => {
        const lobby = lobbyRef.current
        if(!lobby) return
        const without = lobby.players.filter(p => p.id !== peerId)
        // host migration: every client runs the same election over the same list, so
        // they all land on the same successor and the match carries on
        const hostId = lobby.hostId === peerId
            ? (nextHostId(lobby.players, [selfId, ...peerIds()], peerId) ?? selfId)
            : lobby.hostId
        lobbyRef.current = { ...lobby, players: without, hostId }
        // notified after the election, so a match in progress knows who announces the drop
        handlers.current.onPeerLeave?.(peerId, lobbyRef.current)
        if(hostId === selfId){
            patch({ isHost: true })
            publishLobby() // ours now: everyone syncs to this copy
        } else {
            patch({ lobby: { ...lobbyRef.current } }) // the host's own broadcast is the truth
        }
    }, [peerIds, patch, publishLobby, handlers])

    pumpRef.current = (msg, fromId) => {
        if(!roomRef.current) return // we've left — anything still arriving is from a dead session
        const lobby = lobbyRef.current
        const isHost = lobby?.hostId === selfId

        if(MATCH_MESSAGES.has(msg.t)){
            handlers.current.onMatchMessage?.(msg, fromId)
            return
        }

        switch(msg.t){
            case MSG.LOBBY: {
                // two hosts can only coexist through a code collision or a migration
                // race — the lower id yields, so the room converges on one owner
                if(isHost && selfId < msg.lobby.hostId) return
                lobbyRef.current = msg.lobby
                clearTimeout(timeoutRef.current)
                patch({ lobby: msg.lobby, connecting: false, isHost: msg.lobby.hostId === selfId, error: null })
                return
            }
            case MSG.HELLO:
                editLobby(l => ({ ...l, players: l.players.map(p => p.id === fromId ? { ...p, dims: msg.dims } : p) }))
                return
            case MSG.PICK:
                editLobby(l => ({ ...l, players: applyColorPick(l.players, fromId, msg.color) }))
                return
            case MSG.READY:
                editLobby(l => ({ ...l, players: l.players.map(p => p.id === fromId ? { ...p, ready: !!msg.ready } : p) }))
                return
            case MSG.REJECT:
                closeRoom()
                setNet({ active: false, connecting: false, code: net.code, isHost: false, lobby: null, error: msg.reason })
                return
            case MSG.KICK:
                if(fromId !== lobby?.hostId) return
                closeRoom()
                setNet({ active: false, connecting: false, code: net.code, isHost: false, lobby: null, error: 'The host removed you from the room.' })
                return
            case MSG.BYE:
                // treated as a leave straight away rather than waiting for the peer
                // timeout, so the lobby doesn't show a ghost for several seconds
                dropPeer(fromId)
                return
            default:
                return
        }
    }

    const wire = useCallback((code) => {
        const room = joinRoom({ appId: APP_ID }, code)
        roomRef.current = room
        const action = room.makeAction(ACTION_ID)
        action.onMessage = (msg, ctx) => pumpRef.current?.(msg, ctx.peerId)
        actionRef.current = action

        room.onPeerJoin = (peerId) => {
            const lobby = lobbyRef.current
            if(lobby?.hostId === selfId){
                if(lobby.players.length >= MAX_ONLINE_PLAYERS){
                    send({ t: MSG.REJECT, reason: 'That room is full — 8 players is the limit.' }, peerId)
                    return
                }
                // seated immediately with a free color; they can change it in the lobby
                editLobby(l => ({
                    ...l,
                    players: [...l.players, { id: peerId, color: freeColor(l.players), ready: false, dims: null }],
                }))
                return
            }
            // guests announce their screen size; only the host acts on it
            send({ t: MSG.HELLO, dims: handlers.current.getDims?.() }, peerId)
        }
        room.onPeerLeave = (peerId) => dropPeer(peerId)
        return room
    }, [send, editLobby, dropPeer, handlers])

    // ---- outbound / actions ----

    const host = useCallback(async (settings) => {
        try { await loadTrystero() }
        catch { patch({ error: "Couldn't load online play — check your connection and try again." }); return }
        const code = generateRoomCode()
        lobbyRef.current = {
            ...emptyLobby(selfId, settings),
            players: [{ id: selfId, color: PLAYERS[0].color, ready: true, dims: handlers.current.getDims?.() }],
        }
        try {
            wire(code)
        } catch {
            lobbyRef.current = null
            patch({ error: 'Could not start hosting. Try again.' })
            return
        }
        setNet({ active: true, connecting: false, code, isHost: true, error: null, lobby: { ...lobbyRef.current } })
    }, [wire, patch, handlers])

    const join = useCallback(async (rawCode) => {
        const code = normalizeRoomCode(rawCode)
        if(code.length !== ROOM_CODE_LENGTH){
            patch({ error: 'That code looks too short — check you typed it correctly.' })
            return
        }
        // show the joining state immediately; the module fetch is usually instant off cache
        patch({ connecting: true, error: null })
        try { await loadTrystero() }
        catch { patch({ connecting: false, error: "Couldn't load online play — check your connection and try again." }); return }
        try {
            wire(code)
        } catch {
            // clear connecting too, or the JOIN button stays stuck reading "JOINING…"
            patch({ connecting: false, error: 'Could not join that room. Try again.' })
            return
        }
        setNet({ active: true, connecting: true, code, isHost: false, error: null, lobby: null })
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            closeRoom()
            // the code is kept so the menu can offer it back rather than making them retype
            setNet({
                active: false, connecting: false, code, isHost: false, lobby: null,
                error: "Couldn't find that room — double check the code, or try again if you're behind a restrictive network.",
            })
        }, CONNECT_TIMEOUT_MS)
    }, [wire, patch, closeRoom])

    const pickColor = useCallback((color) => {
        const lobby = lobbyRef.current
        if(!lobby) return
        if(lobby.hostId === selfId) editLobby(l => ({ ...l, players: applyColorPick(l.players, selfId, color) }))
        else send({ t: MSG.PICK, color })
    }, [editLobby, send])

    const setReady = useCallback((ready) => {
        const lobby = lobbyRef.current
        if(!lobby) return
        if(lobby.hostId === selfId) editLobby(l => ({ ...l, players: l.players.map(p => p.id === selfId ? { ...p, ready } : p) }))
        else send({ t: MSG.READY, ready })
    }, [editLobby, send])

    const updateSettings = useCallback((next) => {
        editLobby(l => ({ ...l, settings: { ...l.settings, ...next } }))
    }, [editLobby])

    const kick = useCallback((peerId) => {
        send({ t: MSG.KICK }, peerId)
        editLobby(l => ({ ...l, players: l.players.filter(p => p.id !== peerId) }))
    }, [send, editLobby])

    // host only: freeze the roster, hand everyone the same match config
    const startMatch = useCallback(() => {
        const lobby = lobbyRef.current
        if(!lobby || lobby.hostId !== selfId) return null
        if(startBlocker(lobby.settings, lobby.players, lobby.hostId)) return null
        const { cols, rows } = matchDims(lobby.settings, lobby.players)
        const matchId = lobby.matchId + 1
        const config = {
            matchId,
            mode: lobby.settings.mode,
            size: lobby.settings.size, // drives the blitz clock, so everyone needs it
            cols, rows,
            players: lobby.players.map(p => ({ id: p.id, color: p.color })),
        }
        lobbyRef.current = { ...lobby, matchId, phase: 'match' }
        publishLobby()
        send({ t: MSG.START, ...config })
        return config
    }, [publishLobby, send])

    // host only: end the match and put everyone back in the lobby for the next one
    const returnToLobby = useCallback(() => {
        editLobby(l => ({
            ...l,
            phase: 'lobby',
            players: l.players.map(p => ({ ...p, ready: p.id === selfId })),
        }))
    }, [editLobby])

    const clearError = useCallback(() => patch({ error: null }), [patch])

    // The lobby as of right now, not as of the last commit. A message handler that
    // checks "is this really from the host?" has to use this: host migration updates
    // the lobby from inside a network callback, and the very next message can arrive
    // before React has re-rendered with the new hostId.
    const getLobby = useCallback(() => lobbyRef.current, [])

    // who this client is actually still connected to, right now
    const getPeerIds = useCallback(() => peerIds(), [peerIds])

    // leaving the tab mid-match shouldn't leave everyone else waiting on a ghost
    useEffect(() => {
        const onUnload = () => { try { actionRef.current?.send({ t: MSG.BYE }) } catch { /* best-effort */ } }
        window.addEventListener('beforeunload', onUnload)
        return () => {
            window.removeEventListener('beforeunload', onUnload)
            closeRoom()
            // the visible state has to come down with the room. In development React
            // runs this teardown between two mounts, and leaving `active` set would
            // leave the UI describing a room that no longer exists.
            setNet({ active: false, connecting: false, code: '', isHost: false, error: null, lobby: null })
        }
    }, [closeRoom])

    return {
        ...net,
        myId: selfId,
        send,
        host, join, leave, clearError, getLobby, getPeerIds,
        pickColor, setReady, updateSettings, kick, startMatch, returnToLobby,
    }
}
