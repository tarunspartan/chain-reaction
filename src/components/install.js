// "Add this to my home screen" — the browser decides when to fire beforeinstallprompt,
// and there is no way to summon that dialog otherwise. So we stash the event and put a
// button in front of it.
//
// The catch: plenty of perfectly normal states never produce that event — the game is
// already installed, the browser is Safari or Firefox, or Chrome simply hasn't offered
// yet. Hiding the button in those cases means a player who wants the game on their home
// screen is told nothing at all. So the button is always there (unless we're already
// running as an installed app) and falls back to telling them where their browser keeps
// the option.

import { useCallback, useEffect, useState } from 'react'

export const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true // iOS Safari's own flag

const ua = () => window.navigator.userAgent

const isIos = () =>
    /iphone|ipad|ipod/i.test(ua()) ||
    // iPadOS 13+ reports itself as a Mac; the touch points give it away
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

const isAndroid = () => /android/i.test(ua())
const isSafari = () => /^((?!chrome|android|crios|fxios|edgios|edg).)*safari/i.test(ua())
const isFirefox = () => /firefox|fxios/i.test(ua())

// where this particular browser hides the option, for when there's no prompt to fire
export const manualInstallHint = () => {
    if(isIos()) return 'TAP SHARE, THEN "ADD TO HOME SCREEN"'
    if(isSafari()) return 'SAFARI MENU: FILE → ADD TO DOCK'
    if(isAndroid()) return 'BROWSER MENU ⋮ → ADD TO HOME SCREEN'
    if(isFirefox()) return 'FIREFOX CAN\'T INSTALL THIS — TRY CHROME OR EDGE'
    // Chromium desktop: address-bar icon, or the menu
    return 'ALREADY ADDED, OR USE BROWSER MENU ⋮ → INSTALL'
}

export const useInstallPrompt = () => {
    const [ deferred, setDeferred ] = useState(null)
    const [ installed, setInstalled ] = useState(isStandalone)

    useEffect(() => {
        const onBeforePrompt = (e) => {
            e.preventDefault() // keep the browser's own banner from firing; ours is the trigger
            setDeferred(e)
        }
        const onInstalled = () => { setDeferred(null); setInstalled(true) }
        window.addEventListener('beforeinstallprompt', onBeforePrompt)
        window.addEventListener('appinstalled', onInstalled)
        // launched from the home screen this session, or installed in another tab
        const standalone = window.matchMedia?.('(display-mode: standalone)')
        const onDisplayChange = (e) => e.matches && setInstalled(true)
        standalone?.addEventListener?.('change', onDisplayChange)
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforePrompt)
            window.removeEventListener('appinstalled', onInstalled)
            standalone?.removeEventListener?.('change', onDisplayChange)
        }
    },[])

    // The captured event is single use — once prompted it can't be replayed, and the
    // browser hands us a fresh one later if the install still hasn't happened.
    // Returns 'accepted' | 'dismissed' | 'manual' (no prompt available; show the hint).
    const install = useCallback(async () => {
        if(!deferred) return 'manual'
        deferred.prompt()
        const { outcome } = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }))
        setDeferred(null)
        return outcome
    },[deferred])

    return {
        // shown whenever we aren't already running as an installed app
        canInstall: !installed,
        oneTap: !!deferred, // the browser gave us a real prompt to fire
        installed,
        install,
    }
}
