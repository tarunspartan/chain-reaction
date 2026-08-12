import React, { useEffect, useState, useRef } from 'react'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react'
import './Board.css'
import drop from './drop.mp3'
import { playExplosion, playWin, playClick, playDenied } from './sounds'
import { criticalMass, neighbours, cloneBoard, findUnstable, applyWave, orbCounts, legalMoves } from './engine'
import { chooseMove, PERSONAS, speak } from './ai'
import { encodeBlob, decodeBlob, createHostConnection, createGuestConnection, createOffer, createAnswer, waitForDataChannel } from './webrtc'

const PLAYERS = [
    { name: 'CRIMSON', color: '#ff4655' },
    { name: 'EMERALD', color: '#3df56e' },
    { name: 'AZURE',   color: '#4da6ff' },
    { name: 'GOLD',    color: '#ffd234' },
    { name: 'VIOLET',  color: '#b44dff' },
    { name: 'CYAN',    color: '#00e5ff' },
    { name: 'PINK',    color: '#ff4dd2' },
    { name: 'IVORY',   color: '#f2f2f2' },
]

const BOARD_SIZES = ['small', 'medium', 'large']

const MODES = [
    { id: 'classic', label: 'classic' },
    { id: 'cpu',     label: 'vs cpu' },
    { id: 'blitz',   label: 'blitz' },
    { id: 'sudden',  label: 'sudden death' },
    { id: 'teams',   label: 'teams' },
]

// online play is 2 players only — cpu (local-only) and teams (needs 4+) don't apply
const ONLINE_MODES = MODES.filter(m => m.id !== 'cpu' && m.id !== 'teams')

const DIFFICULTIES = ['easy', 'medium', 'hard']

const TURN_SECONDS = { small: 5, medium: 7, large: 10 }

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const spring = { type: 'spring', stiffness: 320, damping: 22 }

// small static board used for the tutorial diagrams
const MiniBoard = ({ cells }) => (
    <div className='miniBoard'>
        {Array.from({length:3}).map((_,r) => (
            <div className='miniRow' key={r}>
                {Array.from({length:3}).map((_,c) => {
                    const cell = cells.find(x => x.r === r && x.c === c)
                    return (
                        <div className='miniCell' key={c}>
                            {cell &&
                                <div className={cell.critical ? 'cluster critical' : 'cluster'}>
                                    <div className={`orbs n${cell.n}`} style={{'--c':cell.color}}>
                                        {Array.from({length:cell.n}).map((_,q) => <span key={q} className='orb' />)}
                                    </div>
                                </div>
                            }
                        </div>
                    )
                })}
            </div>
        ))}
    </div>
)

const Board = () => {

    const [ BoardArray, setBoardArray ] = useState([])
    const [ BoardColumns, setBoardColumns ] = useState(0)
    const [ BoardRows, setBoardRows ] = useState(0)
    const [ MaxDims, setMaxDims ] = useState({ cols: 0, rows: 0 })
    const [ BoardSize, setBoardSize ] = useState(localStorage.getItem('boardSize') || 'medium')
    const [ GameMode, setGameMode ] = useState(localStorage.getItem('gameMode') || 'classic')
    const [ Difficulty, setDifficulty ] = useState(localStorage.getItem('difficulty') || 'medium')
    const [ Players, setPlayers ] = useState([])
    const [ SelectedCount, setSelectedCount ] = useState(null)
    const [ SelectedColors, setSelectedColors ] = useState([])
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
    const [ showTutorial, setShowTutorial ] = useState(false)
    const [ soundStatus, setSoundStatus ] = useState(localStorage.getItem('sound') || 'on')
    const [ Speech, setSpeech ] = useState(null)
    const [ Toast, setToast ] = useState(null)
    const [ InvalidCell, setInvalidCell ] = useState(null)
    const [ StartDenied, setStartDenied ] = useState(false)
    const [ BoardScale, setBoardScale ] = useState(1)

    // ---- online play (WebRTC, manual copy/paste signaling) ----
    const [ OnlineRole, setOnlineRole ] = useState(null) // null | 'host' | 'guest'
    const [ OnlineStage, setOnlineStage ] = useState(null) // null | 'role-select' | 'config' | 'code-exchange' | 'pick-color' | 'connecting'
    const [ OfferCode, setOfferCode ] = useState('')
    const [ AnswerCode, setAnswerCode ] = useState('')
    const [ PasteInput, setPasteInput ] = useState('')
    const [ HostPreview, setHostPreview ] = useState(null) // {mode,cols,rows,hostName,hostColor}
    const [ ConnectionState, setConnectionState ] = useState('connecting') // 'connecting' | 'connected' | 'disconnected'
    const [ OnlineError, setOnlineError ] = useState(null)
    const [ MyRematchReady, setMyRematchReady ] = useState(false)
    const [ TheirRematchReady, setTheirRematchReady ] = useState(false)

    const processingRef = useRef(false)
    const movedRef = useRef({})
    const movesRef = useRef(0)
    const sdThresholdRef = useRef(999)
    const speechTimerRef = useRef(null)
    const eliminatedRef = useRef([])
    const overtimeRef = useRef(0)
    const turnSecsRef = useRef(7)
    const toastTimerRef = useRef(null)
    const invalidTimerRef = useRef(null)
    const startDeniedTimerRef = useRef(null)
    const dropPoolRef = useRef(null)
    const dropPoolIdxRef = useRef(0)
    const pcRef = useRef(null)
    const channelRef = useRef(null)
    const pendingRemoteMoveRef = useRef(null)
    const everConnectedRef = useRef(false)
    // channel.onmessage is wired up once per connection, but its body needs each render's
    // latest state (CurrentPlayer, BoardArray, etc) — this ref always holds the freshest
    // version of the handler (reassigned every render below), so the stable onmessage
    // wrapper never goes stale without needing every piece of state listed as a dep
    const handleDataChannelMessageRef = useRef(null)
    const onlineConfigRef = useRef(null) // {mode,cols,rows,players} agreed for this match — reused verbatim on PLAY AGAIN

    useEffect(() => { localStorage.setItem('sound',soundStatus) },[soundStatus])
    useEffect(() => { localStorage.setItem('boardSize',BoardSize) },[BoardSize])
    useEffect(() => { localStorage.setItem('gameMode',GameMode) },[GameMode])
    useEffect(() => { localStorage.setItem('difficulty',Difficulty) },[Difficulty])

    // first-ever visit: open the tutorial so new players learn the rules
    useEffect(() => {
        if(!localStorage.getItem('tutorialSeen')) setShowTutorial(true)
    },[])

    // Escape closes the settings modal
    useEffect(() => {
        if(!showSettings) return
        const onKeyDown = (e) => { if(e.key === 'Escape') setShowSettings(false) }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    },[showSettings])

    // ceiling on board dimensions that fits the current viewport at natural cell size (50px)
    const computeMaxDims = () => ({
        cols: Math.max(4, ~~((window.innerWidth - 16)/50)),
        rows: Math.max(5, ~~((window.innerHeight - 150)/50)),
    })

    useEffect(() => {
        const dims = computeMaxDims()
        setMaxDims(dims)
        setBoardColumns(dims.cols)
        setBoardRows(dims.rows)
        setBoardArray(Array.from({length: dims.rows}, () => Array.from({length: dims.cols}, () => [0,null])))
    },[])

    // keep the board on-screen across resizes/rotations — never touch BoardArray mid-game
    // (that would wipe placed orbs), so an active game just visually scales down to fit instead
    useEffect(() => {
        const onResize = () => {
            const dims = computeMaxDims()
            setMaxDims(dims)
            if(Players.length === 0){
                setBoardColumns(dims.cols)
                setBoardRows(dims.rows)
                setBoardArray(Array.from({length: dims.rows}, () => Array.from({length: dims.cols}, () => [0,null])))
                setBoardScale(1)
            } else {
                setBoardScale(Math.min(1, dims.cols / BoardColumns, dims.rows / BoardRows))
            }
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    },[Players.length, BoardColumns, BoardRows])

    const sizeDims = (size) => {
        switch(size){
            case 'small':  return { cols: Math.min(6, MaxDims.cols),  rows: Math.min(8, MaxDims.rows) }
            case 'medium': return { cols: Math.min(9, MaxDims.cols),  rows: Math.min(12, MaxDims.rows) }
            default:       return { cols: MaxDims.cols, rows: MaxDims.rows }
        }
    }

    // a player is out once they have made a move and own no orbs anymore
    const alivePlayers = (board) => {
        const counts = orbCounts(board)
        return Players.filter(p => !movedRef.current[p.color] || (counts[p.color] || 0) > 0)
    }

    // classic: last player standing; teams: last team standing
    const winnerOf = (alive) => {
        if(alive.length === 0) return null
        if(GameMode === 'teams'){
            const teams = new Set(alive.map(p => Players.indexOf(p) % 2))
            if(teams.size === 1){
                const t = [...teams][0]
                return { name: t === 0 ? 'TEAM ALPHA' : 'TEAM OMEGA', color: alive[0].color, members: alive }
            }
            return null
        }
        return alive.length === 1 ? alive[0] : null
    }

    // a small round-robin pool avoids decoding drop.mp3 from scratch on every
    // single move, while still letting rapid consecutive drops overlap instead
    // of cutting each other off the way one reused Audio element would
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

    const showToast = (text, color) => {
        setToast({ text, color })
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setToast(null), 2600)
    }

    const closeTutorial = () => {
        localStorage.setItem('tutorialSeen', '1')
        setShowTutorial(false)
    }

    // CPU speech bubble — `chance` lets frequent events stay occasional
    const botSay = (event, color, chance = 1) => {
        if(GameMode !== 'cpu') return
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
        const dead = Players.filter(p => !(win.members || [win]).includes(p)).map(p => p.color)
        eliminatedRef.current = dead
        setEliminated(dead)
        setWinner(win)
        sfx(playWin)
        if(GameMode === 'cpu' && Players.length > 1){
            const humanWon = (win.members || [win]).includes(Players[0])
            botSay(humanWon ? 'lose' : 'win', humanWon ? Players[1].color : win.color)
        }
        processingRef.current = false
        pendingRemoteMoveRef.current = null // game's over — nothing left to apply
    }

    const onlineMyIdx = () => (OnlineRole === 'host' ? 0 : 1)

    const blockClickHandler = async (x, y, scripted = false, fromRemote = false) => {
        if(processingRef.current || Winner || Players.length === 0) return
        if(GameMode === 'cpu' && CurrentPlayer !== 0 && !scripted) return // humans can't move for the CPU
        if(OnlineRole && ConnectionState !== 'connected' && !fromRemote) return // frozen once disconnected
        if(OnlineRole && !fromRemote && CurrentPlayer !== onlineMyIdx()) return // not my turn
        if(OnlineRole && fromRemote && CurrentPlayer === onlineMyIdx()) return // stale/duplicate remote message — ignore
        const player = Players[CurrentPlayer]
        const owner = BoardArray[x][y][1]
        if(owner !== null && owner !== player.color){
            if(fromRemote){
                // the two boards already disagree about who owns this cell — a genuine
                // protocol bug, not a normal "clicked an enemy cell." Never silently drop this.
                reportFatalDesync('owner mismatch')
                return
            }
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
        playSound()
        movedRef.current[player.color] = true
        movesRef.current += 1
        setMovesCount(movesRef.current)
        if(OnlineRole && !fromRemote) sendMessage({ type: 'move', x, y, seq: movesRef.current })

        let board = cloneBoard(BoardArray)
        board[x][y] = [board[x][y][0]+1, player.color]
        setBoardArray(cloneBoard(board))

        // chain waves get faster, louder and shakier the deeper they go
        let unstable = findUnstable(board, BoardRows, BoardColumns)
        let wave = 0
        while(unstable.length > 0){
            setExploding(new Set(unstable.map(([i,j]) => `${i}-${j}`)))
            setShakeAmp(Math.min(0.8 + wave * 0.6, 5))
            await sleep(Math.max(90, 220 - wave * 15))
            unstable = applyWave(board, unstable, player.color, BoardRows, BoardColumns)
            setBoardArray(cloneBoard(board))
            setExploding(new Set())
            sfx(playExplosion, wave)
            const win = winnerOf(alivePlayers(board))
            if(win) return finishGame(win)
            wave += 1
            if(wave > 250) break // safety net for saturated boards
        }
        setShakeAmp(0)

        const alive = alivePlayers(board)
        const deadColors = Players.filter(p => !alive.includes(p)).map(p => p.color)
        const newlyDead = deadColors.filter(c => !eliminatedRef.current.includes(c))
        eliminatedRef.current = deadColors
        setEliminated(deadColors)
        const win = winnerOf(alive)
        if(win) return finishGame(win)

        if(GameMode === 'cpu'){
            const botDied = newlyDead.find(c => c !== Players[0].color)
            const isBotMove = CurrentPlayer !== 0
            if(newlyDead.includes(Players[0].color)) showToast('YOU ARE OUT!', Players[0].color)
            else if(botDied) botSay('eliminated', botDied)
            else if(isBotMove && wave >= 3) botSay('bigChain', player.color)
            else if(isBotMove) botSay('move', player.color, 0.25)
            else if(wave >= 3) botSay('humanBig', (alive.find(p => p !== Players[0]) || player).color, 0.9)
        } else if(newlyDead.length > 0){
            const out = Players.find(p => p.color === newlyDead[0])
            if(out) showToast(`${out.name} IS OUT!`, out.color)
        }

        // sudden death: long games go to overtime — when it runs out, most orbs wins
        if(GameMode === 'sudden'){
            if(!SuddenDeath && movesRef.current >= sdThresholdRef.current){
                setSuddenDeath(true)
                overtimeRef.current = Players.length * 2
                setOvertimeLeft(overtimeRef.current)
                sfx(playExplosion, 5)
            } else if(SuddenDeath){
                overtimeRef.current = Math.max(0, overtimeRef.current - 1)
                setOvertimeLeft(overtimeRef.current)
                if(overtimeRef.current === 0){
                    const counts = orbCounts(board)
                    const best = Math.max(...alive.map(p => counts[p.color] || 0))
                    const leaders = alive.filter(p => (counts[p.color] || 0) === best)
                    if(leaders.length === 1) return finishGame(leaders[0])
                    // tied — play on until someone takes the lead
                }
            }
        }
        let next = CurrentPlayer
        do {
            next = (next + 1) % Players.length
        } while(!alive.includes(Players[next]))
        setCurrentPlayer(next)
        processingRef.current = false
        // a remote move that arrived while we were mid-animation was queued, not dropped — apply it now
        if(pendingRemoteMoveRef.current){
            const pending = pendingRemoteMoveRef.current
            pendingRemoteMoveRef.current = null
            blockClickHandler(pending.x, pending.y, true, true)
        }
    }

    // ---- vs CPU: bots take their turns automatically ----
    useEffect(() => {
        if(GameMode !== 'cpu' || Winner || Players.length === 0 || CurrentPlayer === 0) return
        const id = setTimeout(() => {
            if(processingRef.current) return
            const move = chooseMove(BoardArray, CurrentPlayer, Players, BoardRows, BoardColumns, Difficulty)
            if(move) blockClickHandler(move[0], move[1], true)
        }, 650)
        return () => clearTimeout(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[CurrentPlayer, Players, Winner, GameMode, BoardArray])

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
        // online: the countdown ticks on both screens, but only the peer whose turn it
        // actually is should auto-play — otherwise this fires on both sides every timeout
        if(OnlineRole && CurrentPlayer !== onlineMyIdx()) return
        if(processingRef.current) return
        const moves = legalMoves(BoardArray, Players[CurrentPlayer].color)
        if(moves.length > 0){
            const [x, y] = moves[~~(Math.random() * moves.length)]
            blockClickHandler(x, y, true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[TimeLeft])

    const chooseCount = (count) => {
        sfx(playClick)
        setSelectedCount(count)
        setSelectedColors([]) // start empty — players pick their own colors
    }

    const toggleColor = (p) => {
        sfx(playClick)
        setSelectedColors(prev => {
            if(prev.includes(p)) return prev.filter(x => x !== p)
            if(prev.length >= SelectedCount) return prev
            return [...prev, p]
        })
    }

    const handleStartClick = () => {
        if(SelectedColors.length !== SelectedCount){
            sfx(playDenied)
            setStartDenied(true)
            clearTimeout(startDeniedTimerRef.current)
            startDeniedTimerRef.current = setTimeout(() => setStartDenied(false), 320)
            return
        }
        startGame()
    }

    // shared by local start and online setup so both peers reset every counter/ref
    // identically — they run the same function body, not two hand-kept copies
    const applyStart = ({ mode, cols, rows, players }) => {
        setBoardColumns(cols)
        setBoardRows(rows)
        setBoardArray(Array.from({length: rows}, () => Array.from({length: cols}, () => [0,null])))
        setBoardScale(Math.min(1, MaxDims.cols / cols, MaxDims.rows / rows, 1))
        setPlayers(players)
        setCurrentPlayer(0)
        setEliminated([])
        setWinner(null)
        setMovesCount(0)
        setSuddenDeath(false)
        setOvertimeLeft(0)
        setMyRematchReady(false)
        setTheirRematchReady(false)
        turnSecsRef.current = TURN_SECONDS[BoardSize] || 7
        setTimeLeft(turnSecsRef.current)
        movedRef.current = {}
        movesRef.current = 0
        eliminatedRef.current = []
        overtimeRef.current = 0
        sdThresholdRef.current = Math.max(20, Math.round(rows * cols * 0.4))
        if(mode === 'cpu' && players.length > 1){
            const botColor = players[1].color
            setTimeout(() => {
                const text = speak(Difficulty, 'start')
                if(text){
                    setSpeech({ text, color: botColor, name: PERSONAS[Difficulty].name })
                    clearTimeout(speechTimerRef.current)
                    speechTimerRef.current = setTimeout(() => setSpeech(null), 3200)
                }
            }, 900)
        }
    }

    const startGame = () => {
        sfx(playClick)
        const { cols, rows } = sizeDims(BoardSize)
        applyStart({ mode: GameMode, cols, rows, players: SelectedColors })
    }

    const resetGame = () => {
        if(OnlineRole){
            sendMessage({ type: 'bye' })
            teardownConnection()
        }
        setBoardArray(Array.from({length: BoardRows}, () => Array.from({length: BoardColumns}, () => [0,null])))
        setPlayers([])
        setSelectedCount(null)
        setSelectedColors([])
        setCurrentPlayer(0)
        setEliminated([])
        setWinner(null)
        setExploding(new Set())
        setShakeAmp(0)
        setMovesCount(0)
        setSuddenDeath(false)
        setOvertimeLeft(0)
        setShowSettings(false)
        setSpeech(null)
        setToast(null)
        clearTimeout(speechTimerRef.current)
        clearTimeout(toastTimerRef.current)
        movedRef.current = {}
        movesRef.current = 0
        eliminatedRef.current = []
        overtimeRef.current = 0
        processingRef.current = false
    }

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

    // ---- online play: serverless WebRTC, manual copy/paste signaling ----

    const sendMessage = (obj) => {
        try { channelRef.current?.send(JSON.stringify(obj)) } catch { /* channel not open — nothing we can do */ }
    }

    // closes the live connection but keeps OnlineRole/game state intact, so the
    // online turn-guards in blockClickHandler keep freezing input and the UI can
    // still show a meaningful "your opponent disconnected" banner in context
    const closeConnection = () => {
        try { channelRef.current?.close() } catch { /* already closed */ }
        try { pcRef.current?.close() } catch { /* already closed */ }
        channelRef.current = null
        pcRef.current = null
        setConnectionState('disconnected')
    }

    // full reset for an intentional leave (lobby back button, Main Menu, tab close)
    const teardownConnection = () => {
        closeConnection()
        everConnectedRef.current = false
        pendingRemoteMoveRef.current = null
        onlineConfigRef.current = null
        setOnlineRole(null)
        setOnlineStage(null)
        setOfferCode('')
        setAnswerCode('')
        setPasteInput('')
        setHostPreview(null)
        setConnectionState('connecting')
        setOnlineError(null)
        setMyRematchReady(false)
        setTheirRematchReady(false)
    }

    const reportFatalDesync = (reason) => {
        console.error('online desync:', reason)
        setOnlineError("Lost sync with your opponent — this match has ended.")
        closeConnection()
    }

    const wirePeerConnection = (pc) => {
        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState
            if(state === 'failed' || state === 'disconnected' || state === 'closed'){
                setOnlineError(everConnectedRef.current
                    ? 'Connection to your opponent was lost.'
                    : "Couldn't connect — this can happen behind a restrictive network, since no relay server is used. Try again or a different network.")
                setConnectionState('disconnected')
            }
        }
    }

    const wireChannel = (channel) => {
        channel.onopen = () => {
            everConnectedRef.current = true
            setConnectionState('connected')
            setOnlineStage('pick-color')
        }
        channel.onclose = () => {
            if(everConnectedRef.current) setConnectionState('disconnected')
        }
        channel.onmessage = (e) => handleDataChannelMessageRef.current?.(e.data)
    }

    const applyRemoteMove = (x, y) => {
        if(processingRef.current){ pendingRemoteMoveRef.current = { x, y }; return }
        blockClickHandler(x, y, true, true)
    }

    const startHosting = () => {
        sfx(playClick)
        setOnlineRole('host')
        setOnlineStage('config')
        setSelectedCount(1)
        setSelectedColors([])
    }

    const startJoining = () => {
        sfx(playClick)
        setOnlineRole('guest')
        setOnlineStage('paste-offer')
        setPasteInput('')
    }

    const cancelOnline = () => {
        sfx(playClick)
        teardownConnection()
    }

    const copyCode = (code) => {
        if(!navigator.clipboard) return
        navigator.clipboard.writeText(code)
            .then(() => showToast('CODE COPIED!', '#4da6ff'))
            .catch(() => showToast('COPY FAILED', '#ff4655'))
    }

    const hostConfigConfirmed = async () => {
        if(SelectedColors.length !== 1) return
        sfx(playClick)
        setOnlineError(null)
        setOnlineStage('code-exchange')
        try {
            const pc = createHostConnection()
            pcRef.current = pc
            wirePeerConnection(pc)
            const channel = pc.createDataChannel('game', { ordered: true })
            channelRef.current = channel
            wireChannel(channel)
            const { cols, rows } = sizeDims(BoardSize)
            const offerDesc = await createOffer(pc)
            setOfferCode(encodeBlob({
                v: 1, type: 'offer', sdp: offerDesc,
                config: { mode: GameMode, cols, rows, hostName: SelectedColors[0].name, hostColor: SelectedColors[0].color },
            }))
        } catch {
            setOnlineError('Could not create a connection offer. Try again.')
            setOnlineStage('config')
        }
    }

    const submitAnswerCode = async () => {
        const decoded = decodeBlob(PasteInput)
        if(!decoded || decoded.type !== 'answer' || !decoded.sdp){
            setOnlineError('That code looks invalid — check you copied the whole thing.')
            return
        }
        setOnlineError(null)
        try {
            await pcRef.current.setRemoteDescription(decoded.sdp)
            setOnlineStage('connecting')
        } catch {
            setOnlineError('Could not complete the connection. Try again.')
        }
    }

    const connectAsGuest = async (decoded) => {
        try {
            const pc = createGuestConnection()
            pcRef.current = pc
            wirePeerConnection(pc)
            const channelPromise = waitForDataChannel(pc)
            const answerDesc = await createAnswer(pc, decoded.sdp)
            setAnswerCode(encodeBlob({ v: 1, type: 'answer', sdp: answerDesc }))
            const channel = await channelPromise
            channelRef.current = channel
            wireChannel(channel)
        } catch {
            setOnlineError('Could not create a connection answer. Try again.')
            setOnlineStage('paste-offer')
        }
    }

    const submitOfferCode = () => {
        const decoded = decodeBlob(PasteInput)
        if(!decoded || decoded.type !== 'offer' || !decoded.sdp || !decoded.config){
            setOnlineError('That code looks invalid — check you copied the whole thing.')
            return
        }
        setOnlineError(null)
        setHostPreview(decoded.config)
        setOnlineStage('code-exchange')
        connectAsGuest(decoded)
    }

    const confirmGuestColor = (p) => {
        sfx(playClick)
        setSelectedColors([p])
        sendMessage({ type: 'guest-color', color: p.color, maxDims: computeMaxDims() })
        setOnlineStage('connecting')
    }

    const handlePlayAgainOnline = () => {
        sfx(playClick)
        setMyRematchReady(true)
        sendMessage({ type: 'rematch-request' })
    }

    // reassigned every render so the stable channel.onmessage wrapper above always
    // calls into a version of this closure with this render's fresh state
    handleDataChannelMessageRef.current = (raw) => {
        let msg
        try { msg = JSON.parse(raw) } catch { return }

        if(msg.type === 'bye'){
            setOnlineError('Your opponent disconnected.')
            closeConnection()
            return
        }
        if(msg.type === 'guest-color'){
            if(OnlineRole !== 'host') return
            const guestEntry = PLAYERS.find(p => p.color === msg.color)
            const hostEntry = SelectedColors[0]
            if(!guestEntry || !hostEntry) return
            const { cols: hostCols, rows: hostRows } = sizeDims(BoardSize)
            const guestMax = msg.maxDims || { cols: hostCols, rows: hostRows }
            const cols = Math.max(4, Math.min(hostCols, guestMax.cols))
            const rows = Math.max(5, Math.min(hostRows, guestMax.rows))
            const config = { mode: GameMode, cols, rows, players: [hostEntry, guestEntry] }
            onlineConfigRef.current = config
            sendMessage({ type: 'setup', ...config })
            setOnlineStage(null)
            applyStart(config)
            return
        }
        if(msg.type === 'setup'){
            if(OnlineRole !== 'guest') return
            const config = { mode: msg.mode, cols: msg.cols, rows: msg.rows, players: msg.players }
            onlineConfigRef.current = config
            setOnlineStage(null)
            applyStart(config)
            return
        }
        if(msg.type === 'move'){
            applyRemoteMove(msg.x, msg.y)
            return
        }
        if(msg.type === 'rematch-request'){
            setTheirRematchReady(true)
            return
        }
    }

    // symmetric rematch — once both sides have clicked PLAY AGAIN, restart identically
    useEffect(() => {
        if(OnlineRole && MyRematchReady && TheirRematchReady && onlineConfigRef.current){
            applyStart(onlineConfigRef.current)
        }
    },[MyRematchReady, TheirRematchReady])

    // best-effort notice to the other peer if this tab closes mid-match
    useEffect(() => {
        if(!OnlineRole) return
        const onUnload = () => { try { channelRef.current?.send(JSON.stringify({type:'bye'})) } catch { /* best-effort */ } }
        window.addEventListener('beforeunload', onUnload)
        return () => window.removeEventListener('beforeunload', onUnload)
    },[OnlineRole])

    const currentColor = Players.length > 0 ? Players[CurrentPlayer].color : '#3a4566'

    const countOptions = GameMode === 'teams' ? [4,6,8] : [2,3,4,5,6,7,8]

    const colorHint = GameMode === 'cpu' ? 'your first pick is you — the cpu plays the rest'
        : GameMode === 'teams' ? 'odd picks are team alpha • even picks are team omega'
        : 'turn order follows your picks'

    const startScreen = () => (
        <m.div className='overlay' key='start'
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}>
            <m.div className='gameTitle' initial={{y:-50,opacity:0}} animate={{y:0,opacity:1}} transition={{...spring, delay:0.05}}>
                CHAIN<span className='titleAccent'>REACTION</span>
            </m.div>
            {SelectedCount === null ? <>
                <m.div className='tagline' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}>
                    game mode
                </m.div>
                <div className='sizeRow modeRow'>
                    {MODES.map((mode,idx) => (
                        <m.button key={mode.id} className={`sizeBtn${GameMode === mode.id ? ' selected' : ''}`}
                            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{...spring, delay:0.15+idx*0.04}}
                            whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                            onClick={() => {sfx(playClick); setGameMode(mode.id)}}>
                            {mode.label}
                        </m.button>
                    ))}
                </div>
                {GameMode === 'cpu' &&
                    <div className='sizeRow'>
                        {DIFFICULTIES.map(d => (
                            <m.button key={d} className={`sizeBtn diffBtn${Difficulty === d ? ' selected' : ''}`}
                                initial={{opacity:0}} animate={{opacity:1}}
                                whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                                onClick={() => {sfx(playClick); setDifficulty(d)}}>
                                {d}
                            </m.button>
                        ))}
                    </div>
                }
                <m.div className='tagline' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}>
                    board size
                </m.div>
                <div className='sizeRow'>
                    {BOARD_SIZES.map((s,idx) => (
                        <m.button key={s} className={`sizeBtn${BoardSize === s ? ' selected' : ''}`}
                            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{...spring, delay:0.25+idx*0.05}}
                            whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                            onClick={() => {sfx(playClick); setBoardSize(s)}}>
                            {s}
                        </m.button>
                    ))}
                </div>
                <m.div className='tagline' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}>
                    how many players?
                </m.div>
                <div className='countRow'>
                    {countOptions.map((n,idx) => (
                        <m.button key={n} className='countBtn'
                            initial={{scale:0}} animate={{scale:1}} transition={{...spring, delay:0.4+idx*0.05}}
                            whileHover={{scale:1.15}} whileTap={{scale:0.9}}
                            onClick={() => chooseCount(n)}>
                            {n}
                        </m.button>
                    ))}
                </div>
                <m.div className='hint' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.7}}>
                    {GameMode === 'cpu' ? 'you vs the machine — bots take the other colors'
                        : GameMode === 'blitz' ? `move within ${TURN_SECONDS[BoardSize] || 7} seconds or a random cell is played for you`
                        : GameMode === 'sudden' ? 'long games go to overtime — most orbs wins'
                        : GameMode === 'teams' ? 'two teams — eliminate the other side together'
                        : 'pass & play  •  each player gets a color  •  last one standing wins'}
                </m.div>
                <div className='startRow'>
                    <m.button className='howToBtn'
                        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}}
                        whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                        onClick={() => {sfx(playClick); setShowTutorial(true)}}>
                        <span role='img' aria-label='question'>❓</span>&nbsp;how to play
                    </m.button>
                    <m.button className='howToBtn'
                        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.85}}
                        whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                        onClick={() => {sfx(playClick); setOnlineStage('role-select')}}>
                        <span role='img' aria-label='globe'>🌐</span>&nbsp;play online
                    </m.button>
                </div>
            </> : <>
                <m.div className='tagline' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}>
                    pick your colors&nbsp;&nbsp;—&nbsp;&nbsp;{SelectedColors.length} / {SelectedCount}
                </m.div>
                <div className='colorGrid'>
                    {PLAYERS.map((p,idx) => {
                        const pick = SelectedColors.indexOf(p)
                        return (
                            <m.button key={p.color} className={`colorChip${pick >= 0 ? ' picked' : ''}`} style={{'--c':p.color}}
                                initial={{scale:0}} animate={{scale:1}} transition={{...spring, delay:0.1+idx*0.04}}
                                whileHover={{scale:1.12}} whileTap={{scale:0.9}}
                                onClick={() => toggleColor(p)}
                                aria-label={p.name}>
                                {pick >= 0 ? pick+1 : ''}
                            </m.button>
                        )
                    })}
                </div>
                <m.div className='hint' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.35}}>
                    {colorHint}
                </m.div>
                <div className='startRow'>
                    <m.button className='sizeBtn'
                        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}
                        whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                        onClick={() => {sfx(playClick); setSelectedCount(null)}}>
                        back
                    </m.button>
                    <m.button className={`neonBtn startBtn${SelectedColors.length !== SelectedCount ? ' incomplete' : ''}${StartDenied ? ' denied' : ''}`}
                        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.25}}
                        whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                        onClick={handleStartClick}>
                        START
                    </m.button>
                </div>
            </>}
        </m.div>
    )

    const onlineLobbyScreen = () => (
        <m.div className='overlay' key='online'
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}>
            <m.div className='gameTitle' initial={{y:-50,opacity:0}} animate={{y:0,opacity:1}} transition={{...spring, delay:0.05}}>
                CHAIN<span className='titleAccent'>REACTION</span>
            </m.div>

            {OnlineError &&
                <div className='onlineErrorBanner'>{OnlineError}</div>
            }

            {OnlineStage === 'role-select' && <>
                <m.div className='tagline' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.15}}>
                    play online
                </m.div>
                <m.div className='hint' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}>
                    no server involved — you'll trade one short code with your opponent through whatever app you already use to talk to them
                </m.div>
                <div className='startRow'>
                    <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={startHosting}>HOST</m.button>
                    <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={startJoining}>JOIN</m.button>
                </div>
                <m.button className='sizeBtn' style={{marginTop:20}} whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                    onClick={() => {sfx(playClick); setOnlineStage(null)}}>
                    back
                </m.button>
            </>}

            {OnlineRole === 'host' && OnlineStage === 'config' && <>
                <div className='tagline'>game mode</div>
                <div className='sizeRow modeRow'>
                    {ONLINE_MODES.map(mode => (
                        <m.button key={mode.id} className={`sizeBtn${GameMode === mode.id ? ' selected' : ''}`}
                            whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                            onClick={() => {sfx(playClick); setGameMode(mode.id)}}>
                            {mode.label}
                        </m.button>
                    ))}
                </div>
                <div className='tagline'>board size</div>
                <div className='sizeRow'>
                    {BOARD_SIZES.map(s => (
                        <m.button key={s} className={`sizeBtn${BoardSize === s ? ' selected' : ''}`}
                            whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                            onClick={() => {sfx(playClick); setBoardSize(s)}}>
                            {s}
                        </m.button>
                    ))}
                </div>
                <div className='tagline'>your color</div>
                <div className='colorGrid'>
                    {PLAYERS.map(p => {
                        const picked = SelectedColors.includes(p)
                        return (
                            <m.button key={p.color} className={`colorChip${picked ? ' picked' : ''}`} style={{'--c':p.color}}
                                whileHover={{scale:1.12}} whileTap={{scale:0.9}}
                                onClick={() => toggleColor(p)}
                                aria-label={p.name} />
                        )
                    })}
                </div>
                <div className='startRow'>
                    <m.button className='sizeBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={cancelOnline}>back</m.button>
                    <m.button className={`neonBtn startBtn${SelectedColors.length !== 1 ? ' incomplete' : ''}`}
                        whileHover={{scale:1.08}} whileTap={{scale:0.92}} onClick={hostConfigConfirmed}>
                        CONTINUE
                    </m.button>
                </div>
            </>}

            {OnlineRole === 'host' && OnlineStage === 'code-exchange' && <>
                <div className='tagline'>{OfferCode ? 'send this code to your opponent' : 'preparing your code…'}</div>
                {OfferCode && <>
                    <textarea className='codeBox' readOnly value={OfferCode} onFocus={(e) => e.target.select()} />
                    <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => copyCode(OfferCode)}>
                        COPY CODE
                    </m.button>
                    <div className='tagline' style={{marginTop:24}}>paste their reply code</div>
                    <textarea className='codeBox editable' value={PasteInput} onChange={(e) => setPasteInput(e.target.value)}
                        placeholder='paste the code your opponent sends back…' />
                    <div className='startRow'>
                        <m.button className='sizeBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={cancelOnline}>back</m.button>
                        <m.button className='neonBtn startBtn' whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                            onClick={submitAnswerCode} disabled={!PasteInput.trim()}>
                            CONNECT
                        </m.button>
                    </div>
                </>}
            </>}

            {OnlineRole === 'guest' && OnlineStage === 'paste-offer' && <>
                <div className='tagline'>paste the code your opponent sent</div>
                <textarea className='codeBox editable' value={PasteInput} onChange={(e) => setPasteInput(e.target.value)}
                    placeholder='paste their code here…' />
                <div className='startRow'>
                    <m.button className='sizeBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={cancelOnline}>back</m.button>
                    <m.button className='neonBtn startBtn' whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                        onClick={submitOfferCode} disabled={!PasteInput.trim()}>
                        CONTINUE
                    </m.button>
                </div>
            </>}

            {OnlineRole === 'guest' && OnlineStage === 'code-exchange' && <>
                {HostPreview &&
                    <div className='hint'>opponent picked <b style={{color:HostPreview.hostColor}}>{HostPreview.hostName}</b> — {HostPreview.mode} mode</div>
                }
                <div className='tagline'>{AnswerCode ? 'send this code back to them' : 'preparing your reply code…'}</div>
                {AnswerCode && <>
                    <textarea className='codeBox' readOnly value={AnswerCode} onFocus={(e) => e.target.select()} />
                    <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => copyCode(AnswerCode)}>
                        COPY CODE
                    </m.button>
                    <div className='hint' style={{marginTop:16}}>waiting for the connection to open…</div>
                </>}
            </>}

            {OnlineStage === 'pick-color' && OnlineRole === 'guest' && <>
                <div className='tagline'>pick your color</div>
                <div className='colorGrid'>
                    {PLAYERS.filter(p => p.color !== HostPreview?.hostColor).map(p => (
                        <m.button key={p.color} className='colorChip' style={{'--c':p.color}}
                            whileHover={{scale:1.12}} whileTap={{scale:0.9}}
                            onClick={() => confirmGuestColor(p)}
                            aria-label={p.name} />
                    ))}
                </div>
            </>}
            {OnlineStage === 'pick-color' && OnlineRole === 'host' && <>
                <div className='hint'>waiting for your opponent to pick a color…</div>
            </>}

            {OnlineStage === 'connecting' && <>
                <div className='hint'>connecting…</div>
            </>}
        </m.div>
    )

    const winScreen = () => (
        <m.div className='overlay' key='win'
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}>
            <m.div className='winRing' style={{'--c':Winner.color}}
                initial={{scale:0,rotate:-30}} animate={{scale:1,rotate:0}} transition={{...spring, delay:0.1}}>
                <div className='winOrb' />
            </m.div>
            <m.div className='winText' style={{'--c':Winner.color}}
                initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{...spring, delay:0.25}}>
                {Winner.name} WINS
            </m.div>
            {Winner.members &&
                <m.div className='winTeamDots' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}>
                    {Winner.members.map(p => <span key={p.color} className='playerDot' style={{'--c':p.color}} />)}
                </m.div>
            }
            {OnlineRole && ConnectionState !== 'connected' ? (
                <div className='hint' style={{marginTop:20}}>{OnlineError || 'connection lost — start a new match to play again'}</div>
            ) : (
                <m.button className='neonBtn' style={{'--c':Winner.color}}
                    initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{...spring, delay:0.45}}
                    whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                    onClick={() => OnlineRole ? handlePlayAgainOnline() : resetGame()}>
                    {OnlineRole && MyRematchReady ? 'WAITING FOR OPPONENT…' : 'PLAY AGAIN'}
                </m.button>
            )}
            {OnlineRole &&
                <m.button className='sizeBtn' style={{marginTop:14}} whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => resetGame()}>
                    main menu
                </m.button>
            }
        </m.div>
    )

    const settingsScreen = () => (
        <m.div className='overlay' key='settings'
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
            onClick={() => setShowSettings(false)}>
            <m.div className='panel' onClick={(e) => e.stopPropagation()}
                initial={{scale:0.85,y:20}} animate={{scale:1,y:0}} transition={spring}>
                <div className='panelTitle'>SETTINGS</div>
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => soundButtonHandler()}>
                    SOUND&nbsp;<span role='img' aria-label='sound'>{soundStatus === 'on' ? '🔊' : '🔇'}</span>
                </m.button>
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => resetGame()}>
                    MAIN MENU
                </m.button>
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => {setShowTutorial(true); setShowSettings(false)}}>
                    TUTORIAL
                </m.button>
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => share()}>
                    SHARE <span role='img' aria-label='share'>🔗</span>
                </m.button>
                <div className='devLine'>Designed &amp; Built with <span role='img' aria-label='love'>💙</span> by @tarunspartan</div>
            </m.div>
        </m.div>
    )

    const tutorialScreen = () => (
        <m.div className='overlay' key='tutorial'
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}>
            <m.div className='panel tutorialPanel' initial={{scale:0.9,y:30}} animate={{scale:1,y:0}} transition={spring}>
                <div className='panelTitle'>HOW TO PLAY</div>
                <div className='tutBody'>
                    <p>Chain Reaction is a 2 to 8 player game. Each player gets a color. Take turns placing orbs — and eliminate everyone else!</p>
                    <hr/>
                    <p>Every cell has a limit: <b>corners</b> hold 1 orb, <b>edges</b> hold 2, and <b>center</b> cells hold 3. Orbs that <b>tremble</b> are full — one more and they explode.</p>
                    <div className='demoRow'>
                        <MiniBoard cells={[
                            {r:0,c:0,n:1,color:'#ff4655',critical:true},
                            {r:2,c:1,n:2,color:'#4da6ff',critical:true},
                            {r:1,c:1,n:3,color:'#3df56e',critical:true},
                        ]} />
                    </div>
                    <hr/>
                    <p>An exploding cell throws one orb into each neighbouring cell. A full corner bursts into its two neighbours:</p>
                    <div className='demoRow'>
                        <MiniBoard cells={[
                            {r:0,c:0,n:2,color:'#ff4655',critical:true},
                        ]} />
                        <span className='demoArrow' role='img' aria-label='becomes'>➜</span>
                        <MiniBoard cells={[
                            {r:0,c:1,n:1,color:'#ff4655'},
                            {r:1,c:0,n:1,color:'#ff4655'},
                        ]} />
                    </div>
                    <hr/>
                    <p>Here comes the fun: orbs landing in an opponent's cell <b>capture</b> it — and captured cells can explode too, setting off huge chain reactions.</p>
                    <div className='demoRow'>
                        <MiniBoard cells={[
                            {r:1,c:1,n:3,color:'#ff4655',critical:true},
                            {r:0,c:1,n:1,color:'#3df56e'},
                            {r:1,c:2,n:2,color:'#3df56e'},
                        ]} />
                        <span className='demoArrow' role='img' aria-label='becomes'>➜</span>
                        <MiniBoard cells={[
                            {r:0,c:1,n:2,color:'#ff4655'},
                            {r:1,c:0,n:1,color:'#ff4655'},
                            {r:1,c:2,n:3,color:'#ff4655'},
                            {r:2,c:1,n:1,color:'#ff4655'},
                        ]} />
                    </div>
                    <hr/>
                    <p><b>Pick your battle — five game modes:</b></p>
                    <div className='modeCards'>
                        <div className='modeCard' style={{'--c':'#4da6ff'}}>
                            <span className='modeCardTitle'><span role='img' aria-label='game'>🎮</span> CLASSIC</span>
                            Pass &amp; play free-for-all. Take turns on one device — last player standing wins.
                        </div>
                        <div className='modeCard' style={{'--c':'#3df56e'}}>
                            <span className='modeCardTitle'><span role='img' aria-label='robot'>🤖</span> VS CPU</span>
                            You go first, bots play the rest — and they talk. <b>BLOB</b> (easy) is adorable chaos, <b>REX</b> (medium) trash-talks every move, <b>VEGA</b> (hard) has already simulated your defeat.
                        </div>
                        <div className='modeCard' style={{'--c':'#ffd234'}}>
                            <span className='modeCardTitle'><span role='img' aria-label='lightning'>⚡</span> BLITZ</span>
                            Beat the timer bar: 5s on small boards, 7s on medium, 10s on large. Run out of time and a random cell is played for you.
                        </div>
                        <div className='modeCard' style={{'--c':'#ff4655'}}>
                            <span className='modeCardTitle'><span role='img' aria-label='skull'>☠</span> SUDDEN DEATH</span>
                            Long game? Overtime kicks in: a countdown starts, and when it ends whoever holds the most orbs wins. Tied? Next player to take the lead takes the game.
                        </div>
                        <div className='modeCard' style={{'--c':'#ff4dd2'}}>
                            <span className='modeCardTitle'><span role='img' aria-label='handshake'>🤝</span> TEAMS</span>
                            4, 6 or 8 players in two squads — your odd picks are Team Alpha, even picks are Team Omega. Wipe out the whole other side to win together.
                        </div>
                    </div>
                    <hr/>
                    <ul className='tutRules'>
                        <li>The glow of the board shows whose turn it is.</li>
                        <li>The dots below the board show every player — the glowing one is up next.</li>
                        <li>You can only place orbs in empty cells or cells you own.</li>
                        <li>Lose all your orbs and you're out — your turn is skipped.</li>
                        <li>Last player standing wins. <span className='booyah'>BOOYAH!</span></li>
                    </ul>
                </div>
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => closeTutorial()}>
                    GOT IT <span role='img' aria-label='thumbs up'>👍🏼</span>
                </m.button>
            </m.div>
        </m.div>
    )

    const renderDot = (p) => {
        const i = Players.indexOf(p)
        const dot = (
            <span
                className={`playerDot${i === CurrentPlayer && !Winner ? ' active' : ''}${Eliminated.includes(p.color) ? ' dead' : ''}`}
                style={{'--c':p.color}}
            />
        )
        // in vs-CPU mode, mark which dot is the human
        if(GameMode === 'cpu' && i === 0){
            return <span key={p.color} className='youWrap'>{dot}<span className='youLabel'>you</span></span>
        }
        return <span key={p.color}>{dot}</span>
    }

    return (
        <div className='container' style={{'--turn':currentColor}}>
            <div className='ambientGlow' />
            {OnlineRole && Players.length > 0 && !Winner && ConnectionState !== 'connected' &&
                <div className='onlineDisconnectBanner'>{OnlineError || 'connection lost'}</div>
            }
            <div className='centerDiv'>
                <div className='turnBanner' style={{'--c':currentColor}}>
                    {Players.length > 0 && !Winner && (
                        GameMode === 'cpu'
                            ? (CurrentPlayer === 0
                                ? <>YOUR TURN</>
                                : <>{PERSONAS[Difficulty].name} IS THINKING<span className='thinkingDots'><i/><i/><i/></span></>)
                            : <>{Players[CurrentPlayer].name}'S TURN</>
                    )}
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
                    BoardArray.map((row,rowindex) => {
                        return <div key={rowindex} className='boardRow'>
                        {row.map((col,colindex) => {
                            const cellKey = `${rowindex}-${colindex}`
                            const count = col[0]
                            const ownerColor = col[1]
                            const n = Math.min(count,3)
                            const critical = count > 0 && count === criticalMass(rowindex,colindex,BoardRows,BoardColumns)-1
                            return <div key={cellKey}
                                    className={InvalidCell === cellKey ? 'block invalid' : 'block'}
                                    onClick={() => blockClickHandler(rowindex,colindex)}>
                                {Exploding.has(cellKey) && <span className='burst' />}
                                {count > 0 &&
                                    <div className={critical ? 'cluster critical' : 'cluster'}>
                                        <div className={`orbs n${n}`} style={{'--c':ownerColor}} key={n}>
                                            {Array.from({length:n}).map((_,q) => <span key={q} className='orb' />)}
                                        </div>
                                    </div>
                                }
                            </div>
                        })}
                        </div>
                    })
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
            <button className='settingsIcon' onClick={() => setShowSettings(true)} aria-label='settings'>&#x2699;</button>
            <LazyMotion features={domAnimation} strict>
                <AnimatePresence>
                    {Players.length === 0 && !showTutorial && OnlineStage === null && startScreen()}
                    {Players.length === 0 && OnlineStage !== null && onlineLobbyScreen()}
                    {Winner && winScreen()}
                    {showSettings && settingsScreen()}
                    {showTutorial && tutorialScreen()}
                </AnimatePresence>
                <AnimatePresence>
                    {Speech &&
                        <m.div className='speechBubble' key={Speech.text} style={{'--c':Speech.color}}
                            initial={{opacity:0, y:14, scale:0.9}} animate={{opacity:1, y:0, scale:1}}
                            exit={{opacity:0, y:-10}} transition={spring}>
                            <span className='speechName'>{Speech.name}</span>
                            {Speech.text}
                        </m.div>
                    }
                </AnimatePresence>
                <AnimatePresence>
                    {Toast &&
                        <m.div className='speechBubble toast' key={Toast.text} style={{'--c':Toast.color}}
                            initial={{opacity:0, y:14, scale:0.9}} animate={{opacity:1, y:0, scale:1}}
                            exit={{opacity:0, y:-10}} transition={spring}>
                            {Toast.text}
                        </m.div>
                    }
                </AnimatePresence>
            </LazyMotion>
        </div>
    )
}

export default Board
