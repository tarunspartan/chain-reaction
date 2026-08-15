// "Add to home screen" — offered only when there is genuinely something to add.
//
// The hard part is knowing the game is ALREADY installed. display-mode: standalone only
// tells you the current tab is running as the installed app; someone who installed it
// last week and is now looking at an ordinary browser tab still reads as "not
// installed". The answer is navigator.getInstalledRelatedApps(), which — with the
// manifest listing itself under related_applications — reports our own installation.
//
// Everything else is inference, so the button is shown only on positive evidence:
// either the browser handed us a real install prompt, or we're on iOS where no prompt
// API has ever existed and the share sheet is the only route.

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

const isSafari = () => /^((?!chrome|android|crios|fxios|edgios|edg).)*safari/i.test(ua())

export const IOS_INSTALL_HINT = 'TAP SHARE, THEN "ADD TO HOME SCREEN"'

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
        const standalone = window.matchMedia?.('(display-mode: standalone)')
        const onDisplayChange = (e) => e.matches && setInstalled(true)
        standalone?.addEventListener?.('change', onDisplayChange)

        // the one reliable way to spot an install made in some earlier session
        let live = true
        navigator.getInstalledRelatedApps?.()
            .then(apps => { if(live && apps?.length) setInstalled(true) })
            .catch(() => { /* unsupported, or not a secure context — fall back to inference */ })

        return () => {
            live = false
            window.removeEventListener('beforeinstallprompt', onBeforePrompt)
            window.removeEventListener('appinstalled', onInstalled)
            standalone?.removeEventListener?.('change', onDisplayChange)
        }
    },[])

    // iOS can't be asked and can't be detected — but the share sheet really is the only
    // way in, so it's the one place a hint is worth showing on inference alone
    const iosManual = !installed && isIos() && isSafari()

    // The captured event is single use — once prompted it can't be replayed, and the
    // browser hands us a fresh one later if the install still hasn't happened.
    const install = useCallback(async () => {
        if(!deferred) return 'manual'
        deferred.prompt()
        const { outcome } = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }))
        setDeferred(null)
        return outcome
    },[deferred])

    return {
        // never on a hunch: a real prompt in hand, or iOS where that's the only option
        canInstall: !installed && (!!deferred || iosManual),
        installed,
        install,
    }
}
