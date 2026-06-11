// tiny Web Audio synth for game sound effects — no audio assets needed
let ctx = null

const ac = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
}

// explosion boom — gets louder, brighter and punchier with chain depth
export const playExplosion = (intensity = 0) => {
    const c = ac()
    const t = c.currentTime
    const i = Math.min(intensity, 8)

    // noise burst through a lowpass that opens up as the chain grows
    const dur = 0.18 + i * 0.02
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
    const data = buf.getChannelData(0)
    for (let n = 0; n < data.length; n++) data[n] = (Math.random() * 2 - 1) * (1 - n / data.length)
    const src = c.createBufferSource()
    src.buffer = buf
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 700 + i * 300
    const g = c.createGain()
    g.gain.setValueAtTime(Math.min(0.22 + i * 0.05, 0.6), t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(filter); filter.connect(g); g.connect(c.destination)
    src.start(t)

    // low sine thump underneath
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140 + i * 12, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25)
    const og = c.createGain()
    og.gain.setValueAtTime(Math.min(0.25 + i * 0.04, 0.55), t)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    osc.connect(og); og.connect(c.destination)
    osc.start(t); osc.stop(t + 0.3)
}

// short victory arpeggio
export const playWin = () => {
    const c = ac()
    const t = c.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((f, n) => {
        const osc = c.createOscillator()
        osc.type = 'triangle'
        osc.frequency.value = f
        const g = c.createGain()
        const start = t + n * 0.11
        g.gain.setValueAtTime(0.0001, start)
        g.gain.linearRampToValueAtTime(0.3, start + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, start + (n === notes.length - 1 ? 0.6 : 0.18))
        osc.connect(g); g.connect(c.destination)
        osc.start(start); osc.stop(start + 0.65)
    })
}

// low buzz for an illegal move
export const playDenied = () => {
    const c = ac()
    const t = c.currentTime
    const osc = c.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.linearRampToValueAtTime(90, t + 0.09)
    const g = c.createGain()
    g.gain.setValueAtTime(0.07, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.11)
}

// soft UI blip for menu buttons
export const playClick = () => {
    const c = ac()
    const t = c.currentTime
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, t)
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.06)
    const g = c.createGain()
    g.gain.setValueAtTime(0.12, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.1)
}
