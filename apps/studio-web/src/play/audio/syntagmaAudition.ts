import { WorkletSynthesizer } from 'spessasynth_lib'
import type { IdiomScore, PlayComposition, SpatialFieldProfile } from '@aura-spec/play-engine'
import { buildIdiomScore } from '@aura-spec/play-engine'
import { PlayAudition } from './playAudition'
import { StemEngine, stemGenreForIdiom, type StemSourceReadout } from './stemEngine'
import {
  EVENT_MAX_DURATION_MS,
  HeldNoteRegistry,
  clampMidi,
  clampVelocity,
} from './noteScheduler'

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
  private held = new HeldNoteRegistry()
  private crossfadeTimer: number | null = null
  private playing = false
  private ramping = false
  private beatCounter = 0
  private phraseIndex = 0
  private currentScore: IdiomScore | null = null
  private composition: PlayComposition | null = null
  private fallback: PlayAudition | null = null
  private initPromise: Promise<boolean> | null = null
  private initReady = false
  private spatialField: SpatialFieldProfile = 'omni'
  private stemEngine: StemEngine | null = null
  private sources: StemSourceReadout[] = []

  get isPlaying(): boolean {
    return this.playing
  }

  async start(composition: PlayComposition, spatialField: SpatialFieldProfile = 'omni'): Promise<void> {
    this.spatialField = spatialField
    if (this.fallback) {
      if (this.fallback.isPlaying) this.fallback.update(composition)
      else await this.fallback.start(composition)
      this.playing = true
      return
    }
    if (this.playing && this.context && this.context.state === 'running') {
      this.update(composition)
      return
    }
    if (this.playing && this.context?.state === 'suspended') {
      try {
        await this.context.resume()
        this.update(composition)
        return
      } catch {
        // Fall through to a clean re-initialisation.
      }
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
    for (const { channel, midi } of this.held.releaseAll()) {
      try {
        this.synth?.noteOff(channel, midi)
      } catch {
        // The voice may already be gone.
      }
    }
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
    this.initPromise = null
    this.initReady = false
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
    // A live context is reusable; a stopped engine has none, so re-initialise
    // instead of trusting a resolved promise from the previous session.
    if (this.initReady && this.context && this.context.state !== 'closed') {
      if (this.context.state === 'suspended') {
        try {
          await this.context.resume()
        } catch {
          // The browser will retry on the next user gesture.
        }
      }
      return true
    }
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      let context: AudioContext | null = null
      try {
        context = new AudioContext()
        await context.audioWorklet.addModule(PROCESSOR_URL)
        const synth = new WorkletSynthesizer(context, { eventsEnabled: true })
        // A processor/library version mismatch makes isReady wait forever;
        // time out so the oscillator fallback can take over instead of silence.
        await withTimeout(synth.isReady, 8000, 'spessasynth isReady')
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
        this.initReady = true
        this.currentScore = composition.music.idiomScore
        return true
      } catch (error) {
        console.warn('[SyntagmaAudition] SoundFont unavailable, using oscillator fallback:', error)
        this.initReady = false
        this.initPromise = null
        try {
          await context?.close()
        } catch {
          // The context may already be closed.
        }
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
    const drones = events.filter((event) => event.role === 'drone')
    // The harmonic bed must breathe: one cycle in five rests, and on the other
    // cycles one drone voice is dropped in rotation. Without this the two drone
    // pitches sustain through every cycle and the field reads as static.
    const restDrone = this.phraseIndex > 0 && this.phraseIndex % 5 === 4
    const dropDroneIndex = drones.length > 1 ? this.phraseIndex % drones.length : -1
    for (const event of events) {
      if (event.role === 'drone') {
        if (restDrone) continue
        if (drones.indexOf(event) === dropDroneIndex) continue
      }
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
      const velocityScale = event.role === 'drone' ? 0.72 : 1
      const velocity = clampVelocity(event.velocity * 110 * velocityScale)
      const cap = EVENT_MAX_DURATION_MS[event.role] ?? 3000
      if (event.role === 'drone') {
        this.scheduleDrone(channel, note, velocity, event.durationBeats * beatMs)
        continue
      }
      const generation = this.noteOn(channel, note, velocity)
      if (event.role === 'melody' && this.composition) {
        const granularity = Math.min(0.32, this.composition.parameters.wind * 0.18 + score.tension * 0.14)
        if (Math.random() < granularity) {
          this.scheduleGranule(channel, note + (Math.random() > 0.5 ? 12 : -12), Math.max(1, Math.round(velocity * 0.55)))
        }
      }
      if (generation !== null) {
        const durationMs = Math.max(80, Math.min(event.durationBeats * beatMs, cap))
        this.scheduleNoteOff(channel, note, durationMs, generation)
      }
    }
    this.beatCounter += 1
    if (this.beatCounter >= score.cycleBeats) {
      this.beatCounter = 0
      this.phraseIndex += 1
      this.currentScore = this.generatePhrase()
      if (this.currentScore) this.applyPrograms(this.currentScore)
    }
  }

  /**
   * Keeps the drone alive across a long cycle with soft re-bows every few
   * seconds instead of one multi-second note that either hangs or is cut,
   * leaving an audible hole in the field.
   */
  private scheduleDrone(channel: number, midi: number, velocity: number, totalMs: number): void {
    const segment = Math.min(EVENT_MAX_DURATION_MS.drone ?? 6500, totalMs)
    const overlap = 380
    let offset = 0
    let swell = 0
    while (offset < totalMs) {
      const duration = Math.min(segment, totalMs - offset)
      const delay = offset
      const swellVelocity = clampVelocity(velocity * (swell % 2 === 0 ? 1 : 0.94))
      swell += 1
      const timer = window.setTimeout(() => {
        this.noteTimers.delete(timer)
        if (!this.playing) return
        const generation = this.noteOn(channel, midi, swellVelocity)
        if (generation !== null) this.scheduleNoteOff(channel, midi, duration, generation)
      }, delay)
      this.noteTimers.add(timer)
      if (segment <= overlap) break
      offset += segment - overlap
    }
  }

  /** A held pitch is released before re-triggering, so its note-off cannot kill the new note. */
  private noteOn(channel: number, note: number, velocity: number): number | null {
    const synth = this.synth
    if (!synth) return null
    const midi = clampMidi(note)
    if (this.held.isHeld(channel, midi)) {
      try {
        synth.noteOff(channel, midi)
      } catch {
        // The voice may already be gone.
      }
    }
    try {
      synth.noteOn(channel, midi, velocity)
      return this.held.markOn(channel, midi)
    } catch {
      // Never let one lost voice stop the phrase.
      return null
    }
  }

  private scheduleNoteOff(channel: number, midi: number, delayMs: number, generation: number): void {
    const timer = window.setTimeout(() => {
      this.noteTimers.delete(timer)
      if (!this.held.markOff(channel, midi, generation)) return
      try {
        this.synth?.noteOff(channel, midi)
      } catch {
        // ignore
      }
    }, delayMs)
    this.noteTimers.add(timer)
  }

  private scheduleGranule(channel: number, note: number, velocity: number): void {
    if (!this.synth || !this.context) return
    const delay = 90 + Math.random() * 160
    const timer = window.setTimeout(() => {
      this.noteTimers.delete(timer)
      if (!this.playing) return
      const midi = clampMidi(note)
      const generation = this.noteOn(channel, midi, velocity)
      if (generation !== null) this.scheduleNoteOff(channel, midi, 80 + Math.random() * 120, generation)
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs} ms`)),
      timeoutMs,
    )
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}
