// serverless WebRTC connection setup — no signaling server, no library.
// Two peers exchange one base64 blob each (offer, then answer) through
// whatever out-of-band channel they already use (chat, text, etc), then
// talk directly over a single ordered/reliable RTCDataChannel.

export const ICE_SERVERS = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

export const encodeBlob = (obj) => btoa(encodeURIComponent(JSON.stringify(obj)))

export const decodeBlob = (text) => {
    try {
        return JSON.parse(decodeURIComponent(atob(text.trim())))
    } catch {
        return null
    }
}

// non-trickle ICE: there's no live signaling channel to trickle candidates
// over, so we wait for gathering to finish (or time out) and bundle every
// candidate the browser found into the one blob we hand over
export const waitForIceGatheringComplete = (pc, timeoutMs = 4000) => {
    if (pc.iceGatheringState === 'complete') return Promise.resolve()
    return new Promise((resolve) => {
        const done = () => {
            pc.removeEventListener('icegatheringstatechange', check)
            clearTimeout(timer)
            resolve()
        }
        const check = () => { if (pc.iceGatheringState === 'complete') done() }
        pc.addEventListener('icegatheringstatechange', check)
        const timer = setTimeout(done, timeoutMs)
    })
}

export const createHostConnection = () => new RTCPeerConnection({ iceServers: ICE_SERVERS })
export const createGuestConnection = () => new RTCPeerConnection({ iceServers: ICE_SERVERS })

export const createOffer = async (pc) => {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await waitForIceGatheringComplete(pc)
    return pc.localDescription
}

export const createAnswer = async (pc, offerDesc) => {
    await pc.setRemoteDescription(offerDesc)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await waitForIceGatheringComplete(pc)
    return pc.localDescription
}

// resolves once the guest's incoming data channel actually opens
export const waitForDataChannel = (pc) => new Promise((resolve) => {
    pc.addEventListener('datachannel', (e) => {
        const channel = e.channel
        if (channel.readyState === 'open') resolve(channel)
        else channel.addEventListener('open', () => resolve(channel), { once: true })
    }, { once: true })
})
