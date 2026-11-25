import type { DoppelgangerSpec, HealingSoundbed, MindStateId } from '@aura-spec/healing-room'
import { soundbedForMindState } from '@aura-spec/healing-room'

/**
 * Local Healing Room audition: a drone bed whose gain breathes at the
 * doppelgänger's breath rate, a filtered air layer and a soft heartbeat
 * pulse. It voices the sound shower of the station locally in the browser;
 * it is a studio audition, not the venue renderer.
 */
export class HealingAudition {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private breathGain: GainNode | null = null
  private airGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private oscillators: OscillatorNode[] = []
  private noiseSource: AudioBufferSourceNode | null = null
  private breathLfo: OscillatorNode | null = null
  private lfoDepth: GainNode | null = null
  private pulseTimer: number | null = null
  private playing = false

  get isPlaying(): boolean {
    return this.playing
  }

  async start(soundbed: HealingSoundbed, doppelganger: DoppelgangerSpec | null): Promise<void> {
    if (this.playing) {
      this.update(soundbed, doppelganger)
      return
    }
    const context = new AudioContext()
    const master = context.createGain()
    master.gain.value = 0
    master.connect(context.destination)
    this.context = context
    this.master = master
    await context.resume()

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    filter.Q.value = 1.4
    filter.connect(master)
    this.filter = filter

    const breathGain = context.createGain()
    breathGain.gain.value = 0.05
    breathGain.connect(filter)
    this.breathGain = breathGain

    for (const [ratio, detune, gain, type] of [
      [1, -3, 0.32, 'sine'],
      [2, 4, 0.14, 'sine'],
      [2.996, 6, 0.07, 'triangle'],
    ] as const) {
      const oscillator = context.createOscillator()
      oscillator.type = type
      oscillator.frequency.value = soundbed.droneHz * ratio
      oscillator.detune.value = detune
      const voiceGain = context.createGain()
      voiceGain.gain.value = gain
      oscillator.connect(voiceGain).connect(breathGain)
      oscillator.start()
      this.oscillators.push(oscillator)
    }

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const channel = noiseBuffer.getChannelData(0)
    for (let index = 0; index < channel.length; index++) {
      channel[index] = Math.random() * 2 - 1
    }
    const noise = context.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true
    const airGain = context.createGain()
    airGain.gain.value = 0.012
    noise.connect(airGain).connect(filter)
    noise.start()
    this.noiseSource = noise
    this.airGain = airGain

    const lfo = context.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 1 / soundbed.breathSeconds
    const lfoDepth = context.createGain()
    lfoDepth.gain.value = 0.03
    lfo.connect(lfoDepth).connect(breathGain.gain)
    lfo.start()
    this.breathLfo = lfo
    this.lfoDepth = lfoDepth

    master.gain.linearRampToValueAtTime(0.8, context.currentTime + 1.6)
    this.playing = true
    this.schedulePulse(soundbed, doppelganger)
  }

  update(soundbed: HealingSoundbed, doppelganger: DoppelgangerSpec | null): void {
    const context = this.context
    if (!context || !this.playing) return
    const now = context.currentTime
    for (const [index, oscillator] of this.oscillators.entries()) {
      oscillator.frequency.setTargetAtTime(soundbed.droneHz * (index === 0 ? 1 : index === 1 ? 2 : 2.996), now, 0.6)
    }
    this.filter?.frequency.setTargetAtTime(500 + soundbed.brightness * 1600, now, 0.8)
    this.airGain?.gain.setTargetAtTime(0.006 + soundbed.density * 0.02, now, 0.8)
    this.lfoDepth?.gain.setTargetAtTime(0.02 + soundbed.density * 0.03, now, 0.8)
    const breathHz = doppelganger?.breathHz ?? 1 / soundbed.breathSeconds
    this.breathLfo?.frequency.setTargetAtTime(breathHz, now, 0.8)
  }

  stop(): void {
    const context = this.context
    if (!context) return
    const now = context.currentTime
    this.master?.gain.cancelScheduledValues(now)
    this.master?.gain.setTargetAtTime(0, now, 0.25)
    if (this.pulseTimer !== null) {
      window.clearTimeout(this.pulseTimer)
      this.pulseTimer = null
    }
    const oscillators = this.oscillators
    this.oscillators = []
    const noise = this.noiseSource
    this.noiseSource = null
    const lfo = this.breathLfo
    this.breathLfo = null
    window.setTimeout(() => {
      for (const oscillator of oscillators) {
        try { oscillator.stop() } catch { /* already stopped */ }
      }
      try { noise?.stop() } catch { /* already stopped */ }
      try { lfo?.stop() } catch { /* already stopped */ }
      void context.close()
    }, 600)
    this.playing = false
    this.context = null
    this.master = null
  }

  private schedulePulse(soundbed: HealingSoundbed, doppelganger: DoppelgangerSpec | null): void {
    if (!this.playing || !this.context || !this.master) return
    const context = this.context
    const breathHz = doppelganger?.breathHz ?? 1 / soundbed.breathSeconds
    const pulse = context.createOscillator()
    pulse.type = 'sine'
    pulse.frequency.value = soundbed.droneHz * 1.5
    const pulseGain = context.createGain()
    pulseGain.gain.value = 0
    pulseGain.gain.setValueAtTime(0, context.currentTime)
    pulseGain.gain.linearRampToValueAtTime(0.05, context.currentTime + 0.04)
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6)
    pulse.connect(pulseGain).connect(this.master)
    pulse.start()
    pulse.stop(context.currentTime + 0.7)
    this.pulseTimer = window.setTimeout(() => this.schedulePulse(soundbed, doppelganger), (1 / breathHz) * 1000)
  }
}

export function soundbedForState(mindState: MindStateId): HealingSoundbed {
  return soundbedForMindState(mindState)
}
