import React, { useEffect, useState, useRef } from 'react'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react'
import './Board.css'
import drop from './drop.mp3'
import { playExplosion, playWin, playClick } from './sounds'
import { criticalMass, neighbours, cloneBoard, findUnstable, applyWave, orbCounts, legalMoves } from './engine'
import { chooseMove } from './ai'

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

const DIFFICULTIES = ['easy', 'medium', 'hard']

const TURN_SECONDS = 7

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
    const [ TimeLeft, setTimeLeft ] = useState(TURN_SECONDS)
    const [ showSettings, setShowSettings ] = useState(false)
    const [ showTutorial, setShowTutorial ] = useState(false)
    const [ soundStatus, setSoundStatus ] = useState(localStorage.getItem('sound') || 'on')
    const [ FaceTick, setFaceTick ] = useState(0)

    const processingRef = useRef(false)
    const movedRef = useRef({})
    const movesRef = useRef(0)
    const sdThresholdRef = useRef(999)

    useEffect(() => { localStorage.setItem('sound',soundStatus) },[soundStatus])
    useEffect(() => { localStorage.setItem('boardSize',BoardSize) },[BoardSize])
    useEffect(() => { localStorage.setItem('gameMode',GameMode) },[GameMode])
    useEffect(() => { localStorage.setItem('difficulty',Difficulty) },[Difficulty])

    useEffect(() => {
        const id = setInterval(() => setFaceTick(t => t + 1), 900)
        return () => clearInterval(id)
    },[])

    useEffect(() => {
        const cols = Math.max(4, ~~((window.innerWidth - 16)/50))
        const rows = Math.max(5, ~~((window.innerHeight - 110)/50))
        setMaxDims({ cols, rows })
        setBoardColumns(cols)
        setBoardRows(rows)
        setBoardArray(Array.from({length: rows}, () => Array.from({length: cols}, () => [0,null])))
    },[])

    const sizeDims = (size) => {
        switch(size){
            case 'small':  return { cols: Math.min(6, MaxDims.cols),  rows: Math.min(8, MaxDims.rows) }
            case 'medium': return { cols: Math.min(9, MaxDims.cols),  rows: Math.min(12, MaxDims.rows) }
            default:       return { cols: MaxDims.cols, rows: MaxDims.rows }
        }
    }

    const uiDrop = GameMode === 'sudden' && SuddenDeath ? 1 : 0

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

    const playSound = (volume = 1) => {
        if(soundStatus !== 'on') return
        const audio = new Audio(drop)
        audio.volume = volume
        audio.play()
    }

    // gate the synthesized effects behind the sound setting
    const sfx = (fn, ...args) => soundStatus === 'on' && fn(...args)

    const finishGame = (win) => {
        setShakeAmp(0)
        setExploding(new Set())
        setEliminated(Players.filter(p => !(win.members || [win]).includes(p)).map(p => p.color))
        setWinner(win)
        sfx(playWin)
        processingRef.current = false
    }

    const blockClickHandler = async (x, y, scripted = false) => {
        if(processingRef.current || Winner || Players.length === 0) return
        if(GameMode === 'cpu' && CurrentPlayer !== 0 && !scripted) return // humans can't move for the CPU
        const player = Players[CurrentPlayer]
        const owner = BoardArray[x][y][1]
        if(owner !== null && owner !== player.color) return

        processingRef.current = true
        playSound()
        movedRef.current[player.color] = true
        movesRef.current += 1
        setMovesCount(movesRef.current)

        // sudden death: once the move threshold passes, every cell's capacity drops by one
        let drop = uiDrop
        if(GameMode === 'sudden' && !SuddenDeath && movesRef.current >= sdThresholdRef.current){
            drop = 1
            setSuddenDeath(true)
            sfx(playExplosion, 5)
        }

        let board = cloneBoard(BoardArray)
        board[x][y] = [board[x][y][0]+1, player.color]
        setBoardArray(cloneBoard(board))

        // chain waves get faster, louder and shakier the deeper they go
        let unstable = findUnstable(board, BoardRows, BoardColumns, drop)
        let wave = 0
        while(unstable.length > 0){
            setExploding(new Set(unstable.map(([i,j]) => `${i}-${j}`)))
            setShakeAmp(Math.min(0.8 + wave * 0.6, 5))
            await sleep(Math.max(90, 220 - wave * 15))
            unstable = applyWave(board, unstable, player.color, BoardRows, BoardColumns, drop)
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
        setEliminated(Players.filter(p => !alive.includes(p)).map(p => p.color))
        const win = winnerOf(alive)
        if(win) return finishGame(win)
        let next = CurrentPlayer
        do {
            next = (next + 1) % Players.length
        } while(!alive.includes(Players[next]))
        setCurrentPlayer(next)
        processingRef.current = false
    }

    // ---- vs CPU: bots take their turns automatically ----
    useEffect(() => {
        if(GameMode !== 'cpu' || Winner || Players.length === 0 || CurrentPlayer === 0) return
        const id = setTimeout(() => {
            if(processingRef.current) return
            const move = chooseMove(BoardArray, CurrentPlayer, Players, BoardRows, BoardColumns, Difficulty, uiDrop)
            if(move) blockClickHandler(move[0], move[1], true)
        }, 650)
        return () => clearTimeout(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[CurrentPlayer, Players, Winner, GameMode, BoardArray])

    // ---- blitz: countdown per turn, timeout plays a random legal move ----
    useEffect(() => {
        if(GameMode !== 'blitz' || Winner || Players.length === 0) return
        setTimeLeft(TURN_SECONDS)
        const id = setInterval(() => {
            if(!processingRef.current) setTimeLeft(t => Math.max(0, t - 1))
        }, 1000)
        return () => clearInterval(id)
    },[CurrentPlayer, Players, Winner, GameMode])

    useEffect(() => {
        if(GameMode !== 'blitz' || Winner || Players.length === 0 || TimeLeft > 0) return
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
        setSelectedColors(PLAYERS.slice(0,count))
    }

    const toggleColor = (p) => {
        sfx(playClick)
        setSelectedColors(prev => {
            if(prev.includes(p)) return prev.filter(x => x !== p)
            if(prev.length >= SelectedCount) return prev
            return [...prev, p]
        })
    }

    const startGame = () => {
        sfx(playClick)
        const { cols, rows } = sizeDims(BoardSize)
        setBoardColumns(cols)
        setBoardRows(rows)
        setBoardArray(Array.from({length: rows}, () => Array.from({length: cols}, () => [0,null])))
        setPlayers(SelectedColors)
        setCurrentPlayer(0)
        setEliminated([])
        setWinner(null)
        setMovesCount(0)
        setSuddenDeath(false)
        setTimeLeft(TURN_SECONDS)
        movedRef.current = {}
        movesRef.current = 0
        sdThresholdRef.current = Math.max(16, Math.round(rows * cols * 0.3))
    }

    const resetGame = () => {
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
        setShowSettings(false)
        movedRef.current = {}
        movesRef.current = 0
        processingRef.current = false
    }

    const soundButtonHandler = () => {
        if(soundStatus === 'off'){
            new Audio(drop).play()
        }
        setSoundStatus(soundStatus === 'on' ? 'off' : 'on')
    }

    const share = () => {
        if (navigator.share) {
            navigator.share({
              title: 'Chain Reaction',
              text: 'Check out this new Fun Multiplayer Game called Chain Reaction 😮',
              url: 'https://tarunspartan.github.io/chain-reaction',
            })
              .then(() => console.log('Successful share'))
              .catch((error) => console.log('Error sharing', error));
          }
    }

    const currentColor = Players.length > 0 ? Players[CurrentPlayer].color : '#3a4566'

    // the footer face cycles through the colors of the players in the game
    const facePalette = Players.length > 0 ? Players : PLAYERS
    const faceColor = facePalette[FaceTick % facePalette.length].color

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
                        : GameMode === 'blitz' ? `move within ${TURN_SECONDS} seconds or a random cell is played for you`
                        : GameMode === 'sudden' ? 'after enough moves every cell gets a shorter fuse'
                        : GameMode === 'teams' ? 'two teams — eliminate the other side together'
                        : 'pass & play  •  each player gets a color  •  last one standing wins'}
                </m.div>
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
                    <m.button className='neonBtn startBtn' disabled={SelectedColors.length !== SelectedCount}
                        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.25}}
                        whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                        onClick={() => startGame()}>
                        START
                    </m.button>
                </div>
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
            <m.button className='neonBtn' style={{'--c':Winner.color}}
                initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{...spring, delay:0.45}}
                whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                onClick={() => resetGame()}>
                PLAY AGAIN
            </m.button>
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
                    RESTART
                </m.button>
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => {setShowTutorial(true); setShowSettings(false)}}>
                    TUTORIAL
                </m.button>
                {navigator.share && (
                    <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => share()}>
                        SHARE
                    </m.button>
                )}
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
                    <p><b>Game modes:</b></p>
                    <ul className='tutRules'>
                        <li><b>Classic</b> — pass &amp; play, last player standing wins.</li>
                        <li><b>vs CPU</b> — you play first; bots (easy / medium / hard) take the other colors.</li>
                        <li><b>Blitz</b> — {TURN_SECONDS} seconds per turn; run out and a random cell is played for you.</li>
                        <li><b>Sudden Death</b> — after enough moves, every cell's fuse shortens by one orb.</li>
                        <li><b>Teams</b> — odd picks vs even picks; eliminate the whole other team.</li>
                    </ul>
                    <hr/>
                    <ul className='tutRules'>
                        <li>The glow of the board shows whose turn it is.</li>
                        <li>The dots below the board show every player — the glowing one is up next.</li>
                        <li>You can only place orbs in empty cells or cells you own.</li>
                        <li>Lose all your orbs and you're out — your turn is skipped.</li>
                        <li>Last player standing wins. <span className='booyah'>BOOYAH!</span></li>
                    </ul>
                </div>
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={() => setShowTutorial(false)}>
                    GOT IT <span role='img' aria-label='thumbs up'>👍🏼</span>
                </m.button>
            </m.div>
        </m.div>
    )

    const renderDot = (p) => {
        const i = Players.indexOf(p)
        return (
            <span key={p.color}
                className={`playerDot${i === CurrentPlayer && !Winner ? ' active' : ''}${Eliminated.includes(p.color) ? ' dead' : ''}`}
                style={{'--c':p.color}}
            />
        )
    }

    return (
        <div className='container' style={{'--turn':currentColor}}>
            <div className='ambientGlow' />
            <div className='centerDiv'>
                <div className={ShakeAmp > 0 ? 'boardFrame shaking' : 'boardFrame'} style={{'--amp':`${ShakeAmp}px`}}>
                {
                    BoardArray.map((row,rowindex) => {
                        return <div key={rowindex} className='boardRow'>
                        {row.map((col,colindex) => {
                            const cellKey = `${rowindex}-${colindex}`
                            const count = col[0]
                            const ownerColor = col[1]
                            const n = Math.min(count,3)
                            const critical = count > 0 && count === criticalMass(rowindex,colindex,BoardRows,BoardColumns,uiDrop)-1
                            return <div key={cellKey}
                                    className='block'
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
                <div className='hud'>
                    {GameMode === 'blitz' && Players.length > 0 && !Winner &&
                        <div className='timerWrap'>
                            <div className='timerBar' style={{width:`${(TimeLeft/TURN_SECONDS)*100}%`, backgroundColor:currentColor}} />
                        </div>
                    }
                    {GameMode === 'sudden' && Players.length > 0 && !Winner &&
                        (SuddenDeath
                            ? <div className='sdLabel active'><span role='img' aria-label='skull'>☠</span> SUDDEN DEATH <span role='img' aria-label='skull'>☠</span></div>
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
                        <div className='footerTitle'>CHAIN<span className='footerDot'>•</span>REACTI<span className='face' style={{'--face':faceColor}}><span className='eye eyeL'/><span className='eye eyeR'/><span className='mouth'/></span>N</div>
                        <div className='settingsIcon' onClick={() => setShowSettings(true)}>&#x2699;</div>
                    </div>
                </div>
            </div>
            <LazyMotion features={domAnimation} strict>
                <AnimatePresence>
                    {Players.length === 0 && !showTutorial && startScreen()}
                    {Winner && winScreen()}
                    {showSettings && settingsScreen()}
                    {showTutorial && tutorialScreen()}
                </AnimatePresence>
            </LazyMotion>
        </div>
    )
}

export default Board
