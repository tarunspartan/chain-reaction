import React from 'react'
import { m } from 'motion/react'
import { BOARD_SIZES, MAX_ONLINE_PLAYERS, ONLINE_MODES, PLAYERS, playerByColor, spring } from '../constants'
import { startBlocker } from '../protocol'

// One screen for the whole online session: it's where you wait for the first match and
// where everyone lands between matches, so a rematch is just "host presses start again"
// — with the mode and size still changeable, and everyone re-readying.
const Lobby = ({ lobby, myId, isHost, code, connecting, error, sfx,
                 onPick, onReady, onKick, onSettings, onStart, onLeave, onCopy, onShare }) => {

    if(connecting || !lobby){
        return (
            <m.div className='overlay' key='lobby'
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}>
                <m.div className='gameTitle' initial={{y:-40,opacity:0}} animate={{y:0,opacity:1}} transition={spring}>
                    CHAIN<span className='titleAccent'>REACTION</span>
                </m.div>
                <div className='tagline'>joining {code}</div>
                <div className='hint'>looking for the room…</div>
                <m.button className='sizeBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onLeave}>
                    cancel
                </m.button>
            </m.div>
        )
    }

    const me = lobby.players.find(p => p.id === myId)
    const blocker = startBlocker(lobby.settings, lobby.players, lobby.hostId)
    const matchRunning = lobby.phase === 'match'
    const iAmReady = isHost || !!me?.ready

    return (
        <m.div className='overlay' key='lobby'
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}>
            <m.div className='gameTitle small' initial={{y:-40,opacity:0}} animate={{y:0,opacity:1}} transition={spring}>
                CHAIN<span className='titleAccent'>REACTION</span>
            </m.div>

            {error && <div className='onlineErrorBanner'>{error}</div>}

            <div className='codeStrip'>
                <span className='codeStripLabel'>room code</span>
                <button className='codeStripValue' onClick={() => onCopy(code)} title='copy the code'>{code}</button>
                <m.button className='inviteBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                    onClick={() => {sfx(); onShare(code)}} title='send an invite link'>
                    <span role='img' aria-label='link'>🔗</span>&nbsp;INVITE
                </m.button>
            </div>

            {matchRunning &&
                <div className='hint'>a match is already running — you're in for the next one</div>
            }

            <div className='tagline'>players&nbsp;&nbsp;{lobby.players.length} / {MAX_ONLINE_PLAYERS}</div>
            <div className='lobbyList'>
                {lobby.players.map(p => (
                    <m.div className='lobbyRow' key={p.id}
                        initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{duration:0.18}}>
                        <span className='playerDot' style={{'--c':p.color}} />
                        <span className='lobbyName'>{playerByColor(p.color)?.name ?? '—'}</span>
                        {p.id === myId && <span className='lobbyTag you'>you</span>}
                        {p.id === lobby.hostId
                            ? <span className='lobbyTag host'>host</span>
                            : <span className={`lobbyTag${p.ready ? ' ready' : ''}`}>{p.ready ? 'ready' : 'waiting'}</span>}
                        {isHost && p.id !== myId &&
                            <button className='kickBtn' onClick={() => {sfx(); onKick(p.id)}} aria-label={`remove ${playerByColor(p.color)?.name}`}>✕</button>}
                    </m.div>
                ))}
            </div>

            <div className='tagline'>{iAmReady ? 'your color' : 'pick your color'}</div>
            {/* Taken colors keep their color — dimmed and ringed, with the owner's name
                on hover — so you can still see what everyone is on. A grey blank told
                you nothing except that you couldn't have it. */}
            <div className={`colorGrid${iAmReady ? '' : ' awaiting'}`}>
                {PLAYERS.map(p => {
                    const mine = me?.color === p.color
                    const owner = lobby.players.find(q => q.color === p.color && q.id !== myId)
                    return (
                        <m.button key={p.color} className={`colorChip${mine ? ' picked' : ''}${owner ? ' taken' : ''}`}
                            style={{'--c':p.color}}
                            whileHover={owner ? undefined : {scale:1.12}} whileTap={owner ? undefined : {scale:0.9}}
                            disabled={!!owner}
                            onClick={() => {sfx(); onPick(p.color)}}
                            title={owner ? `${p.name} — taken` : p.name}
                            aria-label={`${p.name}${owner ? ' (taken)' : ''}`}>
                            {owner && <span className='chipTaken' aria-hidden='true' />}
                        </m.button>
                    )
                })}
            </div>

            <div className='tagline'>match settings</div>
            {isHost ? <>
                <div className='sizeRow modeRow'>
                    {ONLINE_MODES.map(opt => (
                        <m.button key={opt.id} className={`sizeBtn${lobby.settings.mode === opt.id ? ' selected' : ''}`}
                            whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                            onClick={() => {sfx(); onSettings({ mode: opt.id })}}>
                            {opt.label}
                        </m.button>
                    ))}
                </div>
                <div className='sizeRow'>
                    {BOARD_SIZES.map(s => (
                        <m.button key={s} className={`sizeBtn${lobby.settings.size === s ? ' selected' : ''}`}
                            whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                            onClick={() => {sfx(); onSettings({ size: s })}}>
                            {s}
                        </m.button>
                    ))}
                </div>
            </> : (
                <div className='hint'>{lobby.settings.mode}&nbsp;&nbsp;•&nbsp;&nbsp;{lobby.settings.size} board&nbsp;&nbsp;•&nbsp;&nbsp;set by the host</div>
            )}

            <div className='startRow'>
                <m.button className='sizeBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onLeave}>
                    leave
                </m.button>
                {isHost
                    ? <m.button className={`neonBtn startBtn${blocker ? ' incomplete' : ''}`}
                        whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                        onClick={() => {sfx(); onStart()}} disabled={!!blocker}>
                        {matchRunning ? 'RESTART' : 'START MATCH'}
                    </m.button>
                    : <m.button className={`neonBtn startBtn readyBtn${me?.ready ? ' isReady' : ' waiting'}`}
                        whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                        onClick={() => {sfx(); onReady(!me?.ready)}}>
                        {me?.ready ? "I'M READY ✓" : 'READY UP'}
                    </m.button>}
            </div>
            <div className='hint lobbyStatus'>
                {isHost
                    ? (blocker || 'everyone is ready — start when you are')
                    : (me?.ready ? 'waiting for the host to start' : 'tap a color to ready up')}
            </div>
        </m.div>
    )
}

export default Lobby
