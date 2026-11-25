import type { TraditionId } from '@aura-spec/metaplace'

/**
 * A sketch of the Metaplace soundscape: the music bar as a soft pulse, rehab
 * and sport as a breathing drone, the atelier as sea noise with gull-like
 * flute phrases the voice could graft onto. Weights follow the modulation.
 */
export class MetaplaceAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private gains: Record<TraditionId, GainNode> | null = null
  private filter: BiquadFilterNode | null = null
  private timers: number[] = []
  private nodes: AudioScheduledSourceNode[] = []
  private weights: Record<TraditionId, number> = { bar: 0.33, rehab: 0.33, atelier: 0.33 }
  private virtual = 0.3

  get playing(): boolean {
    return this.context !== null
  }

  async start(weights: Record<TraditionId, number>, virtual: number): Promise<void> {
    if (this.context) {
      this.update(weights, virtual)
      return
    }
    const context = new AudioContext()
    await context.resume()
    const master = context.createGain()
    master.gain.value = 0
    master.gain.linearRampToValueAtTime(0.8, context.currentTime + 1.5)
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 5000
    const delay = context.createDelay(1)
    delay.delayTime.value = 0.36
    const feedback = context.createGain()
    feedback.gain.value = 0.32
    filter.connect(master)
    filter.connect(delay)
    delay.connect(feedback).connect(delay)
    delay.connect(master)
    master.connect(context.destination)

    const make = (): GainNode => {
      const g = context.createGain()
      g.gain.value = 0
      g.connect(filter)
      return g
    }
    const gains = { bar: make(), rehab: make(), atelier: make() }

    // Rehab: drone breathing.
    for (const [hz, amp] of [[73.4, 0.5], [110, 0.3], [146.8, 0.18]] as const) {
      const osc = context.createOscillator()
      osc.frequency.value = hz
      const g = context.createGain()
      g.gain.value = amp * 0.18
      osc.connect(g).connect(gains.rehab)
      osc.start()
      this.nodes.push(osc)
    }
    const lfo = context.createOscillator()
    lfo.frequency.value = 0.12
    const depth = context.createGain()
    depth.gain.value = 0.06
    lfo.connect(depth).connect(gains.rehab.gain)
    lfo.start()
    this.nodes.push(lfo)

    // Atelier: sea.
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3
    }
    const sea = context.createBufferSource()
    sea.buffer = buffer
    sea.loop = true
    const seaFilter = context.createBiquadFilter()
    seaFilter.type = 'lowpass'
    seaFilter.frequency.value = 700
    const seaGain = context.createGain()
    seaGain.gain.value = 0.35
    const swell = context.createOscillator()
    swell.frequency.value = 0.08
    const swellDepth = context.createGain()
    swellDepth.gain.value = 0.25
    swell.connect(swellDepth).connect(seaGain.gain)
    sea.connect(seaFilter).connect(seaGain).connect(gains.atelier)
    sea.start()
    swell.start()
    this.nodes.push(sea, swell)

    Object.assign(this, { context, master, gains, filter })
    this.update(weights, virtual)

    // Bar pulse and atelier flutes.
    const scale = [0, 3, 5, 7, 10, 12, 15]
    this.timers.push(
      window.setInterval(() => this.pulse(), 536),
      window.setInterval(() => {
        if (Math.random() < 0.5) this.flute(392 * Math.pow(2, scale[Math.floor(Math.random() * scale.length)]! / 12))
      }, 1400),
    )
  }

  private pulse(): void {
    const context = this.context
    if (!context || !this.gains) return
    const t = context.currentTime
    const osc = context.createOscillator()
    const g = context.createGain()
    osc.frequency.setValueAtTime(120, t)
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.18)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(g).connect(this.gains.bar)
    osc.start(t)
    osc.stop(t + 0.32)
  }

  private flute(hz: number): void {
    const context = this.context
    if (!context || !this.gains) return
    const t = context.currentTime
    const osc = context.createOscillator()
    const vib = context.createOscillator()
    const vibDepth = context.createGain()
    const g = context.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(hz, t)
    osc.frequency.linearRampToValueAtTime(hz * (Math.random() > 0.5 ? 1.06 : 0.94), t + 0.9)
    vib.frequency.value = 5.2
    vibDepth.gain.value = hz * 0.008
    vib.connect(vibDepth).connect(osc.frequency)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.09, t + 0.12)
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
    osc.connect(g).connect(this.gains.atelier)
    osc.start(t)
    vib.start(t)
    osc.stop(t + 1.2)
    vib.stop(t + 1.2)
  }

  update(weights: Record<TraditionId, number>, virtual: number): void {
    this.weights = weights
    this.virtual = virtual
    const context = this.context
    if (!context || !this.gains || !this.filter) return
    const now = context.currentTime
    this.gains.bar.gain.setTargetAtTime(this.weights.bar * 0.9, now, 0.4)
    this.gains.rehab.gain.setTargetAtTime(this.weights.rehab * 1.1, now, 0.4)
    this.gains.atelier.gain.setTargetAtTime(this.weights.atelier * 1.1, now, 0.4)
    this.filter.frequency.setTargetAtTime(6500 - this.virtual * 4800, now, 0.5)
  }

  stop(): void {
    const context = this.context
    if (!context) return
    this.timers.forEach((id) => window.clearInterval(id))
    this.timers = []
    this.master?.gain.setTargetAtTime(0, context.currentTime, 0.2)
    window.setTimeout(() => void context.close(), 700)
    this.context = null
    this.gains = null
    this.nodes = []
  }
}
