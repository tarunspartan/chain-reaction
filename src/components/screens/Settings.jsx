import React from 'react'
import { m } from 'motion/react'
import { spring } from '../constants'

const Settings = ({ soundOn, onToggleSound, onLeave, onTutorial, onShare, onClose,
                    inMatch, inRoom, canInstall, onInstall }) => (
    <m.div className='overlay' key='settings'
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
        onClick={onClose}>
        <m.div className='panel' onClick={(e) => e.stopPropagation()}
            initial={{scale:0.85,y:20}} animate={{scale:1,y:0}} transition={spring}>
            <div className='panelTitle'>SETTINGS</div>
            <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onToggleSound}>
                SOUND&nbsp;<span role='img' aria-label='sound'>{soundOn ? '🔊' : '🔇'}</span>
            </m.button>
            {/* only worth offering when there's something to leave — on the menu itself
                it was an option that took you where you already were */}
            {(inMatch || inRoom) &&
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onLeave}>
                    {inRoom ? 'LEAVE ROOM' : 'MAIN MENU'}
                </m.button>
            }
            <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onTutorial}>
                HOW TO PLAY
            </m.button>
            <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onShare}>
                SHARE <span role='img' aria-label='share'>🔗</span>
            </m.button>
            {/* only when the browser has an install to offer (or on iOS, where it never
                will and the share sheet is the only route) */}
            {canInstall &&
                <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onInstall}>
                    ADD TO HOME <span role='img' aria-label='install'>⬇</span>
                </m.button>
            }
            <div className='devLine'>Designed &amp; Built with <span role='img' aria-label='love'>💙</span> by @tarunspartan</div>
        </m.div>
    </m.div>
)

export default Settings
