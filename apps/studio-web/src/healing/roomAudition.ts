import type { AtmosphereId, SoundModuleId } from './roomDesign'

/**
 * Local audition of a configured Healing Room. It voices, in the browser,
 * the chosen atmosphere through the chosen modules: it is a sketch of the
 * room's sound, not the venue renderer.
 */
export interface RoomSoundState {
  atmosphere: AtmosphereId
  modules: SoundModuleId[]
  /** 0..1 light level, mapped to brightness. */
  brightness: number
  /** Doppelgänger tone in Hz (twin atmosphere), null when absent. */
  twinHz: number | null
  /** Breath period in seconds. */
  breathSeconds: number
}

function noiseBuffer(context: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const buffer = context.createBuffer(2, Math.floor(context.sampleRate * seconds), context.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      if (brown) {
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.2
      } else {
        data[i] = white
      }
    }
  }
  return buffer
}

function impulse(context: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds)
  const buffer = context.createBuffer(2, length, context.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6)
  }
  return buffer
}

export class RoomAudition {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private bus: GainNode | null = null
  private dry: GainNode | null = null
  private wet: GainNode | null = null
  private tone: BiquadFilterNode | null = null
  private panner: StereoPannerNode | null = null
  private panLfo: OscillatorNode | null = null
  private panDepth: GainNode | null = null
  private sub: OscillatorNode | null = null
  private subGain: GainNode | null = null
  private layers: AudioNode[] = []
  private sources: Array<AudioScheduledSourceNode> = []
  private timer: number | null = null
  private state: RoomSoundState | null = null

  get playing(): boolean {
    return this.context !== null
  }

  async start(state: RoomSoundState): Promise<void> {
    if (this.context) {
      this.update(state)
      return
    }
    const context = new AudioContext()
    await context.resume()
    const master = context.createGain()
    master.gain.value = 0
    master.connect(context.destination)
    master.gain.linearRampToValueAtTime(0.85, context.currentTime + 1.6)

    const tone = context.createBiquadFilter()
    tone.type = 'lowpass'
    const panner = context.createStereoPanner()
    const dry = context.createGain()
    const wet = context.createGain()
    const reverb = context.createConvolver()
    reverb.buffer = impulse(context, 3.4)
    const bus = context.createGain()
    bus.connect(tone).connect(panner)
    panner.connect(dry).connect(master)
    panner.connect(reverb).connect(wet).connect(master)

    const panLfo = context.createOscillator()
    panLfo.frequency.value = 0.05
    const panDepth = context.createGain()
    panDepth.gain.value = 0
    panLfo.connect(panDepth).connect(panner.pan)
    panLfo.start()

    const sub = context.createOscillator()
    sub.frequency.value = 41
    const subGain = context.createGain()
    subGain.gain.value = 0
    sub.connect(subGain).connect(master)
    sub.start()

    Object.assign(this, { context, master, bus, dry, wet, tone, panner, panLfo, panDepth, sub, subGain })
    this.update(state)
  }

  update(state: RoomSoundState): void {
    const context = this.context
    if (!context || !this.bus || !this.tone || !this.dry || !this.wet || !this.panDepth || !this.subGain) return
    const previous = this.state
    this.state = state
    const now = context.currentTime
    const has = (id: SoundModuleId): boolean => state.modules.includes(id)

    // Modules shape the space of the sound.
    this.tone.frequency.setTargetAtTime(700 + state.brightness * 3800 + (has('shower') ? 1400 : 0), now, 0.4)
    this.wet.gain.setTargetAtTime(has('dome') ? 0.75 : has('walls') ? 0.45 : 0.22, now, 0.6)
    this.dry.gain.setTargetAtTime(has('dome') ? 0.55 : 0.85, now, 0.6)
    this.panDepth.gain.setTargetAtTime(has('ring') ? 0.85 : has('binaural') ? 0.35 : 0, now, 0.8)
    this.subGain.gain.setTargetAtTime(has('floor') ? 0.16 : 0, now, 0.8)

    if (!previous || previous.atmosphere !== state.atmosphere || previous.twinHz !== state.twinHz) {
      this.rebuildAtmosphere(state)
    }
  }

  private clearLayers(): void {
    const context = this.context
    if (!context) return
    for (const source of this.sources) {
      try {
        source.stop(context.currentTime + 0.8)
      } catch {
        // already stopped
      }
    }
    for (const node of this.layers) {
      if (node instanceof GainNode) node.gain.setTargetAtTime(0, context.currentTime, 0.25)
    }
    const old = [...this.layers]
    window.setTimeout(() => old.forEach((node) => node.disconnect()), 1200)
    this.layers = []
    this.sources = []
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  private rebuildAtmosphere(state: RoomSoundState): void {
    const context = this.context
    const bus = this.bus
    if (!context || !bus) return
    this.clearLayers()
    const fadeIn = (gain: GainNode, value: number): void => {
      gain.gain.value = 0
      gain.gain.setTargetAtTime(value, context.currentTime, 0.6)
    }

    const addNoise = (brown: boolean, type: BiquadFilterType, freq: number, q: number, level: number, lfoHz = 0, lfoDepth = 0): void => {
      const source = context.createBufferSource()
      source.buffer = noiseBuffer(context, 4, brown)
      source.loop = true
      const filter = context.createBiquadFilter()
      filter.type = type
      filter.frequency.value = freq
      filter.Q.value = q
      const gain = context.createGain()
      fadeIn(gain, level)
      source.connect(filter).connect(gain).connect(bus)
      source.start()
      this.sources.push(source)
      this.layers.push(gain, filter)
      if (lfoHz > 0) {
        const lfo = context.createOscillator()
        lfo.frequency.value = lfoHz
        const depth = context.createGain()
        depth.gain.value = lfoDepth
        lfo.connect(depth).connect(gain.gain)
        lfo.start()
        this.sources.push(lfo)
        this.layers.push(depth)
      }
    }

    const addDrone = (hz: number, level: number): void => {
      const gain = context.createGain()
      fadeIn(gain, level)
      for (const [ratio, detune, amp] of [[1, -4, 0.6], [1.5, 3, 0.25], [2, 6, 0.18]] as const) {
        const osc = context.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = hz * ratio
        osc.detune.value = detune
        const g = context.createGain()
        g.gain.value = amp
        osc.connect(g).connect(gain)
        osc.start()
        this.sources.push(osc)
        this.layers.push(g)
      }
      const breath = context.createOscillator()
      breath.frequency.value = 1 / Math.max(3, state.breathSeconds)
      const depth = context.createGain()
      depth.gain.value = level * 0.6
      breath.connect(depth).connect(gain.gain)
      breath.start()
      this.sources.push(breath)
      this.layers.push(gain, depth)
      gain.connect(bus)
    }

    const chirp = (base: number): void => {
      const osc = context.createOscillator()
      const gain = context.createGain()
      const t = context.currentTime
      const f = base * (1 + Math.random() * 0.5)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, t)
      osc.frequency.exponentialRampToValueAtTime(f * (Math.random() > 0.5 ? 1.35 : 0.72), t + 0.22)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.05, t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.35)
      osc.connect(gain).connect(bus)
      osc.start(t)
      osc.stop(t + 0.4)
    }

    switch (state.atmosphere) {
      case 'forest':
        addNoise(false, 'bandpass', 2400, 0.5, 0.05, 0.07, 0.02)
        addNoise(true, 'lowpass', 400, 0.7, 0.12)
        this.timer = window.setInterval(() => {
          if (Math.random() < 0.55) chirp(2200 + Math.random() * 1800)
        }, 900)
        break
      case 'water':
        addNoise(true, 'lowpass', 650, 0.8, 0.32, 0.09, 0.24)
        addNoise(false, 'highpass', 5200, 0.4, 0.012, 0.13, 0.01)
        this.timer = window.setInterval(() => {
          if (Math.random() < 0.3) chirp(1300 + Math.random() * 600)
        }, 1700)
        break
      case 'breath':
        addDrone(110, 0.16)
        addNoise(true, 'lowpass', 300, 0.7, 0.06)
        break
      case 'twin':
        addDrone(state.twinHz ?? 128, 0.15)
        addNoise(false, 'bandpass', 900, 3, 0.012, 0.11, 0.01)
        break
      case 'silence':
        addNoise(true, 'lowpass', 180, 0.5, 0.05)
        break
    }
  }

  stop(): void {
    const context = this.context
    if (!context) return
    this.clearLayers()
    this.master?.gain.setTargetAtTime(0, context.currentTime, 0.2)
    window.setTimeout(() => void context.close(), 700)
    this.context = null
    this.state = null
  }
}
