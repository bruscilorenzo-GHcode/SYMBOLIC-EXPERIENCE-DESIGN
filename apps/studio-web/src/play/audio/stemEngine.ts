import { Midi } from '@tonejs/midi'
import type { WorkletSynthesizer } from 'spessasynth_lib'
import type { PlayComposition } from '@aura-spec/play-engine'
import {
  HeldNoteRegistry,
  STEM_MAX_DURATION,
  STEM_WINDOW_BEATS,
  buildStemNotes,
  clampMidi,
  type StemPartId,
} from './noteScheduler'
import { globalStemTranspose, groupSongs, type SongGroup } from './harmony'

export type { StemPartId } from './noteScheduler'

export type StemGenreKey = 'HighPop-Long' | 'Cinematic' | 'Classics'

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

interface LoadedMidi {
  midi: Midi
  sourceTempo: number
  sourceWindowSeconds: number
  windows: number
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

/**
 * Plays the SYNTAGMA style library as authored songs: every part of the same
 * numeric index is scheduled together on the same 16-beat window, so the
 * harmony comes from one piece instead of unrelated files drifting apart.
 */
export class StemEngine {
  private manifest: StemManifest | null = null
  private genre: ManifestGenre | null = null
  private bank: SongBank | null = null
  private timer: number | null = null
  private noteTimers = new Set<number>()
  private held = new HeldNoteRegistry()
  private advancing = false
  private sources: StemSourceReadout[] = []
  private composition: PlayComposition
  private tempo = 112
  private windowsPerSong = 6
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
    // Short cinematic cues and long classical pieces need different spans:
    // hold a song long enough to develop, short enough to keep variety.
    this.windowsPerSong = this.genreKey === 'Cinematic' ? 3 : this.genreKey === 'Classics' ? 8 : 6
    this.applyPrograms()
    this.applyControls()
    this.bank = new SongBank(this.genre.parts, this.windowsPerSong)
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
    this.releaseHeld()
  }

  getSources(): StemSourceReadout[] {
    return this.sources
  }

  private windowMs(): number {
    return Math.max(1600, (STEM_WINDOW_BEATS * 60 * 1000) / Math.max(30, this.tempo))
  }

  private releaseHeld(): void {
    for (const { channel, midi } of this.held.releaseAll()) {
      try {
        this.synth.noteOff(channel, midi)
      } catch {
        // The voice may already be gone.
      }
    }
  }

  private async advance(): Promise<void> {
    if (!this.playing || this.advancing || !this.genre || !this.bank) return
    this.advancing = true
    try {
      const now = this.context.currentTime + 0.08
      // Clean window boundary: nothing from the previous window may bleed in.
      this.releaseHeld()

      const { song, slot } = this.bank.next()
      const entries: Array<{ part: StemPartId; file: string; loaded: LoadedMidi }> = []
      for (const part of Object.keys(song.files) as StemPartId[]) {
        const file = song.files[part]
        if (!file) continue
        entries.push({ part, file, loaded: await this.bank.load(file) })
      }

      const shift = globalStemTranspose(
        this.composition.parameters.water,
        this.composition.parameters.light,
      )
      const nextSources: StemSourceReadout[] = []
      for (const { part, file, loaded } of entries) {
        const windowIndex = slot % loaded.windows
        this.scheduleStem(part, loaded, windowIndex, now, part === 'drums' ? 0 : shift)
        nextSources.push({
          part,
          label: this.genre.parts[part]?.label ?? part,
          source: file.split('/').pop() ?? file,
          window: windowIndex,
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

  private scheduleStem(
    part: StemPartId,
    loaded: LoadedMidi,
    windowIndex: number,
    startTime: number,
    pitchShift: number,
  ): void {
    const channel = PART_CHANNELS[part]
    const timeScale = Math.max(30, loaded.sourceTempo) / Math.max(30, this.tempo)
    const windowStart = windowIndex * loaded.sourceWindowSeconds
    const density = this.composition.music.descriptor.density
    const brightness = this.composition.music.descriptor.brightness
    const gate = part === 'pad' || part === 'bass' ? 0.9 : 0.55 + density * 0.35
    const granularity = Math.min(
      0.3,
      this.composition.parameters.wind * 0.18 + this.composition.music.descriptor.roughness * 0.12,
    )

    const notes = buildStemNotes(
      loaded.midi.tracks.flatMap((track) => track.notes),
      {
        windowStart,
        windowSeconds: loaded.sourceWindowSeconds,
        timeScale,
        channel,
        gate,
        pitchShift,
        granularity,
        maxDurationSec: STEM_MAX_DURATION[part],
        velocityScale: 0.72 + brightness * 0.28,
        legatoSamePitch: part === 'pad' || part === 'bass',
        rng: Math.random,
      },
    )

    for (const note of notes) {
      this.scheduleNote(note.channel, note.midi, note.velocity, startTime + note.atSec, note.durationSec)
    }
  }

  private scheduleNote(channel: number, note: number, velocity: number, when: number, duration: number): void {
    const delay = Math.max(0, (when - this.context.currentTime) * 1000)
    const midi = clampMidi(note)
    const onTimer = window.setTimeout(() => {
      this.noteTimers.delete(onTimer)
      if (!this.playing) return
      let generation: number
      try {
        if (this.held.isHeld(channel, midi)) this.synth.noteOff(channel, midi)
        this.synth.noteOn(channel, midi, velocity)
        generation = this.held.markOn(channel, midi)
      } catch {
        return
      }
      const offTimer = window.setTimeout(() => {
        this.noteTimers.delete(offTimer)
        if (!this.held.markOff(channel, midi, generation)) return
        try {
          this.synth.noteOff(channel, midi)
        } catch {
          // ignore
        }
      }, Math.max(60, duration * 1000))
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

/**
 * Walks the authored songs in shuffled order, holding each one for a phrase of
 * `WINDOWS_PER_SONG` windows so the parts develop together before changing.
 */
class SongBank {
  private songs: SongGroup[]
  private order: number[] = []
  private cursor = 0
  private current: { song: SongGroup; slot: number } | null = null
  private midiCache = new Map<string, Promise<LoadedMidi>>()
  private readonly windowsPerSong: number

  constructor(parts: Partial<Record<StemPartId, ManifestPart>>, windowsPerSong = 6) {
    this.windowsPerSong = windowsPerSong
    const fileLists = Object.fromEntries(
      Object.entries(parts).map(([part, config]) => [part, config?.files ?? []]),
    ) as Partial<Record<StemPartId, string[]>>
    this.songs = groupSongs(fileLists)
    if (this.songs.length === 0) throw new Error('No playable songs in the style library')
    this.shuffle()
  }

  next(): { song: SongGroup; slot: number } {
    if (!this.current || this.current.slot >= this.windowsPerSong) {
      this.current = { song: this.nextSong(), slot: 0 }
    }
    const result = { song: this.current.song, slot: this.current.slot }
    this.current.slot += 1
    return result
  }

  async load(file: string): Promise<LoadedMidi> {
    const cached = this.midiCache.get(file)
    if (cached) return cached
    const promise = this.fetchMidi(file)
    this.midiCache.set(file, promise)
    return promise
  }

  private async fetchMidi(file: string): Promise<LoadedMidi> {
    const response = await fetch(`/styles/${file}`)
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${file}`)
    const midi = new Midi(await response.arrayBuffer())
    const sourceTempo = midi.header.tempos[0]?.bpm ?? 112
    const sourceWindowSeconds = (STEM_WINDOW_BEATS * 60) / Math.max(30, sourceTempo)
    const windows = Math.max(1, Math.floor(midi.duration / sourceWindowSeconds))
    return { midi, sourceTempo, sourceWindowSeconds, windows }
  }

  private nextSong(): SongGroup {
    if (this.cursor >= this.order.length) this.shuffle()
    return this.songs[this.order[this.cursor++]!]!
  }

  private shuffle(): void {
    this.order = this.songs.map((_, index) => index)
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
