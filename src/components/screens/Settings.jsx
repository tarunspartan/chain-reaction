import React from 'react'
import { m } from 'motion/react'
import { spring } from '../constants'

const Settings = ({ soundOn, onToggleSound, onMainMenu, onTutorial, onShare, onClose, inMatch, canInstall, onInstall }) => (
    <m.div className='overlay' key='settings'
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
        onClick={onClose}>
        <m.div className='panel' onClick={(e) => e.stopPropagation()}
            initial={{scale:0.85,y:20}} animate={{scale:1,y:0}} transition={spring}>
            <div className='panelTitle'>SETTINGS</div>
            <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onToggleSound}>
                SOUND&nbsp;<span role='img' aria-label='sound'>{soundOn ? '🔊' : '🔇'}</span>
            </m.button>
            <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onMainMenu}>
                {inMatch ? 'LEAVE MATCH' : 'MAIN MENU'}
            </m.button>
            <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onTutorial}>
                TUTORIAL
            </m.button>
            <m.button className='neonBtn' whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onShare}>
                SHARE <span role='img' aria-label='share'>🔗</span>
            </m.button>
            {/* only offered when the browser says it's installable (or on iOS, where the
                prompt API doesn't exist and the user has to do it from the share sheet) */}
            {canInstall &&
                <m.button className='neonBtn installBtn' style={{'--c':'#3df56e'}}
                    whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onInstall}>
                    INSTALL APP <span role='img' aria-label='install'>⬇</span>
                </m.button>
            }
            <div className='devLine'>Designed &amp; Built with <span role='img' aria-label='love'>💙</span> by @tarunspartan</div>
        </m.div>
    </m.div>
)

export default Settings
