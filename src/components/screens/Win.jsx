import React from 'react'
import { m } from 'motion/react'
import { spring } from '../constants'

// Online, the winner screen is a waiting room: the host takes everyone back to the
// lobby for the next match (where mode and size can change and everyone re-readies),
// which is the whole rematch flow — no separate vote to keep in sync.
const Win = ({ winner, isOnline, isHost, onPlayAgain, onNextMatch, onLeaveRoom }) => (
    <m.div className='overlay' key='win'
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}>
        <m.div className='winRing' style={{'--c':winner.color}}
            initial={{scale:0,rotate:-30}} animate={{scale:1,rotate:0}} transition={{...spring, delay:0.1}}>
            <div className='winOrb' />
        </m.div>
        <m.div className='winText' style={{'--c':winner.color}}
            initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{...spring, delay:0.25}}>
            {winner.name} WINS
        </m.div>
        {winner.members &&
            <m.div className='winTeamDots' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}>
                {winner.members.map(p => <span key={p.color} className='playerDot' style={{'--c':p.color}} />)}
            </m.div>
        }
        {!isOnline &&
            <m.button className='neonBtn' style={{'--c':winner.color}}
                initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{...spring, delay:0.45}}
                whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                onClick={onPlayAgain}>
                PLAY AGAIN
            </m.button>
        }
        {isOnline && isHost &&
            <m.button className='neonBtn' style={{'--c':winner.color}}
                initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{...spring, delay:0.45}}
                whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                onClick={onNextMatch}>
                NEXT MATCH
            </m.button>
        }
        {isOnline && !isHost &&
            <m.div className='hint' initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.45}}>
                back to the lobby when the host is ready…
            </m.div>
        }
        {isOnline &&
            <m.button className='sizeBtn' style={{marginTop:14}} whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onLeaveRoom}>
                leave room
            </m.button>
        }
    </m.div>
)

export default Win
