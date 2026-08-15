import React, { useRef, useState } from 'react'
import { m } from 'motion/react'
import {
    BOARD_SIZES, DIFFICULTIES, MAX_ONLINE_PLAYERS, MODES, PLAYERS, TURN_SECONDS, spring,
} from '../constants'
import { ROOM_CODE_LENGTH, tabFromUrl } from '../protocol'

const TABS = [
    { id: 'local',  label: 'local'  },
    { id: 'online', label: 'online' },
]

// local and online are the same size choice, not a headline act and a footnote —
// hence a segmented pair rather than the outsized call-to-action this used to lead with
const SegTabs = ({ value, onChange }) => (
    <m.div className='segTabs' role='tablist'
        initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{...spring, delay:0.1}}>
        {TABS.map(tab => (
            <button key={tab.id} role='tab' aria-selected={value === tab.id}
                className={`segTab${value === tab.id ? ' active' : ''}`}
                onClick={() => onChange(tab.id)}>
                {tab.label}
            </button>
        ))}
    </m.div>
)

// The panels are stacked in one grid cell rather than swapped in and out, so the menu
// is always as tall as its tallest panel. Nothing above or below it moves when you
// change tabs — the title doesn't glide to a new position, it simply never leaves the
// old one. Only the panels themselves cross-fade, which CSS can do on its own.
const PANELS = ['local', 'online', 'colors']

const panelProps = (id, activeId) => {
    const idx = PANELS.indexOf(id)
    const active = id === activeId
    return {
        className: `menuPanel${active ? ' active' : ''}`,
        'aria-hidden': !active,
        // resting offset: panels to the left of the active one wait off to the left,
        // so whichever way you move, the incoming panel slides in from its own side
        style: { '--off': active ? '0px' : (idx < PANELS.indexOf(activeId) ? '-24px' : '24px') },
    }
}

const Home = ({ initial, sfx, onStartLocal, onHost, onJoin, onHowTo, connecting, error, initialCode,
                onDismissError, canInstall, onInstall }) => {
    // ?tab=online wins over the remembered choice — it's the installed app's shortcut
    const [ tab, setTab ] = useState(() => tabFromUrl() || localStorage.getItem('menuTab') || 'local')
    const [ mode, setMode ] = useState(() => localStorage.getItem('gameMode') || 'classic')
    const [ size, setSize ] = useState(() => localStorage.getItem('boardSize') || 'medium')
    const [ difficulty, setDifficulty ] = useState(() => localStorage.getItem('difficulty') || 'medium')
    const [ count, setCount ] = useState(null)
    const [ colors, setColors ] = useState([])
    const [ denied, setDenied ] = useState(false)
    // a failed join comes back here with the code it tried, so it can be fixed rather than retyped
    const [ codeInput, setCodeInput ] = useState(initialCode || '')
    const deniedTimerRef = useRef(null)

    const pick = (setter, key) => (value) => {
        sfx()
        localStorage.setItem(key, value)
        setter(value)
    }
    const chooseTab = (next) => {
        if(next === tab) return
        pick(setTab, 'menuTab')(next)
    }
    // which of the three stacked panels is showing
    const activePanel = count !== null ? 'colors' : tab
    const chooseMode = pick(setMode, 'gameMode')
    const chooseSize = pick(setSize, 'boardSize')
    const chooseDifficulty = pick(setDifficulty, 'difficulty')

    const chooseCount = (n) => {
        sfx()
        setCount(n)
        setColors([]) // start empty — players pick their own colors
    }

    const toggleColor = (p) => {
        sfx()
        setColors(prev => {
            if(prev.includes(p)) return prev.filter(x => x !== p)
            if(count === 1) return [p] // single-slot pick — swap instead of deselect-then-reselect
            if(prev.length >= count) return prev
            return [...prev, p]
        })
    }

    const start = () => {
        if(colors.length !== count){
            sfx('denied')
            setDenied(true)
            clearTimeout(deniedTimerRef.current)
            deniedTimerRef.current = setTimeout(() => setDenied(false), 320)
            return
        }
        onStartLocal({ mode, size, difficulty, players: colors })
    }

    const countOptions = mode === 'teams' ? [4,6,8] : [2,3,4,5,6,7,8]

    const colorHint = mode === 'cpu' ? 'your first pick is you — the cpu plays the rest'
        : mode === 'teams' ? 'odd picks are team alpha • even picks are team omega'
        : 'turn order follows your picks'

    const modeHint = mode === 'cpu' ? 'you vs the machine — bots take the other colors'
        : mode === 'blitz' ? `move within ${TURN_SECONDS[size] || 7} seconds or a random cell is played for you`
        : mode === 'sudden' ? 'long games go to overtime — most orbs wins'
        : mode === 'teams' ? 'two teams — eliminate the other side together'
        : 'pass & play  •  each player gets a color  •  last one standing wins'

    const localSetup = (
        <div {...panelProps('local', activePanel)}>
            <div className='tagline'>game mode</div>
            <div className='sizeRow modeRow'>
                {MODES.map((opt,idx) => (
                    <m.button key={opt.id} className={`sizeBtn${mode === opt.id ? ' selected' : ''}`}
                        initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{...spring, delay:idx*0.03}}
                        whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                        onClick={() => chooseMode(opt.id)}>
                        {opt.label}
                    </m.button>
                ))}
            </div>
            {/* right under the mode buttons, where it reads as a description of the one
                you just picked — at the bottom of the screen it looked like a footnote */}
            <div className='modeHint' key={mode}>{modeHint}</div>
            {/* always rendered (never conditionally mounted/unmounted) so its real height
                is always reserved — switching in and out of vs-cpu mode must not shift
                the board-size/player-count controls below it up or down */}
            <div className='sizeRow' aria-hidden={mode !== 'cpu'} style={mode !== 'cpu' ? {visibility:'hidden'} : undefined}>
                {DIFFICULTIES.map(d => (
                    <m.button key={d} className={`diffBtn${difficulty === d ? ' selected' : ''}`}
                        tabIndex={mode === 'cpu' ? 0 : -1}
                        whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                        onClick={() => { if(mode === 'cpu') chooseDifficulty(d) }}>
                        {d}
                    </m.button>
                ))}
            </div>
            <div className='tagline'>board size</div>
            <div className='sizeRow'>
                {BOARD_SIZES.map((s,idx) => (
                    <m.button key={s} className={`sizeBtn${size === s ? ' selected' : ''}`}
                        initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{...spring, delay:idx*0.03}}
                        whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                        onClick={() => chooseSize(s)}>
                        {s}
                    </m.button>
                ))}
            </div>
            <div className='tagline'>how many players?</div>
            <div className='countRow'>
                {countOptions.map((n,idx) => (
                    <m.button key={n} className='countBtn'
                        initial={{scale:0}} animate={{scale:1}} transition={{...spring, delay:idx*0.04}}
                        whileHover={{scale:1.15}} whileTap={{scale:0.9}}
                        onClick={() => chooseCount(n)}>
                        {n}
                    </m.button>
                ))}
            </div>
        </div>
    )

    const colorPick = (
        <div {...panelProps('colors', activePanel)}>
            <div className='tagline'>pick your colors&nbsp;&nbsp;—&nbsp;&nbsp;{colors.length} / {count}</div>
            <div className='colorGrid'>
                {PLAYERS.map((p,idx) => {
                    const order = colors.indexOf(p)
                    return (
                        <m.button key={p.color} className={`colorChip${order >= 0 ? ' picked' : ''}`} style={{'--c':p.color}}
                            initial={{scale:0}} animate={{scale:1}} transition={{...spring, delay:idx*0.03}}
                            whileHover={{scale:1.12}} whileTap={{scale:0.9}}
                            onClick={() => toggleColor(p)}
                            aria-label={p.name}>
                            {order >= 0 ? order+1 : ''}
                        </m.button>
                    )
                })}
            </div>
            <div className='hint'>{colorHint}</div>
            <div className='startRow'>
                <m.button className='sizeBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                    onClick={() => {sfx(); setCount(null)}}>
                    back
                </m.button>
                <m.button className={`neonBtn startBtn${colors.length !== count ? ' incomplete' : ''}${denied ? ' denied' : ''}`}
                    whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                    onClick={start}>
                    START
                </m.button>
            </div>
        </div>
    )

    const onlineSetup = (
        <div {...panelProps('online', activePanel)}>
            <div className='tagline'>play with friends</div>
            <div className='hint onlineBlurb'>
                up to {MAX_ONLINE_PLAYERS} players  •  share a link or a {ROOM_CODE_LENGTH}-character code
            </div>
            <m.button className='neonBtn hostBtn' style={{'--c':'#00e5ff'}}
                whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                onClick={() => {sfx(); onHost({ mode: mode === 'cpu' ? 'classic' : mode, size })}}
                disabled={connecting}>
                HOST A ROOM
            </m.button>
            <div className='divider'>or join one</div>
            <div className='joinRow'>
                <input className='codeBox editable compact' value={codeInput} maxLength={ROOM_CODE_LENGTH}
                    onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); if(error) onDismissError() }}
                    onKeyDown={(e) => { if(e.key === 'Enter' && codeInput.trim()) onJoin(codeInput) }}
                    placeholder='CODE' aria-label='room code' />
                <m.button className='neonBtn startBtn' whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                    onClick={() => {sfx(); onJoin(codeInput)}} disabled={!codeInput.trim() || connecting}>
                    {connecting ? 'JOINING…' : 'JOIN'}
                </m.button>
            </div>
            {error && <div className='onlineErrorBanner'>{error}</div>}
        </div>
    )

    return (
        <m.div className='overlay' key='start'
            initial={initial} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}>
            <m.div className='gameTitle'
                initial={{y:-50,opacity:0}} animate={{y:0,opacity:1}} transition={{...spring, delay:0.05}}>
                CHAIN<span className='titleAccent'>REACTION</span>
            </m.div>
            {/* kept mounted on the color step and merely hidden, so the row it occupies
                is reserved exactly — a min-height guess was 4px out and nudged the title */}
            <div className='segTabsSlot' aria-hidden={count !== null}
                style={count === null ? undefined : {visibility:'hidden'}}>
                <SegTabs value={tab} onChange={chooseTab} />
            </div>
            {/* all three panels live in the same grid cell, so the stage is always as
                tall as the tallest one and switching between them moves nothing else */}
            <div className='menuStage'>
                {localSetup}
                {onlineSetup}
                {colorPick}
            </div>
            <div className='startRow howToRow' style={count === null ? undefined : {visibility:'hidden'}}>
                <m.button className='howToBtn' tabIndex={count === null ? 0 : -1}
                    whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                    onClick={() => {sfx(); onHowTo()}}>
                    <span role='img' aria-label='question'>❓</span>&nbsp;how to play
                </m.button>
                {canInstall &&
                    <m.button className='howToBtn installChip' tabIndex={count === null ? 0 : -1}
                        initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} transition={spring}
                        whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                        onClick={() => {sfx(); onInstall()}}>
                        <span role='img' aria-label='install'>⬇</span>&nbsp;add to home screen
                    </m.button>
                }
            </div>
        </m.div>
    )
}

export default Home
