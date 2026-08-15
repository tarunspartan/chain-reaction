import React from 'react'
import { m } from 'motion/react'
import { spring } from '../constants'

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

const Tutorial = ({ initial, onClose }) => (
    <m.div className='overlay' key='tutorial'
        initial={initial} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}>
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
                <p><b>Playing online:</b> host a room and share the 5-character code, or enter someone else's. Up to 8 players, everyone picks a color and readies up, and the host sets the mode. Between matches the whole room lands back in the lobby, so you can switch mode or size and go again.</p>
                <hr/>
                <ul className='tutRules'>
                    <li>The glow of the board shows whose turn it is.</li>
                    <li>The dots below the board show every player — the glowing one is up next.</li>
                    <li>You can only place orbs in empty cells or cells you own.</li>
                    <li>Lose all your orbs and you're out — your turn is skipped.</li>
                    <li>Last player standing wins. <span className='booyah'>BOOYAH!</span></li>
                </ul>
            </div>
            <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onClose}>
                GOT IT <span role='img' aria-label='thumbs up'>👍🏼</span>
            </m.button>
        </m.div>
    </m.div>
)

export default Tutorial
