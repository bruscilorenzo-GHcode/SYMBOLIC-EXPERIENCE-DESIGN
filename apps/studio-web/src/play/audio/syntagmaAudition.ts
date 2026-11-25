import { WorkletSynthesizer } from 'spessasynth_lib'
import type { IdiomScore, PlayComposition, SpatialFieldProfile } from '@aura-spec/play-engine'
import { buildIdiomScore } from '@aura-spec/play-engine'
import { PlayAudition } from './playAudition'
import { StemEngine, stemGenreForIdiom, type StemSourceReadout } from './stemEngine'

const PROCESSOR_URL = '/sonifier/spessasynth_processor.min.js'
const SOUNDFONT_URL = '/sonifier/default.sf2'

const PROGRAM_BY_INSTRUMENT: Record<string, number> = {
  piano: 0,
  cello: 42,
  strings: 48,
  brass: 61,
  synth: 81,
  'electric-guitar': 27,
  sitar: 104,
  'spectral-pad': 89,
  'sub-drone': 89,
  'string-drone': 89,
  'cinema-drone': 89,
  'sub-bass': 38,
  'modal-drone': 89,
  tanpura: 89,
}

/**
 * SoundFont audition built on the SYNTAGMA stack:
 * AudioWorklet + spessasynth_lib + the bundled default.sf2 (used as the
 * Maestro-compatible classical bank). The generated idiom phrase is sent as
 * MIDI to three channels — harmonic, melodic, drone — while percussion uses
 * channel 10. Phrases regenerate at every cycle and are always modulated by the
 * latest human parameters.
 *
 * If the worklet or soundfont cannot start, it falls back to the local
 * oscillator audition so the studio never goes silent.
 */
export class SyntagmaAudition {
  private context: AudioContext | null = null
  private synth: WorkletSynthesizer | null = null
  private master: GainNode | null = null
  private beatTimer: number | null = null
  private noteTimers = new Set<number>()
  private crossfadeTimer: number | null = null
  private playing = false
  private ramping = false
  private beatCounter = 0
  private phraseIndex = 0
  private currentScore: IdiomScore | null = null
  private composition: PlayComposition | null = null
  private fallback: PlayAudition | null = null
  private initPromise: Promise<boolean> | null = null
  private spatialField: SpatialFieldProfile = 'omni'
  private stemEngine: StemEngine | null = null
  private sources: StemSourceReadout[] = []

  get isPlaying(): boolean {
    return this.playing
  }

  async start(composition: PlayComposition, spatialField: SpatialFieldProfile = 'omni'): Promise<void> {
    this.spatialField = spatialField
    if (this.playing) {
      this.update(composition)
      return
    }
    this.composition = composition
    const ok = await this.init(composition)
    if (!ok) {
      this.fallback = new PlayAudition()
      await this.fallback.start(composition)
      this.playing = true
      return
    }
    this.playing = true
    this.currentScore = composition.music.idiomScore
    this.beatCounter = 0
    this.phraseIndex = 0
    const genre = stemGenreForIdiom(composition.music.idiomId)
    if (genre && this.synth && this.context && this.master) {
      this.stemEngine = new StemEngine(this.synth, this.context, this.master, genre, composition, (sources) => {
        this.sources = sources
      })
      try {
        await this.stemEngine.start()
      } catch (error) {
        console.warn('[SyntagmaAudition] stem library unavailable at start, using generative fallback:', error)
        this.stemEngine = null
        this.applyPrograms(this.currentScore)
        this.startBeat(composition.music.descriptor.tempoBpm)
        this.applyExpressiveControls()
      }
    } else {
      this.applyPrograms(this.currentScore)
      this.startBeat(composition.music.descriptor.tempoBpm)
      this.applyExpressiveControls()
    }
    this.fadeTo(0.8, 0.4)
  }

  setSpatialField(field: SpatialFieldProfile): void {
    this.spatialField = field
  }

  getSources(): StemSourceReadout[] {
    return this.sources
  }

  update(composition: PlayComposition): void {
    if (this.fallback) {
      this.fallback.update(composition)
      return
    }
    if (!this.playing || !this.context) return
    const previous = this.composition
    this.composition = composition
    if (!previous) return
    const prev = previous.music.descriptor
    const next = composition.music.descriptor
    const previousGenre = stemGenreForIdiom(previous.music.idiomId)
    const nextGenre = stemGenreForIdiom(composition.music.idiomId)
    const radical =
      previousGenre !== nextGenre ||
      previous.music.idiomId !== composition.music.idiomId ||
      Math.abs(prev.tempoBpm - next.tempoBpm) > 8 ||
      Math.abs(prev.density - next.density) > 0.2 ||
      Math.abs(prev.brightness - next.brightness) > 0.2

    if (radical && !this.ramping) {
      this.ramping = true
      const now = this.context.currentTime
      this.master?.gain.cancelScheduledValues(now)
      this.master?.gain.linearRampToValueAtTime(0, now + 0.15)
      this.crossfadeTimer = window.setTimeout(() => {
        const latest = this.composition
        if (!latest) return
        this.beatCounter = 0
        this.phraseIndex = 0
        this.currentScore = latest.music.idiomScore
        const genre = stemGenreForIdiom(latest.music.idiomId)
        if (genre) {
          if (this.stemEngine && previousGenre === genre) {
            this.stemEngine.update(latest)
          } else {
            this.stemEngine?.stop()
            this.stemEngine = null
            if (this.synth && this.context && this.master) {
              this.stemEngine = new StemEngine(this.synth, this.context, this.master, genre, latest, (sources) => {
                this.sources = sources
              })
              void this.stemEngine.start().catch((error) => {
                console.warn('[SyntagmaAudition] stem library unavailable, using generative fallback:', error)
                this.stemEngine = null
                this.applyPrograms(latest.music.idiomScore)
                this.startBeat(latest.music.descriptor.tempoBpm)
              })
            }
          }
        } else {
          this.stemEngine?.stop()
          this.stemEngine = null
          this.applyPrograms(latest.music.idiomScore)
          this.startBeat(latest.music.descriptor.tempoBpm)
          this.applyExpressiveControls()
        }
        this.ramping = false
        this.fadeTo(0.8, 0.15)
      }, 160)
      return
    }

    if (nextGenre && this.stemEngine) {
      this.stemEngine.update(composition)
      return
    }
    if (!nextGenre) this.applyExpressiveControls()
  }

  private applyExpressiveControls(): void {
    const composition = this.composition
    const synth = this.synth
    if (!composition || !synth) return
    const reverb = Math.round(
      Math.min(127, Math.max(0, (0.16 + composition.parameters.canopy * 0.48 + composition.parameters.water * 0.22) * 127)),
    )
    const brightness = Math.round(
      Math.min(127, Math.max(0, composition.music.descriptor.brightness * 127)),
    )
    for (const channel of [0, 1, 2, 9]) {
      try {
        synth.controllerChange(channel, 91, reverb)
        synth.controllerChange(channel, 74, brightness)
      } catch {
        // Effects are optional.
      }
    }
  }

  stop(): void {
    if (this.fallback) {
      this.fallback.stop()
      this.fallback = null
      this.playing = false
      return
    }
    if (this.beatTimer !== null) window.clearInterval(this.beatTimer)
    this.beatTimer = null
    if (this.crossfadeTimer !== null) window.clearTimeout(this.crossfadeTimer)
    this.crossfadeTimer = null
    for (const timer of this.noteTimers) window.clearTimeout(timer)
    this.noteTimers.clear()
    const context = this.context
    const synth = this.synth
    const master = this.master
    this.playing = false
    this.stemEngine?.stop()
    this.stemEngine = null
    this.sources = []
    this.context = null
    this.synth = null
    this.master = null
    this.currentScore = null
    this.composition = null
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime)
      master.gain.setTargetAtTime(0, context.currentTime, 0.05)
    }
    try {
      synth?.stopAll(true)
    } catch {
      // ignore
    }
    if (context) {
      window.setTimeout(() => { void context.close().catch(() => undefined) }, 220)
    }
  }

  private async init(composition: PlayComposition): Promise<boolean> {
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      try {
        const context = new AudioContext()
        await context.audioWorklet.addModule(PROCESSOR_URL)
        const synth = new WorkletSynthesizer(context, { eventsEnabled: true })
        await synth.isReady
        const response = await fetch(SOUNDFONT_URL)
        if (!response.ok) throw new Error(`SoundFont HTTP ${response.status}`)
        await synth.soundBankManager.addSoundBank(await response.arrayBuffer(), 'default')
        const master = context.createGain()
        master.gain.value = 0
        const compressor = context.createDynamicsCompressor()
        compressor.threshold.value = -8
        compressor.knee.value = 12
        compressor.ratio.value = 5
        compressor.attack.value = 0.004
        compressor.release.value = 0.2
        synth.connect(master)
        master.connect(compressor).connect(context.destination)
        this.context = context
        this.synth = synth
        this.master = master
        this.currentScore = composition.music.idiomScore
        return true
      } catch (error) {
        console.warn('[SyntagmaAudition] SoundFont unavailable, using oscillator fallback:', error)
        return false
      }
    })()
    return this.initPromise
  }

  private applyPrograms(score: IdiomScore): void {
    const synth = this.synth
    if (!synth) return
    synth.programChange(0, PROGRAM_BY_INSTRUMENT[score.instruments.harmonic.id] ?? 0)
    synth.programChange(1, PROGRAM_BY_INSTRUMENT[score.instruments.melodic.id] ?? 0)
    synth.programChange(2, PROGRAM_BY_INSTRUMENT[score.instruments.drone.id] ?? 89)
  }

  private startBeat(tempoBpm: number): void {
    if (this.beatTimer !== null) window.clearInterval(this.beatTimer)
    const period = Math.max(120, Math.min(2000, 60000 / Math.max(30, tempoBpm)))
    this.beatTimer = window.setInterval(() => this.tick(), period)
  }

  private tick(): void {
    if (!this.playing || !this.synth || !this.context) return
    const score = this.currentScore
    if (!score) return
    const beat = this.beatCounter
    const events = score.events.filter((event) => Math.abs(event.beat - beat) < 0.01)
    const beatMs = 60000 / Math.max(30, score.tempoBpm)
    for (const event of events) {
      const channel = event.role === 'percussion' ? 9 : event.role === 'drone' ? 2 : event.role === 'melody' || event.role === 'ornament' ? 1 : 0
      const note = Math.round(event.midi)
      const cents = (event.midi - note) * 100
      this.synth.pitchWheel(channel, Math.round(Math.min(16383, Math.max(0, 8192 + (cents / 200) * 8192))))
      const spread = this.spatialField === 'omni' ? 1 : this.spatialField === 'line' ? 0.35 : 0.1
      try {
        this.synth.controllerChange(channel, 10, Math.round(64 + Math.max(-1, Math.min(1, event.pan * spread)) * 63))
      } catch {
        // Pan is optional; the note must still play.
      }
      const velocity = Math.max(1, Math.min(127, Math.round(event.velocity * 110)))
      this.synth.noteOn(channel, note, velocity)
      if (event.role === 'melody' && this.composition) {
        const granularity = Math.min(0.32, this.composition.parameters.wind * 0.18 + score.tension * 0.14)
        if (Math.random() < granularity) {
          this.scheduleGranule(channel, note + (Math.random() > 0.5 ? 12 : -12), Math.max(1, Math.round(velocity * 0.55)))
        }
      }
      const timer = window.setTimeout(() => {
        try {
          this.synth?.noteOff(channel, note)
        } catch {
          // ignore
        }
        this.noteTimers.delete(timer)
      }, Math.max(80, event.durationBeats * beatMs))
      this.noteTimers.add(timer)
    }
    this.beatCounter += 1
    if (this.beatCounter >= score.cycleBeats) {
      this.beatCounter = 0
      this.phraseIndex += 1
      this.currentScore = this.generatePhrase()
      if (this.currentScore) this.applyPrograms(this.currentScore)
    }
  }

  private scheduleGranule(channel: number, note: number, velocity: number): void {
    const synth = this.synth
    if (!synth || !this.context) return
    const delay = 90 + Math.random() * 160
    const timer = window.setTimeout(() => {
      try {
        synth.noteOn(channel, Math.max(0, Math.min(127, note)), velocity)
        const off = window.setTimeout(() => {
          try {
            synth.noteOff(channel, Math.max(0, Math.min(127, note)))
          } catch {
            // ignore
          }
          this.noteTimers.delete(off)
        }, 80 + Math.random() * 120)
        this.noteTimers.add(off)
      } catch {
        // ignore
      }
      this.noteTimers.delete(timer)
    }, delay)
    this.noteTimers.add(timer)
  }

  private generatePhrase(): IdiomScore | null {
    const composition = this.composition
    const previous = this.currentScore
    if (!composition || !previous) return null
    const descriptor = composition.music.descriptor
    const tempo = descriptor.tempoBpm
    return buildIdiomScore(
      {
        tonicPc: (descriptor.tonicPc + (composition.music.idiomId === 'soundscape' ? Math.round((composition.parameters.water - 0.5) * 6 + (composition.parameters.light - 0.5) * 4) : 0) + 12) % 12,
        tempoBpm: tempo,
        density: descriptor.density,
        brightness: descriptor.brightness,
        roughness: descriptor.roughness,
        register: descriptor.register,
        seconds: this.phraseIndex * previous.cycleBeats * (60 / tempo),
        seed: Math.round(descriptor.tonicPc * 131 + tempo * 17 + this.phraseIndex * 97 + composition.parameters.canopy * 1000),
      },
      composition.music.idiomId,
      { phraseIndex: this.phraseIndex },
    )
  }

  private fadeTo(value: number, seconds: number): void {
    const context = this.context
    const master = this.master
    if (!context || !master) return
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now)
    master.gain.linearRampToValueAtTime(value, now + seconds)
  }
}
