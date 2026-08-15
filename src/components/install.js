// "Install this as an app" — the browser decides when a site is installable and fires
// beforeinstallprompt; there's no way to summon that dialog otherwise. So we stash the
// event and put a button in front of it, which is the only supported way to let someone
// ask for the install rather than waiting for the browser's own banner.
//
// iOS is the exception: Safari has never implemented beforeinstallprompt, and the only
// route is Share → Add to Home Screen. There we show the instruction instead.

import { useCallback, useEffect, useState } from 'react'

export const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true // iOS Safari's own flag

const isIos = () =>
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac; the touch points give it away
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

const isSafari = () => /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(window.navigator.userAgent)

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

    // the captured event is single-use — once prompted, it can't be replayed, and the
    // browser will hand us a fresh one later if the install still hasn't happened
    const install = useCallback(async () => {
        if(!deferred) return null
        deferred.prompt()
        const { outcome } = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }))
        setDeferred(null)
        return outcome
    },[deferred])

    const iosHint = !installed && isIos() && isSafari()

    return {
        canInstall: !!deferred && !installed,
        iosHint,                       // no prompt API here — tell them where the button is
        installed,
        install,
    }
}
