import { Midi } from '@tonejs/midi'
import type { WorkletSynthesizer } from 'spessasynth_lib'
import type { PlayComposition } from '@aura-spec/play-engine'

export type StemGenreKey = 'HighPop-Long' | 'Cinematic' | 'Classics'
export type StemPartId = 'drums' | 'bass' | 'pad' | 'lead'

export interface StemSourceReadout {
  part: StemPartId
  label: string
  source: string
  window: number
}

interface ManifestPart {
  label: string
  files: string[]
}

interface ManifestGenre {
  label: string
  tempoBpm: number
  soundfont: 'analog' | 'maestro'
  parts: Partial<Record<StemPartId, ManifestPart>>
}

interface StemManifest {
  version: number
  genres: Record<StemGenreKey, ManifestGenre>
}

interface LoadedStem {
  file: string
  source: string
  midi: Midi
  sourceTempo: number
  windowStart: number
  sourceWindowSeconds: number
  windowIndex: number
}

const MANIFEST_URL = '/styles/manifest.json'
const PART_CHANNELS: Record<StemPartId, number> = { drums: 9, bass: 2, pad: 3, lead: 4 }
const ANALOG_PROGRAMS: Record<StemPartId, number> = { drums: 0, bass: 38, pad: 89, lead: 81 }
const MAESTRO_PROGRAMS: Record<StemPartId, number> = { drums: 0, bass: 42, pad: 48, lead: 40 }

export function stemGenreForIdiom(idiomId: PlayComposition['music']['idiomId']): StemGenreKey | null {
  if (idiomId === 'cinematic') return 'Cinematic'
  if (idiomId === 'high-pop') return 'HighPop-Long'
  if (idiomId === 'classics') return 'Classics'
  return null
}

export class StemEngine {
  private manifest: StemManifest | null = null
  private genre: ManifestGenre | null = null
  private queues = new Map<StemPartId, StemQueue>()
  private timer: number | null = null
  private noteTimers = new Set<number>()
  private advancing = false
  private sources: StemSourceReadout[] = []
  private composition: PlayComposition
  private tempo = 112
  private playing = false

  constructor(
    private readonly synth: WorkletSynthesizer,
    private readonly context: AudioContext,
    private readonly master: GainNode,
    private readonly genreKey: StemGenreKey,
    composition: PlayComposition,
    private readonly onSources?: (sources: StemSourceReadout[]) => void,
  ) {
    this.composition = composition
  }

  async start(): Promise<void> {
    this.manifest = await loadManifest()
    this.genre = this.manifest.genres[this.genreKey]
    if (!this.genre) throw new Error(`Missing MIDI genre ${this.genreKey}`)
    this.tempo = Math.min(120, this.genre.tempoBpm)
    this.applyPrograms()
    this.applyControls()
    for (const part of Object.keys(this.genre.parts) as StemPartId[]) {
      const config = this.genre.parts[part]
      if (!config) continue
      this.queues.set(part, new StemQueue(part, config.files, this.tempo))
    }
    this.playing = true
    await this.advance()
    this.timer = window.setInterval(() => { void this.advance() }, this.windowMs())
  }

  update(composition: PlayComposition): void {
    this.composition = composition
    const nextTempo = Math.min(120, composition.music.descriptor.tempoBpm)
    if (Math.abs(nextTempo - this.tempo) > 2) {
      this.tempo = nextTempo
      if (this.timer !== null) {
        window.clearInterval(this.timer)
        this.timer = window.setInterval(() => { void this.advance() }, this.windowMs())
      }
    }
    this.applyControls()
  }

  stop(): void {
    this.playing = false
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    for (const timer of this.noteTimers) window.clearTimeout(timer)
    this.noteTimers.clear()
  }

  getSources(): StemSourceReadout[] {
    return this.sources
  }

  private windowMs(): number {
    return Math.max(1200, (8 * 60 * 1000) / Math.max(30, this.tempo))
  }

  private async advance(): Promise<void> {
    if (!this.playing || this.advancing || !this.genre) return
    this.advancing = true
    try {
      const now = this.context.currentTime + 0.06
      const nextSources: StemSourceReadout[] = []
      for (const [part, queue] of this.queues) {
        const config = this.genre.parts[part]
        if (!config) continue
        const stem = await queue.next()
        this.scheduleStem(part, stem, now)
        nextSources.push({
          part,
          label: config.label,
          source: stem.source,
          window: stem.windowIndex,
        })
      }
      this.sources = nextSources
      this.onSources?.(nextSources)
    } catch (error) {
      console.warn('[StemEngine] unable to advance stems', error)
    } finally {
      this.advancing = false
    }
  }

  private scheduleStem(part: StemPartId, stem: LoadedStem, startTime: number): void {
    const partConfig = this.genre?.parts[part]
    if (!partConfig) return
    const channel = PART_CHANNELS[part]
    const sourceTempo = Math.max(30, stem.sourceTempo)
    const timeScale = sourceTempo / Math.max(30, this.tempo)
    const windowEnd = stem.windowStart + stem.sourceWindowSeconds
    const density = this.composition.music.descriptor.density
    const brightness = this.composition.music.descriptor.brightness
    const gate = part === 'pad' || part === 'bass' ? 0.92 : 0.62 + density * 0.3
    const pitchShift = Math.round(
      (this.composition.parameters.water - 0.5) * 4 +
        (this.composition.parameters.light - 0.5) * 2,
    )
    const granularity = Math.min(0.35, this.composition.parameters.wind * 0.22 + this.composition.music.descriptor.roughness * 0.15)

    for (const note of stem.midi.tracks.flatMap((track) => track.notes)) {
      if (note.time < stem.windowStart || note.time >= windowEnd) continue
      if (Math.random() > gate) continue
      const when = startTime + (note.time - stem.windowStart) * timeScale
      const duration = Math.max(0.08, note.duration * timeScale)
      const velocity = Math.max(1, Math.min(127, Math.round(note.velocity * 127 * (0.72 + brightness * 0.28))))
      const midiNote = Math.max(0, Math.min(127, note.midi + pitchShift))
      this.scheduleNote(channel, midiNote, velocity, when, duration)
      if (granularity > 0.06 && Math.random() < granularity) {
        this.scheduleNote(channel, midiNote, Math.round(velocity * 0.55), when + Math.min(0.22, duration * 0.5), Math.max(0.05, duration * 0.28))
      }
    }
  }

  private scheduleNote(channel: number, note: number, velocity: number, when: number, duration: number): void {
    const delay = Math.max(0, (when - this.context.currentTime) * 1000)
    const onTimer = window.setTimeout(() => {
      try {
        this.synth.noteOn(channel, note, velocity)
      } catch {
        // ignore
      }
      this.noteTimers.delete(onTimer)
      const offTimer = window.setTimeout(() => {
        try {
          this.synth.noteOff(channel, note)
        } catch {
          // ignore
        }
        this.noteTimers.delete(offTimer)
      }, Math.max(50, duration * 1000))
      this.noteTimers.add(offTimer)
    }, delay)
    this.noteTimers.add(onTimer)
  }

  private applyPrograms(): void {
    if (!this.genre) return
    const programs = this.genre.soundfont === 'maestro' ? MAESTRO_PROGRAMS : ANALOG_PROGRAMS
    for (const part of Object.keys(this.genre.parts) as StemPartId[]) {
      if (part === 'drums') continue
      const channel = PART_CHANNELS[part]
      this.synth.programChange(channel, programs[part])
    }
  }

  private applyControls(): void {
    const descriptor = this.composition.music.descriptor
    const reverb = Math.round(Math.min(127, Math.max(0, (0.18 + this.composition.parameters.canopy * 0.45 + this.composition.parameters.water * 0.2) * 127)))
    const brightness = Math.round(Math.min(127, Math.max(0, descriptor.brightness * 127)))
    for (const channel of [2, 3, 4]) {
      try {
        this.synth.controllerChange(channel, 91, reverb)
        this.synth.controllerChange(channel, 74, brightness)
      } catch {
        // Effects are optional.
      }
    }
  }
}

class StemQueue {
  private order: number[] = []
  private cursor = 0
  private prefetched = new Map<number, Promise<Midi>>()
  private seenWindows = new Map<string, Set<number>>()

  constructor(
    private readonly part: StemPartId,
    private readonly files: string[],
    private tempo: number,
  ) {
    this.shuffle()
  }

  async next(): Promise<LoadedStem> {
    if (this.files.length === 0) throw new Error(`No stems for ${this.part}`)
    if (this.cursor >= this.order.length) this.shuffle()
    const index = this.order[this.cursor % this.order.length]!
    this.cursor += 1
    const file = this.files[index]!
    const midi = await this.load(index)
    this.prefetch()
    const sourceTempo = midi.header.tempos[0]?.bpm ?? this.tempo
    const sourceWindowSeconds = (8 * 60) / Math.max(30, sourceTempo)
    const windows = Math.max(1, Math.floor(midi.duration / sourceWindowSeconds))
    let seen = this.seenWindows.get(file)
    if (!seen) {
      seen = new Set()
      this.seenWindows.set(file, seen)
    }
    if (seen.size >= windows) seen.clear()
    let windowIndex = Math.floor(Math.random() * windows)
    let guard = 0
    while (seen.has(windowIndex) && guard < windows * 2) {
      windowIndex = (windowIndex + 1) % windows
      guard += 1
    }
    seen.add(windowIndex)
    return {
      file,
      source: file.split('/').pop() ?? file,
      midi,
      sourceTempo,
      windowStart: windowIndex * sourceWindowSeconds,
      sourceWindowSeconds,
      windowIndex,
    }
  }

  private async load(index: number): Promise<Midi> {
    const cached = this.prefetched.get(index)
    if (cached) return cached
    const promise = this.fetchMidi(index)
    this.prefetched.set(index, promise)
    return promise
  }

  private prefetch(): void {
    for (let offset = 0; offset < 2; offset += 1) {
      const index = this.order[(this.cursor + offset) % this.order.length]
      if (index === undefined || this.prefetched.has(index)) continue
      this.prefetched.set(index, this.fetchMidi(index))
    }
  }

  private async fetchMidi(index: number): Promise<Midi> {
    const file = this.files[index]!
    const response = await fetch(`/styles/${file}`)
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${file}`)
    return new Midi(await response.arrayBuffer())
  }

  private shuffle(): void {
    this.order = this.files.map((_, index) => index)
    for (let i = this.order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.order[i], this.order[j]] = [this.order[j]!, this.order[i]!]
    }
    this.cursor = 0
  }
}

let manifestPromise: Promise<StemManifest> | null = null

async function loadManifest(): Promise<StemManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL).then(async (response) => {
      if (!response.ok) throw new Error(`MIDI manifest HTTP ${response.status}`)
      return (await response.json()) as StemManifest
    })
  }
  return manifestPromise
}
