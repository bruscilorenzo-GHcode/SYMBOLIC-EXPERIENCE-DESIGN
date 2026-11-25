import type { IdiomEvent, IdiomScore, PlayComposition, SpatialFieldProfile } from '@aura-spec/play-engine'
import { buildIdiomScore } from '@aura-spec/play-engine'

/**
 * Local idiom audition. It voices the generative phrase as:
 * - continuous drone/harmony tuned to the idomatic scale (including microtones),
 * - melody and ornament events,
 * - the idiom rhythmic cycle,
 * - water/air noise layers.
 *
 * It is a studio audition, not the venue renderer. Each phrase is regenerated
 * at the cycle boundary with a slowly changing phrase index, so the music keeps
 * evolving without abrupt jumps in scale, harmony or tempo.
 */
export class PlayAudition {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private droneGain: GainNode | null = null
  private waterGain: GainNode | null = null
  private airGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private oscillators: OscillatorNode[] = []
  private noiseSources: AudioBufferSourceNode[] = []
  private pulseTimer: number | null = null
  private pulsePeriodMs = 750
  private beatCounter = 0
  private phraseCount = 0
  private currentScore: IdiomScore | null = null
  private currentComposition: PlayComposition | null = null
  private spatialField: SpatialFieldProfile = 'omni'
  private playing = false

  get isPlaying(): boolean {
    return this.playing
  }

  async start(composition: PlayComposition, spatialField: SpatialFieldProfile = 'omni'): Promise<void> {
    this.spatialField = spatialField
    if (this.playing) {
      this.update(composition)
      return
    }
    const context = new AudioContext()
    const master = context.createGain()
    master.gain.value = 0
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.knee.value = 14
    compressor.ratio.value = 5
    compressor.attack.value = 0.008
    compressor.release.value = 0.3
    master.connect(compressor).connect(context.destination)
    this.context = context
    this.master = master

    await context.resume()

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1400
    filter.Q.value = 2.5
    filter.connect(master)
    this.filter = filter

    const droneGain = context.createGain()
    droneGain.gain.value = 0.05
    droneGain.connect(filter)
    this.droneGain = droneGain

    this.currentComposition = composition
    this.currentScore = composition.music.idiomScore
    this.beatCounter = 0
    this.phraseCount = 0

    const score = this.currentScore
    const tonicHz = 55 * 2 ** (score.tonicPc / 12)
    const droneCents = [0, score.scaleCents[2] ?? 700, score.scaleCents[4] ?? 1200, 1200]
    const voices = [
      { cents: droneCents[0]!, detune: -4, gain: 0.26, type: 'sine' as OscillatorType },
      { cents: droneCents[1]!, detune: 3, gain: 0.2, type: 'triangle' as OscillatorType },
      { cents: droneCents[2]!, detune: -2, gain: 0.12, type: 'sine' as OscillatorType },
      { cents: droneCents[3]!, detune: 0.5, gain: 0.11, type: 'sine' as OscillatorType },
    ]
    for (const voice of voices) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = voice.type
      oscillator.frequency.value = tonicHz * 2 ** (voice.cents / 1200)
      oscillator.detune.value = voice.detune
      gain.gain.value = voice.gain
      oscillator.connect(gain).connect(droneGain)
      oscillator.start()
      this.oscillators.push(oscillator)
    }

    const waterGain = context.createGain()
    waterGain.gain.value = 0
    const waterFilter = context.createBiquadFilter()
    waterFilter.type = 'lowpass'
    waterFilter.frequency.value = 700
    waterFilter.Q.value = 0.8
    const waterSource = context.createBufferSource()
    waterSource.buffer = createNoiseBuffer(context)
    waterSource.loop = true
    waterSource.connect(waterFilter).connect(waterGain).connect(master)
    waterSource.start()
    this.noiseSources.push(waterSource)
    this.waterGain = waterGain

    const airGain = context.createGain()
    airGain.gain.value = 0
    const airFilter = context.createBiquadFilter()
    airFilter.type = 'highpass'
    airFilter.frequency.value = 2800
    airFilter.Q.value = 0.4
    const airSource = context.createBufferSource()
    airSource.buffer = createNoiseBuffer(context)
    airSource.loop = true
    airSource.connect(airFilter).connect(airGain).connect(master)
    airSource.start()
    this.noiseSources.push(airSource)
    this.airGain = airGain

    this.playing = true
    this.update(composition)
    this.retuneDrones(score)
    master.gain.setTargetAtTime(1, context.currentTime, 0.8)
  }

  /** The diagram is bound to the first speaker, so the audition follows it too. */
  setSpatialField(spatialField: SpatialFieldProfile): void {
    this.spatialField = spatialField
  }

  update(composition: PlayComposition): void {
    const context = this.context
    if (!context || !this.playing) return
    const now = context.currentTime
    const descriptor = composition.music.descriptor
    const score = composition.music.idiomScore
    const previousIdiom = this.currentScore?.idiomId
    this.currentComposition = composition
    if (previousIdiom !== score.idiomId) {
      this.beatCounter = 0
      this.phraseCount = 0
    }
    this.currentScore = score
    this.retuneDrones(score)
    this.filter?.frequency.setTargetAtTime(220 + descriptor.brightness * 3600, now, 0.8)
    this.filter?.Q.setTargetAtTime(0.7 + descriptor.roughness * 6.5, now, 0.8)
    this.droneGain?.gain.setTargetAtTime(0.02 + descriptor.density * 0.055, now, 0.7)
    this.waterGain?.gain.setTargetAtTime(
      composition.parameters.water * (0.035 + descriptor.brightness * 0.035),
      now,
      0.8,
    )
    this.airGain?.gain.setTargetAtTime(composition.parameters.wind * 0.026, now, 0.8)
    this.setPulse(descriptor.tempoBpm, composition)
  }

  stop(): void {
    if (this.pulseTimer !== null) {
      window.clearInterval(this.pulseTimer)
      this.pulseTimer = null
    }
    const context = this.context
    const master = this.master
    const oscillators = [...this.oscillators]
    const noiseSources = [...this.noiseSources]
    this.playing = false
    this.context = null
    this.master = null
    this.oscillators = []
    this.noiseSources = []
    this.droneGain = null
    this.waterGain = null
    this.airGain = null
    this.filter = null
    this.currentScore = null
    this.currentComposition = null
    if (context && master) {
      master.gain.cancelScheduledValues(context.currentTime)
      master.gain.setTargetAtTime(0, context.currentTime, 0.08)
    }
    const close = (): void => {
      for (const oscillator of oscillators) {
        try {
          oscillator.stop()
        } catch {
          // already stopped
        }
      }
      for (const source of noiseSources) {
        try {
          source.stop()
        } catch {
          // already stopped
        }
      }
      if (context) void context.close().catch(() => undefined)
    }
    if (typeof window !== 'undefined') window.setTimeout(close, 260)
    else close()
  }

  private retuneDrones(score: IdiomScore): void {
    const context = this.context
    if (!context) return
    const now = context.currentTime
    const tonicHz = 55 * 2 ** (score.tonicPc / 12)
    const cents = [0, score.scaleCents[2] ?? 700, score.scaleCents[4] ?? 1200, 1200]
    this.oscillators.forEach((oscillator, index) => {
      oscillator.frequency.setTargetAtTime(tonicHz * 2 ** ((cents[index] ?? 0) / 1200), now, 1.2)
    })
  }

  private setPulse(tempoBpm: number, composition: PlayComposition): void {
    const period = Math.max(120, Math.min(2000, 60000 / Math.max(20, tempoBpm)))
    if (Math.abs(period - this.pulsePeriodMs) < 20 && this.pulseTimer !== null) return
    this.pulsePeriodMs = period
    if (this.pulseTimer !== null) window.clearInterval(this.pulseTimer)
    this.pulseTimer = window.setInterval(() => this.tick(composition), period)
  }

  private tick(composition: PlayComposition): void {
    const context = this.context
    const master = this.master
    if (!context || !master || !this.playing) return
    const score = this.currentScore ?? composition.music.idiomScore
    const beat = this.beatCounter
    const events = score.events.filter((event) => event.role !== 'drone' && Math.abs(event.beat - beat) < 0.01)
    for (const event of events) this.playEvent(event, score)
    this.beatCounter += 1
    if (this.beatCounter >= score.cycleBeats) {
      this.beatCounter = 0
      this.phraseCount += 1
      this.currentScore = this.generatePhrase(composition, this.phraseCount)
      this.retuneDrones(this.currentScore)
    }
  }

  private generatePhrase(composition: PlayComposition, phraseIndex: number): IdiomScore {
    const descriptor = composition.music.descriptor
    const tempo = descriptor.tempoBpm
    const cycleBeats = composition.music.idiomScore.cycleBeats
    return buildIdiomScore(
      {
        tonicPc: descriptor.tonicPc,
        tempoBpm: tempo,
        density: descriptor.density,
        brightness: descriptor.brightness,
        roughness: descriptor.roughness,
        register: descriptor.register,
        seconds: phraseIndex * cycleBeats * (60 / tempo),
        seed: Math.round(descriptor.tonicPc * 131 + tempo * 17 + phraseIndex * 97 + composition.parameters.canopy * 1000),
      },
      composition.music.idiomId,
      { phraseIndex },
    )
  }

  private playEvent(event: IdiomEvent, score: IdiomScore): void {
    const context = this.context
    const master = this.master
    if (!context || !master) return
    const now = context.currentTime
    const beatDuration = 60 / Math.max(30, score.tempoBpm)
    const duration = Math.max(0.07, event.durationBeats * beatDuration)
    const voice = instrumentVoice(event)
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = voice.type
    oscillator.frequency.value = 440 * 2 ** ((event.midi - 69) / 12)
    const filter = context.createBiquadFilter()
    filter.type = voice.filter
    filter.frequency.value = voice.cutoff
    filter.Q.value = voice.q
    const peak = Math.max(0.002, Math.min(0.05, event.velocity * (event.role === 'percussion' ? 0.035 : 0.03)))
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(peak, now + Math.min(voice.attack, duration * 0.3))
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null
    if (panner) {
      panner.pan.value = event.pan
      oscillator.connect(filter).connect(gain).connect(panner).connect(master)
    } else {
      oscillator.connect(filter).connect(gain).connect(master)
    }
    if (voice.vibratoHz && voice.vibratoCents) {
      const lfo = context.createOscillator()
      const lfoGain = context.createGain()
      lfo.frequency.value = voice.vibratoHz
      lfoGain.gain.value = voice.vibratoCents
      lfo.connect(lfoGain).connect(oscillator.detune)
      lfo.start(now)
      lfo.stop(now + duration + 0.03)
    }
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  }
}

function instrumentVoice(event: IdiomEvent): {
  type: OscillatorType
  filter: BiquadFilterType
  cutoff: number
  q: number
  attack: number
  vibratoHz?: number
  vibratoCents?: number
} {
  if (event.role === 'percussion') {
    return { type: 'triangle', filter: 'lowpass', cutoff: 1800, q: 0.7, attack: 0.004 }
  }
  switch (event.timbre) {
    case 'piano':
      return { type: 'triangle', filter: 'lowpass', cutoff: 4200, q: 0.6, attack: 0.006 }
    case 'cello':
      return { type: 'sawtooth', filter: 'lowpass', cutoff: 900, q: 1.1, attack: 0.14, vibratoHz: 5, vibratoCents: 6 }
    case 'guitar':
      return { type: 'sawtooth', filter: 'lowpass', cutoff: 2400, q: 1.4, attack: 0.004 }
    case 'flute':
      return { type: 'sine', filter: 'lowpass', cutoff: 4800, q: 0.5, attack: 0.08, vibratoHz: 5.5, vibratoCents: 3 }
    case 'sitar':
      return { type: 'sawtooth', filter: 'bandpass', cutoff: 1200, q: 3.4, attack: 0.004, vibratoHz: 4.5, vibratoCents: 4 }
    case 'pad':
    case 'string-drone':
    case 'modal-drone':
    case 'sub-drone':
    case 'tanpura':
      return { type: 'sine', filter: 'lowpass', cutoff: 1400, q: 0.8, attack: 0.24 }
    case 'air-texture':
      return { type: 'sine', filter: 'highpass', cutoff: 1600, q: 0.5, attack: 0.18 }
    default:
      return { type: 'sine', filter: 'lowpass', cutoff: 2600, q: 0.7, attack: 0.02 }
  }
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * 2))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1
    last = last * 0.92 + white * 0.08
    data[index] = last
  }
  return buffer
}
