import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react'
import './Board.css'
import drop from './drop.mp3'
import { playExplosion, playWin, playClick, playDenied } from './sounds'
import { criticalMass, neighbours, findUnstable, applyWave, orbCounts, legalMoves } from './engine'
import { chooseMove, PERSONAS, speak } from './ai'
import { TURN_SECONDS, computeMaxDims, makeBoard, playerByColor, sizeDims } from './constants'
import { MSG, ROOM_PARAM, boardChecksum, codeFromUrl, createOrderQueue, inviteText, inviteUrl } from './protocol'
import { useOnlineRoom } from './online'
import { manualInstallHint, useInstallPrompt } from './install'
import Home from './screens/Home'
import Lobby from './screens/Lobby'
import Win from './screens/Win'
import SettingsPanel from './screens/Settings'
import Tutorial from './screens/Tutorial'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const logMoveError = (e) => console.error('move failed:', e)

// read before anything strips it from the address bar, so the invite survives the
// cleanup React performs between its two development mounts
const INVITE_CODE = codeFromUrl()

// a stalled online player is played for by the host this long after their clock runs out
const WATCHDOG_GRACE_MS = 3000
// a gap in the move stream this old is treated as a lost message rather than a slow one
const RESYNC_AFTER_MS = 4000

// decorative ambient background — a field of drifting, occasionally-flaring orbs
// behind the menus. Positions/timings are fixed, not randomized.
const BG_ORBS = [
    { c: '#ff4655', top: '12%', left: '10%', size: 100, delay: '0s'    },
    { c: '#3df56e', top: '72%', left: '6%',  size: 64,  delay: '-3s'  },
    { c: '#4da6ff', top: '82%', left: '76%', size: 120, delay: '-6s'  },
    { c: '#ffd234', top: '8%',  left: '80%', size: 76,  delay: '-1.5s'},
    { c: '#b44dff', top: '38%', left: '92%', size: 54,  delay: '-4.5s'},
    { c: '#00e5ff', top: '54%', left: '48%', size: 140, delay: '-7.5s'},
    { c: '#ff4dd2', top: '22%', left: '42%', size: 58,  delay: '-2.5s'},
    { c: '#f2f2f2', top: '88%', left: '32%', size: 46,  delay: '-5.5s'},
]

const AmbientOrbs = () => (
    <div className='bgOrbField' aria-hidden='true'>
        {BG_ORBS.map((o,i) => (
            <span key={i} className='bgOrb' style={{
                '--c': o.c, '--size': `${o.size}px`, '--delay': o.delay,
                top: o.top, left: o.left,
            }} />
        ))}
    </div>
)

// memoized so a cell only re-renders when its own props change, not on every
// board-wide state update — onClick must stay a stable reference (see handleCellClick)
const Cell = memo(({ row, col, count, ownerColor, critical, exploding, invalid, onClick }) => {
    const n = Math.min(count, 3)
    return (
        <div className={invalid ? 'block invalid' : 'block'} onClick={() => onClick(row, col)}>
            {exploding && <span className='burst' />}
            {count > 0 &&
                <div className={critical ? 'cluster critical' : 'cluster'}>
                    {/* no key here — a key change would remount on every orb count change,
                        restarting the spin animation instead of letting it continue */}
                    <div className={`orbs n${n}`} style={{'--c':ownerColor}}>
                        {Array.from({length:n}).map((_,q) => <span key={q} className='orb' />)}
                    </div>
                </div>
            }
        </div>
    )
})

// stable shared reference for rows with no exploding cells, so they don't look
// "changed" to BoardRow's memo just because a new (still-empty) Set was created
const EMPTY_SET = new Set()

// memoized per row: rowCells only gets a new array reference when one of ITS
// cells actually changed (see the row-preserving updates in blockClickHandler),
// so a single click only walks/diffs the ~1-2 rows it touched, not the whole
// board — without this, every click re-creates all N cell elements even though
// Cell itself bails, because building those N element descriptors is real work
const BoardRow = memo(({ rowIndex, rowCells, criticalMassRow, explodingCols, invalidCol, onCellClick }) => (
    <div className='boardRow'>
        {rowCells.map((cell, colIndex) => (
            <Cell key={colIndex}
                row={rowIndex} col={colIndex}
                count={cell[0]} ownerColor={cell[1]}
                critical={cell[0] > 0 && cell[0] === criticalMassRow[colIndex] - 1}
                exploding={explodingCols.has(colIndex)}
                invalid={invalidCol === colIndex}
                onClick={onCellClick} />
        ))}
    </div>
))

const Board = () => {

    // sized on the first render rather than in a mount effect — deriving these after
    // mount made the board pop in a frame late, right as the menu was fading over it
    const [ MaxDims, setMaxDims ] = useState(computeMaxDims)
    const [ BoardColumns, setBoardColumns ] = useState(() => MaxDims.cols)
    const [ BoardRows, setBoardRows ] = useState(() => MaxDims.rows)
    const [ BoardArray, setBoardArray ] = useState(() => makeBoard(MaxDims.rows, MaxDims.cols))

    // the settings of the match being played — the menu keeps its own selections, so
    // an online host changing the mode no longer rewrites what you picked for local play
    const [ GameMode, setGameMode ] = useState('classic')
    const [ BoardSize, setBoardSize ] = useState('medium')
    const [ Difficulty, setDifficulty ] = useState('medium')

    const [ Players, setPlayers ] = useState([])
    const [ PlayerIds, setPlayerIds ] = useState([]) // peer ids, parallel to Players; empty offline
    const [ LeftColors, setLeftColors ] = useState([])
    const [ ShakeAmp, setShakeAmp ] = useState(0)
    const [ CurrentPlayer, setCurrentPlayer ] = useState(0)
    const [ Eliminated, setEliminated ] = useState([])
    const [ Winner, setWinner ] = useState(null)
    const [ Exploding, setExploding ] = useState(() => new Set())
    const [ MovesCount, setMovesCount ] = useState(0)
    const [ SuddenDeath, setSuddenDeath ] = useState(false)
    const [ OvertimeLeft, setOvertimeLeft ] = useState(0)
    const [ TimeLeft, setTimeLeft ] = useState(7)
    const [ showSettings, setShowSettings ] = useState(false)
    // only ever opened on request — landing on a wall of rules is a bad first impression
    const [ showTutorial, setShowTutorial ] = useState(false)
    const [ soundStatus, setSoundStatus ] = useState(localStorage.getItem('sound') || 'on')
    const [ Speech, setSpeech ] = useState(null)
    const [ Toast, setToast ] = useState(null)
    const [ InvalidCell, setInvalidCell ] = useState(null)
    const [ BoardScale, setBoardScale ] = useState(1)

    const processingRef = useRef(false)
    const movedRef = useRef({})
    const movesRef = useRef(0)
    const sdThresholdRef = useRef(999)
    const speechTimerRef = useRef(null)
    const eliminatedRef = useRef([])
    const overtimeRef = useRef(0)
    const suddenDeathRef = useRef(false)
    const turnSecsRef = useRef(7)
    const toastTimerRef = useRef(null)
    const invalidTimerRef = useRef(null)
    const dropPoolRef = useRef(null)
    const dropPoolIdxRef = useRef(0)

    // The match state a move needs, mirrored into refs. A move is animated, so several
    // can be applied back-to-back inside one tick (a remote move landing the instant a
    // local one finishes) — closures would still be holding the previous render's values.
    const boardArrayRef = useRef(BoardArray);      boardArrayRef.current = BoardArray
    const currentPlayerRef = useRef(CurrentPlayer); currentPlayerRef.current = CurrentPlayer
    const playersRef = useRef(Players);            playersRef.current = Players
    const playerIdsRef = useRef(PlayerIds);        playerIdsRef.current = PlayerIds
    const winnerRef = useRef(Winner);              winnerRef.current = Winner
    const gameModeRef = useRef(GameMode);          gameModeRef.current = GameMode
    const leftRef = useRef([])

    // ---- online ----
    const matchIdRef = useRef(0)
    const queueRef = useRef(null)
    if(!queueRef.current) queueRef.current = createOrderQueue()
    const pendingLeftRef = useRef([])
    const resyncTimerRef = useRef(null)
    const netHandlers = useRef({})
    const online = useOnlineRoom(netHandlers)
    const pwa = useInstallPrompt()

    const OnlineMatch = PlayerIds.length > 0
    const myIdx = OnlineMatch ? PlayerIds.indexOf(online.myId) : -1
    const inMatch = Players.length > 0

    useEffect(() => { localStorage.setItem('sound',soundStatus) },[soundStatus])

    // whichever overlay is up on the very first paint has to cover the board straight
    // away — fading in from transparent shows the empty board behind it for a beat.
    // Later mounts (returning to the menu, the win screen) still fade in normally.
    const firstPaintRef = useRef(true)
    useEffect(() => { firstPaintRef.current = false },[])
    const overlayInitial = { opacity: firstPaintRef.current ? 1 : 0 }

    // Escape closes the settings modal
    useEffect(() => {
        if(!showSettings) return
        const onKeyDown = (e) => { if(e.key === 'Escape') setShowSettings(false) }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    },[showSettings])

    // never touch BoardArray mid-game (would wipe orbs) — just scale it visually to fit
    useEffect(() => {
        const onResize = () => {
            const dims = computeMaxDims()
            setMaxDims(dims)
            if(Players.length === 0){
                setBoardColumns(dims.cols)
                setBoardRows(dims.rows)
                setBoardArray(makeBoard(dims.rows, dims.cols))
                setBoardScale(1)
            } else {
                setBoardScale(Math.min(1, dims.cols / BoardColumns, dims.rows / BoardRows))
            }
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    },[Players.length, BoardColumns, BoardRows])

    const commitBoard = (board) => {
        boardArrayRef.current = board
        setBoardArray(board)
    }

    // classic: last player standing; teams: last team standing
    const winnerOf = (alive) => {
        if(alive.length === 0) return null
        if(gameModeRef.current === 'teams'){
            const players = playersRef.current
            const teams = new Set(alive.map(p => players.indexOf(p) % 2))
            if(teams.size === 1){
                const t = [...teams][0]
                return { name: t === 0 ? 'TEAM ALPHA' : 'TEAM OMEGA', color: alive[0].color, members: alive }
            }
            return null
        }
        return alive.length === 1 ? alive[0] : null
    }

    // a player is out once they've made a move and own no orbs anymore — or once they
    // walked out of an online match, which skips their turn without clearing their orbs
    const aliveFrom = (counts) => playersRef.current.filter(p =>
        !leftRef.current.includes(p.color) && (!movedRef.current[p.color] || (counts[p.color] || 0) > 0))

    // a small round-robin pool lets rapid consecutive drops overlap instead of cutting off
    const playSound = (volume = 1) => {
        if(soundStatus !== 'on') return
        if(!dropPoolRef.current) dropPoolRef.current = Array.from({length: 4}, () => new Audio(drop))
        const pool = dropPoolRef.current
        const audio = pool[dropPoolIdxRef.current]
        dropPoolIdxRef.current = (dropPoolIdxRef.current + 1) % pool.length
        audio.currentTime = 0
        audio.volume = volume
        audio.play()
    }

    // gate the synthesized effects behind the sound setting
    const sfx = (fn, ...args) => soundStatus === 'on' && fn(...args)
    const menuSfx = (kind) => sfx(kind === 'denied' ? playDenied : playClick)

    const showToast = (text, color, ms = 2600) => {
        setToast({ text, color })
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setToast(null), ms)
    }

    const closeTutorial = () => setShowTutorial(false)

    // CPU speech bubble — `chance` lets frequent events stay occasional
    const botSay = (event, color, chance = 1) => {
        if(gameModeRef.current !== 'cpu') return
        if(Math.random() > chance) return
        const text = speak(Difficulty, event)
        if(!text) return
        setSpeech({ text, color, name: PERSONAS[Difficulty].name })
        clearTimeout(speechTimerRef.current)
        speechTimerRef.current = setTimeout(() => setSpeech(null), 3200)
    }

    const finishGame = (win) => {
        setShakeAmp(0)
        setExploding(new Set())
        const dead = playersRef.current.filter(p => !(win.members || [win]).includes(p)).map(p => p.color)
        eliminatedRef.current = dead
        setEliminated(dead)
        winnerRef.current = win
        setWinner(win)
        sfx(playWin)
        if(gameModeRef.current === 'cpu' && playersRef.current.length > 1){
            const humanWon = (win.members || [win]).includes(playersRef.current[0])
            botSay(humanWon ? 'lose' : 'win', humanWon ? playersRef.current[1].color : win.color)
        }
        processingRef.current = false
        queueRef.current.clear()
        pendingLeftRef.current = []
    }

    // ---- making a move -------------------------------------------------------
    // opts: scripted — not a human tap (cpu, blitz timeout, host watchdog)
    //       remote   — arrived from another player, so the turn checks are theirs
    //       broadcast— tell the other players about it
    const blockClickHandler = async (x, y, opts = {}) => {
        const { scripted = false, remote = false, broadcast = true } = opts
        const players = playersRef.current
        const current = currentPlayerRef.current
        if(processingRef.current || winnerRef.current || players.length === 0) return
        if(gameModeRef.current === 'cpu' && current !== 0 && !scripted) return // humans can't move for the CPU
        const ids = playerIdsRef.current
        const isOnline = ids.length > 0
        const mine = isOnline ? ids.indexOf(online.myId) : -1
        if(isOnline){
            if(!remote && current !== mine) return // not my turn
            if(remote && current === mine) return  // an echo of my own move — already applied
        }
        const player = players[current]
        const board0 = boardArrayRef.current
        const owner = board0[x][y][1]
        if(owner !== null && owner !== player.color){
            // the two boards disagree about ownership — a real desync, not a normal enemy click
            if(remote){ requestResync('owner mismatch'); return }
            // new players click enemy cells — show why nothing happened
            if(!scripted){
                setInvalidCell(`${x}-${y}`)
                sfx(playDenied)
                clearTimeout(invalidTimerRef.current)
                invalidTimerRef.current = setTimeout(() => setInvalidCell(null), 380)
            }
            return
        }

        processingRef.current = true
        // finally guarantees this resets even if something throws mid-move —
        // otherwise every future click would silently freeze
        try {
            playSound()
            movedRef.current[player.color] = true
            movesRef.current += 1
            setMovesCount(movesRef.current)
            if(isOnline && broadcast){
                // prevSum is this board as the mover saw it, before the move. Everyone
                // who has applied the same moves has the same board, so a receiver can
                // check agreement without either side waiting on an animation
                online.send({
                    t: MSG.MOVE, matchId: matchIdRef.current, seq: movesRef.current,
                    x, y, prevSum: boardChecksum(board0),
                })
            }

            // only the placed cell's row gets a new array reference — every other row
            // keeps its old reference so BoardRow's memo can skip untouched rows entirely
            let board = board0.map((row, i) => i === x ? row.map(cell => [...cell]) : row)
            board[x][y] = [board[x][y][0]+1, player.color]
            commitBoard(board)

            // per-color orb tally, updated incrementally wave-by-wave below instead of
            // rescanning the whole board every wave — a full orbCounts() pass is O(board
            // size), and on a large board that ran on every single wave of every chain
            let colorCounts = orbCounts(board)

            // chain waves get faster, louder and shakier the deeper they go
            let unstable = findUnstable(board, BoardRows, BoardColumns)
            let wave = 0
            while(unstable.length > 0){
                setExploding(new Set(unstable.map(([i,j]) => `${i}-${j}`)))
                setShakeAmp(Math.min(0.8 + wave * 0.6, 5))
                await sleep(Math.max(90, 220 - wave * 15))
                // cells touched this wave: exploding cells plus the neighbours they feed —
                // deduped (a cell can be fed by two exploding neighbours in the same wave)
                // so its pre-wave value is only snapshotted once, not clobbered mid-loop
                const touched = new Map()
                unstable.forEach(([i,j]) => {
                    touched.set(`${i},${j}`, [i,j])
                    neighbours(i, j, BoardRows, BoardColumns).forEach(([a,b]) => touched.set(`${a},${b}`, [a,b]))
                })
                const touchedRows = new Set([...touched.values()].map(([i]) => i))
                // copy [count,owner] out by value — board[i][j] is mutated in place by
                // applyWave below, so keeping a reference here would "snapshot" the after-state
                const preWave = new Map([...touched].map(([k,[i,j]]) => [k, [board[i][j][0], board[i][j][1]]]))

                unstable = applyWave(board, unstable, player.color, BoardRows, BoardColumns)

                touched.forEach(([i,j], key) => {
                    const [oldCount, oldOwner] = preWave.get(key)
                    const [newCount, newOwner] = board[i][j]
                    if(oldOwner) colorCounts[oldOwner] = (colorCounts[oldOwner] || 0) - oldCount
                    if(newOwner) colorCounts[newOwner] = (colorCounts[newOwner] || 0) + newCount
                })

                board = board.map((row, i) => touchedRows.has(i) ? [...row] : row)
                commitBoard(board)
                setExploding(new Set())
                sfx(playExplosion, wave)
                const win = winnerOf(aliveFrom(colorCounts))
                if(win) return finishGame(win)
                wave += 1
                if(wave > 250) break // safety net for saturated boards
            }
            setShakeAmp(0)

            const alive = aliveFrom(colorCounts)
            const deadColors = players.filter(p => !alive.includes(p)).map(p => p.color)
            const newlyDead = deadColors.filter(c => !eliminatedRef.current.includes(c) && !leftRef.current.includes(c))
            eliminatedRef.current = deadColors
            setEliminated(deadColors)
            const win = winnerOf(alive)
            if(win) return finishGame(win)

            if(gameModeRef.current === 'cpu'){
                const botDied = newlyDead.find(c => c !== players[0].color)
                const isBotMove = current !== 0
                if(newlyDead.includes(players[0].color)) showToast('YOU ARE OUT!', players[0].color)
                else if(botDied) botSay('eliminated', botDied)
                else if(isBotMove && wave >= 3) botSay('bigChain', player.color)
                else if(isBotMove) botSay('move', player.color, 0.25)
                else if(wave >= 3) botSay('humanBig', (alive.find(p => p !== players[0]) || player).color, 0.9)
            } else if(newlyDead.length > 0){
                const out = players.find(p => p.color === newlyDead[0])
                if(out) showToast(`${out.name} IS OUT!`, out.color)
            }

            // sudden death: long games go to overtime — when it runs out, most orbs wins
            if(gameModeRef.current === 'sudden'){
                if(!suddenDeathRef.current && movesRef.current >= sdThresholdRef.current){
                    suddenDeathRef.current = true
                    setSuddenDeath(true)
                    overtimeRef.current = players.length * 2
                    setOvertimeLeft(overtimeRef.current)
                    sfx(playExplosion, 5)
                } else if(suddenDeathRef.current){
                    overtimeRef.current = Math.max(0, overtimeRef.current - 1)
                    setOvertimeLeft(overtimeRef.current)
                    if(overtimeRef.current === 0){
                        const best = Math.max(...alive.map(p => colorCounts[p.color] || 0))
                        const leaders = alive.filter(p => (colorCounts[p.color] || 0) === best)
                        if(leaders.length === 1) return finishGame(leaders[0])
                        // tied — play on until someone takes the lead
                    }
                }
            }
            if(alive.length === 0) return // everyone is out at once — nobody to hand the turn to
            let next = current
            do {
                next = (next + 1) % players.length
            } while(!alive.includes(players[next]))
            currentPlayerRef.current = next
            setCurrentPlayer(next)
        } finally {
            processingRef.current = false
        }
        // whatever arrived while this move was animating can go in now
        drainRemote()
    }

    // stable ref to the latest blockClickHandler, so handleCellClick's identity never changes
    const blockClickHandlerRef = useRef(null)
    blockClickHandlerRef.current = blockClickHandler
    const handleCellClick = useCallback((x, y) => blockClickHandlerRef.current(x, y).catch(logMoveError), [])

    // ---- online match plumbing ----------------------------------------------

    // read live rather than from this render's props — host migration happens inside a
    // network callback, and the next message can land before React has re-rendered
    const hostId = () => online.getLobby()?.hostId
    const iAmHost = () => hostId() === online.myId

    const requestResync = (why) => {
        if(!playerIdsRef.current.length) return
        console.warn('online resync:', why)
        queueRef.current.clear()
        clearTimeout(resyncTimerRef.current)
        if(iAmHost()) return // the host's board is the reference — nothing to sync to
        online.send({ t: MSG.RESYNC, matchId: matchIdRef.current }, hostId())
    }

    const scheduleResync = () => {
        clearTimeout(resyncTimerRef.current)
        resyncTimerRef.current = setTimeout(() => requestResync('move never arrived'), RESYNC_AFTER_MS)
    }

    // a departed player keeps their orbs on the board (they stay capturable) but never
    // gets another turn. Applied at the seq the host announced, so every client drops
    // them at the same point in the move stream and turn order can't diverge.
    const applyLeft = (color) => {
        if(leftRef.current.includes(color)) return
        leftRef.current = [...leftRef.current, color]
        setLeftColors(leftRef.current)
        const who = playersRef.current.find(p => p.color === color)
        if(who) showToast(`${who.name} LEFT`, color)
        if(winnerRef.current) return
        const alive = aliveFrom(orbCounts(boardArrayRef.current))
        const win = winnerOf(alive)
        if(win) return finishGame(win)
        if(alive.length > 0 && !alive.includes(playersRef.current[currentPlayerRef.current])){
            let next = currentPlayerRef.current
            do {
                next = (next + 1) % playersRef.current.length
            } while(!alive.includes(playersRef.current[next]))
            currentPlayerRef.current = next
            setCurrentPlayer(next)
        }
    }

    // tell the room a player is gone, and act on it locally. Whoever notices first does
    // this — the announcement carries the barrier so everyone drops them at the same
    // point in the move stream even though they noticed at different times.
    const announceLeft = (color) => {
        if(!color || leftRef.current.includes(color) || !playerIdsRef.current.length) return
        online.send({ t: MSG.LEFT, matchId: matchIdRef.current, color, afterSeq: movesRef.current })
        pendingLeftRef.current.push({ color, afterSeq: movesRef.current })
        drainRemote()
    }

    const drainRemote = () => {
        if(processingRef.current || !playerIdsRef.current.length) return
        // barriers first: "this player is out as of move N" applies before move N+1
        if(pendingLeftRef.current.length > 0){
            const held = []
            pendingLeftRef.current.forEach(l => {
                if(l.afterSeq <= movesRef.current) applyLeft(l.color)
                else held.push(l)
            })
            pendingLeftRef.current = held
        }
        const next = queueRef.current.take(movesRef.current + 1)
        if(next){
            clearTimeout(resyncTimerRef.current)
            if(next.prevSum !== undefined && next.prevSum !== boardChecksum(boardArrayRef.current)){
                requestResync('boards disagree')
                return
            }
            blockClickHandlerRef.current(next.x, next.y, { scripted: true, remote: true, broadcast: false })
                .catch(logMoveError)
            return
        }
        if(queueRef.current.gapAt(movesRef.current)) scheduleResync()
    }

    const snapshot = () => ({
        t: MSG.STATE,
        matchId: matchIdRef.current,
        seq: movesRef.current,
        board: boardArrayRef.current,
        current: currentPlayerRef.current,
        eliminated: eliminatedRef.current,
        left: leftRef.current,
        moved: Object.keys(movedRef.current),
        sd: suddenDeathRef.current,
        ot: overtimeRef.current,
    })

    const applySnapshot = (s) => {
        queueRef.current.clear()
        pendingLeftRef.current = []
        clearTimeout(resyncTimerRef.current)
        movesRef.current = s.seq
        setMovesCount(s.seq)
        commitBoard(s.board.map(row => row.map(cell => [...cell])))
        currentPlayerRef.current = s.current
        setCurrentPlayer(s.current)
        eliminatedRef.current = s.eliminated
        setEliminated(s.eliminated)
        leftRef.current = s.left
        setLeftColors(s.left)
        movedRef.current = Object.fromEntries(s.moved.map(c => [c, true]))
        suddenDeathRef.current = s.sd
        setSuddenDeath(s.sd)
        overtimeRef.current = s.ot
        setOvertimeLeft(s.ot)
        setExploding(new Set())
        setShakeAmp(0)
    }

    const startOnlineMatch = (cfg) => {
        const players = cfg.players.map(p => playerByColor(p.color))
        if(players.some(p => !p)) return
        matchIdRef.current = cfg.matchId
        queueRef.current.clear()
        pendingLeftRef.current = []
        leftRef.current = []
        setLeftColors([])
        playerIdsRef.current = cfg.players.map(p => p.id)
        setPlayerIds(playerIdsRef.current)
        applyStart({ mode: cfg.mode, size: cfg.size, cols: cfg.cols, rows: cfg.rows, players })
    }

    // reassigned every render so the room's message pump never holds a stale closure
    netHandlers.current = {
        getDims: () => computeMaxDims(),
        onMatchMessage: (msg, fromId) => {
            if(msg.t === MSG.START){
                if(fromId !== hostId()) return // only the host starts matches
                startOnlineMatch(msg)
                return
            }
            if(msg.matchId !== matchIdRef.current) return // a message from a match we're not in
            switch(msg.t){
                case MSG.MOVE:
                    if(msg.seq <= movesRef.current) return // already applied
                    queueRef.current.add(msg.seq, msg)
                    drainRemote()
                    return
                case MSG.LEFT: {
                    // Any player in the match may report a drop, not just the host: a
                    // dead connection is noticed at wildly different moments by different
                    // peers (and sometimes never), so requiring one specific client to
                    // speak means a room can sit forever waiting on the one player who
                    // hasn't noticed. First report wins; applyLeft ignores repeats.
                    const seats = playerIdsRef.current
                    if(!seats.includes(fromId)) return
                    if(!playersRef.current.some(p => p.color === msg.color)) return
                    pendingLeftRef.current.push({ color: msg.color, afterSeq: msg.afterSeq })
                    drainRemote()
                    return
                }
                case MSG.RESYNC:
                    if(iAmHost()) online.send(snapshot(), fromId)
                    return
                case MSG.STATE:
                    if(fromId !== hostId()) return
                    applySnapshot(msg)
                    drainRemote()
                    return
                default:
                    return
            }
        },
        onPeerLeave: (peerId) => {
            const idx = playerIdsRef.current.indexOf(peerId)
            if(idx < 0) return // not in this match (someone waiting in the lobby)
            announceLeft(playersRef.current[idx]?.color)
        },
    }

    // ---- vs CPU: bots take their turns automatically ----
    // not dependent on BoardArray — that changes on every wave of any explosion, which
    // would re-arm this timer mid-chain instead of once per turn (reads via boardArrayRef instead)
    useEffect(() => {
        if(GameMode !== 'cpu' || Winner || Players.length === 0 || CurrentPlayer === 0) return
        const id = setTimeout(() => {
            if(processingRef.current) return
            const move = chooseMove(boardArrayRef.current, CurrentPlayer, Players, BoardRows, BoardColumns, Difficulty)
            if(move) blockClickHandlerRef.current(move[0], move[1], { scripted: true }).catch(logMoveError)
        }, 650)
        return () => clearTimeout(id)
    },[CurrentPlayer, Players, Winner, GameMode, BoardRows, BoardColumns, Difficulty])

    // ---- blitz: countdown per turn, timeout plays a random legal move ----
    useEffect(() => {
        if(GameMode !== 'blitz' || Winner || Players.length === 0) return
        setTimeLeft(turnSecsRef.current)
        const id = setInterval(() => {
            if(!processingRef.current) setTimeLeft(t => Math.max(0, t - 1))
        }, 1000)
        return () => clearInterval(id)
    },[CurrentPlayer, Players, Winner, GameMode])

    useEffect(() => {
        if(GameMode !== 'blitz' || Winner || Players.length === 0 || TimeLeft > 0) return
        // online: only the player whose turn it is plays their own timeout
        if(OnlineMatch && CurrentPlayer !== myIdx) return
        if(processingRef.current) return
        const moves = legalMoves(BoardArray, Players[CurrentPlayer].color)
        if(moves.length > 0){
            const [x, y] = moves[~~(Math.random() * moves.length)]
            blockClickHandlerRef.current(x, y, { scripted: true }).catch(logMoveError)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[TimeLeft])

    // A backgrounded tab doesn't run its own blitz clock, which would hang the match for
    // everyone. The host plays for whoever stalled, once, a few seconds past their time.
    useEffect(() => {
        if(!OnlineMatch || !online.isHost || GameMode !== 'blitz') return
        if(Winner || Players.length === 0 || CurrentPlayer === myIdx) return
        const id = setTimeout(() => {
            if(processingRef.current || winnerRef.current) return
            const stalled = playersRef.current[currentPlayerRef.current]
            const moves = legalMoves(boardArrayRef.current, stalled.color)
            if(moves.length === 0) return
            const [x, y] = moves[~~(Math.random() * moves.length)]
            blockClickHandlerRef.current(x, y, { scripted: true, remote: true, broadcast: true }).catch(logMoveError)
        }, turnSecsRef.current * 1000 + WATCHDOG_GRACE_MS)
        return () => clearTimeout(id)
    },[OnlineMatch, online.isHost, GameMode, Winner, Players, CurrentPlayer, myIdx])

    // A dropped connection isn't always reported — WebRTC can take tens of seconds to
    // give up, and sometimes the event never lands at all. If the match is waiting on
    // somebody who isn't in the room any more, say so instead of stalling forever.
    // Two strikes, so a momentary blip in the peer list can't evict a live player.
    useEffect(() => {
        if(!OnlineMatch || Winner || Players.length === 0 || CurrentPlayer === myIdx) return
        let strikes = 0
        const id = setInterval(() => {
            const seat = playerIdsRef.current[currentPlayerRef.current]
            if(!seat || seat === online.myId) return
            if(online.getPeerIds().includes(seat)){ strikes = 0; return }
            strikes += 1
            if(strikes >= 2) announceLeft(playersRef.current[currentPlayerRef.current]?.color)
        }, 3000)
        return () => clearInterval(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[OnlineMatch, Winner, Players, CurrentPlayer, myIdx])

    // ---- starting and ending games ------------------------------------------

    const applyStart = ({ mode, size, difficulty, cols, rows, players }) => {
        gameModeRef.current = mode
        setGameMode(mode)
        setBoardSize(size)
        if(difficulty) setDifficulty(difficulty)
        setBoardColumns(cols)
        setBoardRows(rows)
        commitBoard(makeBoard(rows, cols))
        setBoardScale(Math.min(1, MaxDims.cols / cols, MaxDims.rows / rows, 1))
        playersRef.current = players
        setPlayers(players)
        currentPlayerRef.current = 0
        setCurrentPlayer(0)
        eliminatedRef.current = []
        setEliminated([])
        winnerRef.current = null
        setWinner(null)
        setExploding(new Set())
        setShakeAmp(0)
        setMovesCount(0)
        suddenDeathRef.current = false
        setSuddenDeath(false)
        setOvertimeLeft(0)
        turnSecsRef.current = TURN_SECONDS[size] || 7
        setTimeLeft(turnSecsRef.current)
        movedRef.current = {}
        movesRef.current = 0
        overtimeRef.current = 0
        sdThresholdRef.current = Math.max(20, Math.round(rows * cols * 0.4))
        if(mode === 'cpu' && players.length > 1){
            const botColor = players[1].color
            setTimeout(() => {
                const text = speak(difficulty || Difficulty, 'start')
                if(text){
                    setSpeech({ text, color: botColor, name: PERSONAS[difficulty || Difficulty].name })
                    clearTimeout(speechTimerRef.current)
                    speechTimerRef.current = setTimeout(() => setSpeech(null), 3200)
                }
            }, 900)
        }
    }

    const startLocal = ({ mode, size, difficulty, players }) => {
        sfx(playClick)
        playerIdsRef.current = []
        setPlayerIds([])
        leftRef.current = []
        setLeftColors([])
        const { cols, rows } = sizeDims(size, MaxDims)
        applyStart({ mode, size, difficulty, cols, rows, players })
    }

    // clear the board back to a menu state, without touching the room
    const clearMatch = () => {
        playersRef.current = []
        setPlayers([])
        playerIdsRef.current = []
        setPlayerIds([])
        leftRef.current = []
        setLeftColors([])
        commitBoard(makeBoard(BoardRows, BoardColumns))
        currentPlayerRef.current = 0
        setCurrentPlayer(0)
        eliminatedRef.current = []
        setEliminated([])
        winnerRef.current = null
        setWinner(null)
        setExploding(new Set())
        setShakeAmp(0)
        setMovesCount(0)
        suddenDeathRef.current = false
        setSuddenDeath(false)
        setOvertimeLeft(0)
        setShowSettings(false)
        setSpeech(null)
        setToast(null)
        clearTimeout(speechTimerRef.current)
        clearTimeout(toastTimerRef.current)
        clearTimeout(resyncTimerRef.current)
        movedRef.current = {}
        movesRef.current = 0
        overtimeRef.current = 0
        processingRef.current = false
        queueRef.current.clear()
        pendingLeftRef.current = []
        matchIdRef.current = 0
    }

    // all the way out: leave any room too
    const leaveEverything = () => {
        if(online.active) online.leave()
        clearMatch()
    }

    // the host sending the room back to the lobby ends the match for everyone
    useEffect(() => {
        if(online.lobby?.phase === 'lobby' && playersRef.current.length > 0) clearMatch()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[online.lobby?.phase])

    // kicked, rejected, or the room otherwise closed under us
    useEffect(() => {
        if(!online.active && playerIdsRef.current.length > 0) clearMatch()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[online.active])

    const soundButtonHandler = () => {
        if(soundStatus === 'off'){
            new Audio(drop).play()
        }
        setSoundStatus(soundStatus === 'on' ? 'off' : 'on')
    }

    const share = () => {
        const data = {
            title: 'Chain Reaction',
            text: 'Check out this new Fun Multiplayer Game called Chain Reaction 😮',
            url: 'https://tarunspartan.github.io/chain-reaction',
        }
        if (navigator.share) {
            navigator.share(data).catch((error) => console.log('Error sharing', error))
        } else if (navigator.clipboard) {
            // desktop browsers without the Web Share API — copy the link instead
            navigator.clipboard.writeText(data.url)
                .then(() => showToast('LINK COPIED!', '#4da6ff'))
                .catch(() => showToast('COPY FAILED', '#ff4655'))
        }
    }

    const copyCode = (code) => {
        if(!navigator.clipboard) return
        navigator.clipboard.writeText(code)
            .then(() => showToast('CODE COPIED!', '#4da6ff'))
            .catch(() => showToast('COPY FAILED', '#ff4655'))
    }

    // hand the room to whichever app the player wants — the link carries the code, so
    // opening it lands them straight on the color picker in this lobby
    const shareRoom = (code) => {
        const url = inviteUrl(code)
        const text = inviteText(code)
        if(navigator.share){
            navigator.share({ title: 'Chain Reaction', text, url }).catch(() => { /* dismissed */ })
            return
        }
        if(navigator.clipboard){
            navigator.clipboard.writeText(`${text}\n${url}`)
                .then(() => showToast('INVITE COPIED!', '#00e5ff'))
                .catch(() => showToast('COPY FAILED', '#ff4655'))
        }
    }

    // Opened from an invite link: join that room, then drop the code from the address
    // bar so a later refresh doesn't drag us back into a finished match. The code is
    // captured at module load (see INVITE_CODE) because the URL is cleaned immediately,
    // and the pending invite is only forgotten once we're actually in a room.
    const inviteRef = useRef(INVITE_CODE)
    useEffect(() => {
        if(!inviteRef.current || online.active) return
        const code = inviteRef.current
        // Deferred by a tick on purpose. React's development double-mount would
        // otherwise join, tear the room down, and re-join the same room before the
        // first one had finished leaving — the relay ends up with a subscription
        // nobody can reach and the lobby never arrives. Scheduling instead means the
        // discarded first mount cancels cleanly and exactly one join ever happens.
        const id = setTimeout(() => {
            inviteRef.current = null
            const url = new URL(window.location.href)
            url.searchParams.delete(ROOM_PARAM)
            window.history.replaceState({}, '', url)
            online.join(code)
        }, 0)
        return () => clearTimeout(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[online.active])

    // one tap when the browser handed us a prompt; otherwise tell them where their
    // browser keeps it, which is the only thing left that actually helps
    const installApp = () => {
        pwa.install().then(outcome => {
            if(outcome === 'accepted') showToast('ADDING TO YOUR HOME SCREEN…', '#3df56e')
            else if(outcome === 'manual') showToast(manualInstallHint(), '#00e5ff', 6000)
        })
    }

    const hostStart = () => {
        const config = online.startMatch()
        if(config) startOnlineMatch(config)
    }

    // choosing your color is the readying-up gesture — it's the one thing a joiner
    // actually has to do, so it shouldn't also need a second confirming tap
    const pickColorAndReady = (color) => {
        online.pickColor(color)
        online.setReady(true)
    }

    // ---- render --------------------------------------------------------------

    const criticalMassGrid = useMemo(() => {
        if(!BoardRows || !BoardColumns) return []
        return Array.from({length: BoardRows}, (_,i) =>
            Array.from({length: BoardColumns}, (_,j) => criticalMass(i, j, BoardRows, BoardColumns)))
    },[BoardRows, BoardColumns])

    // exploding cells grouped by row, so a wave only breaks BoardRow's memo for the
    // handful of rows actually mid-explosion — rows with none reuse the same EMPTY_SET
    // reference every time, rather than every row seeing a "changed" Set prop
    const explodingByRow = useMemo(() => {
        if(Exploding.size === 0) return null
        const map = new Map()
        Exploding.forEach(key => {
            const [r, c] = key.split('-').map(Number)
            if(!map.has(r)) map.set(r, new Set())
            map.get(r).add(c)
        })
        return map
    },[Exploding])
    const [invalidRow, invalidColNum] = InvalidCell ? InvalidCell.split('-').map(Number) : [-1, -1]

    const currentColor = Players.length > 0 ? Players[CurrentPlayer].color : '#3a4566'

    const renderDot = (p) => {
        const i = Players.indexOf(p)
        const dot = (
            <span
                className={`playerDot${i === CurrentPlayer && !Winner ? ' active' : ''}${Eliminated.includes(p.color) ? ' dead' : ''}${LeftColors.includes(p.color) ? ' gone' : ''}`}
                style={{'--c':p.color}}
            />
        )
        // mark which dot is you — the human in vs-CPU, your own color online
        const isYou = (GameMode === 'cpu' && i === 0) || (OnlineMatch && i === myIdx)
        if(isYou){
            return <span key={p.color} className='youWrap'>{dot}<span className='youLabel'>you</span></span>
        }
        return <span key={p.color}>{dot}</span>
    }

    const turnBanner = () => {
        if(Players.length === 0 || Winner) return null
        if(GameMode === 'cpu'){
            return CurrentPlayer === 0
                ? <>YOUR TURN</>
                : <>{PERSONAS[Difficulty].name} IS THINKING<span className='thinkingDots'><i/><i/><i/></span></>
        }
        if(OnlineMatch) return CurrentPlayer === myIdx ? <>YOUR TURN</> : <>{Players[CurrentPlayer].name}'S TURN</>
        return <>{Players[CurrentPlayer].name}'S TURN</>
    }

    return (
        <div className='container' style={{'--turn':currentColor}}>
            <div className='ambientGlow' />
            {Players.length === 0 && <AmbientOrbs />}
            {inMatch && online.error &&
                <div className='onlineDisconnectBanner'>
                    <span>{online.error}</span>
                    <button className='menuBtn' onClick={leaveEverything}>main menu</button>
                </div>
            }
            {/* No match, no board. The menu scrim is translucent so the ambient orbs can
                drift behind it, which also meant an empty grid and the footer wordmark
                showed through every menu — and it was a few hundred DOM nodes rendered
                for something nobody was playing. */}
            {inMatch &&
            <div className='centerDiv'>
                <div className='turnBanner' style={{'--c':currentColor}}>
                    {turnBanner()}
                    {Players.length > 0 && !Winner && MovesCount === 0 &&
                        <span className='firstHint'>tap an empty cell to drop an orb</span>
                    }
                </div>
                {/* outer reserves the actual (scaled) layout space; inner applies the pure fit-to-viewport
                    scale so it never fights with boardFrame's own shake transform during chain reactions */}
                <div className='boardScaler' style={{ width: BoardColumns*50*BoardScale, height: BoardRows*50*BoardScale }}>
                <div className='boardScaleInner' style={{ width: BoardColumns*50, height: BoardRows*50, transform: `scale(${BoardScale})`, transformOrigin: 'top left' }}>
                <div className={ShakeAmp > 0 ? 'boardFrame shaking' : 'boardFrame'} style={{'--amp':`${ShakeAmp}px`, width: BoardColumns*50}}>
                {
                    BoardArray.map((row,rowindex) => (
                        <BoardRow key={rowindex}
                            rowIndex={rowindex}
                            rowCells={row}
                            criticalMassRow={criticalMassGrid[rowindex]}
                            explodingCols={explodingByRow?.get(rowindex) || EMPTY_SET}
                            invalidCol={rowindex === invalidRow ? invalidColNum : -1}
                            onCellClick={handleCellClick} />
                    ))
                }
                </div>
                </div>
                </div>
                <div className='hud' style={{ width: BoardColumns*50*BoardScale }}>
                    {GameMode === 'blitz' && Players.length > 0 && !Winner &&
                        <div className='timerWrap'>
                            <div className='timerBar' style={{width:`${(TimeLeft/turnSecsRef.current)*100}%`, backgroundColor:currentColor}} />
                        </div>
                    }
                    {GameMode === 'sudden' && Players.length > 0 && !Winner &&
                        (SuddenDeath
                            ? <div className='sdLabel active'><span role='img' aria-label='skull'>☠</span> SUDDEN DEATH — {OvertimeLeft > 0 ? `most orbs wins in ${OvertimeLeft} moves` : 'tied! next lead wins'} <span role='img' aria-label='skull'>☠</span></div>
                            : <div className='sdLabel'>sudden death in {Math.max(0, sdThresholdRef.current - MovesCount)} moves</div>)
                    }
                    {Players.length > 0 &&
                        <div className='playerStatus'>
                            {GameMode === 'teams' ? <>
                                {Players.filter((_,i) => i % 2 === 0).map(renderDot)}
                                <span className='vsLabel'>vs</span>
                                {Players.filter((_,i) => i % 2 === 1).map(renderDot)}
                            </> : Players.map(renderDot)}
                        </div>
                    }
                    <div className='bottomBar'>
                        <div className='footerTitle'>CHAIN<span className='footerDot'>•</span>REACTION</div>
                    </div>
                </div>
            </div>
            }
            <button className='settingsIcon' onClick={() => setShowSettings(true)} aria-label='settings'>&#x2699;</button>
            <LazyMotion features={domAnimation} strict>
                <AnimatePresence>
                    {!inMatch && !online.active && !showTutorial &&
                        <Home key='start'
                            initial={overlayInitial}
                            sfx={menuSfx}
                            connecting={online.connecting}
                            error={online.error}
                            initialCode={online.code}
                            onDismissError={online.clearError}
                            onStartLocal={startLocal}
                            onHost={online.host}
                            onJoin={online.join}
                            canInstall={pwa.canInstall}
                            onInstall={installApp}
                            onHowTo={() => setShowTutorial(true)} />
                    }
                    {!inMatch && online.active &&
                        <Lobby key='lobby'
                            lobby={online.lobby}
                            myId={online.myId}
                            isHost={online.isHost}
                            code={online.code}
                            connecting={online.connecting}
                            error={online.error}
                            sfx={menuSfx}
                            onPick={pickColorAndReady}
                            onReady={online.setReady}
                            onKick={online.kick}
                            onSettings={online.updateSettings}
                            onStart={hostStart}
                            onLeave={leaveEverything}
                            onCopy={copyCode}
                            onShare={shareRoom} />
                    }
                    {Winner &&
                        <Win key='win'
                            winner={Winner}
                            isOnline={OnlineMatch}
                            isHost={online.isHost}
                            onPlayAgain={clearMatch}
                            onNextMatch={online.returnToLobby}
                            onLeaveRoom={leaveEverything} />
                    }
                    {showSettings &&
                        <SettingsPanel key='settings'
                            soundOn={soundStatus === 'on'}
                            inMatch={inMatch}
                            inRoom={online.active}
                            canInstall={pwa.canInstall}
                            onInstall={() => {installApp(); setShowSettings(false)}}
                            onToggleSound={soundButtonHandler}
                            onLeave={leaveEverything}
                            onTutorial={() => {setShowTutorial(true); setShowSettings(false)}}
                            onShare={share}
                            onClose={() => setShowSettings(false)} />
                    }
                    {showTutorial &&
                        <Tutorial key='tutorial' initial={overlayInitial} onClose={closeTutorial} />
                    }
                </AnimatePresence>
                <AnimatePresence>
                    {Speech &&
                        <m.div className='speechBubble' key={Speech.text} style={{'--c':Speech.color}}
                            initial={{opacity:0, y:14, scale:0.9}} animate={{opacity:1, y:0, scale:1}}
                            exit={{opacity:0, y:-10}} transition={{type:'spring', stiffness:320, damping:22}}>
                            <span className='speechName'>{Speech.name}</span>
                            {Speech.text}
                        </m.div>
                    }
                </AnimatePresence>
                <AnimatePresence>
                    {Toast &&
                        <m.div className='speechBubble toast' key={Toast.text} style={{'--c':Toast.color}}
                            initial={{opacity:0, y:14, scale:0.9}} animate={{opacity:1, y:0, scale:1}}
                            exit={{opacity:0, y:-10}} transition={{type:'spring', stiffness:320, damping:22}}>
                            {Toast.text}
                        </m.div>
                    }
                </AnimatePresence>
            </LazyMotion>
        </div>
    )
}

export default Board
