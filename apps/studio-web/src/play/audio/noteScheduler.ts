export type StemPartId = 'drums' | 'bass' | 'pad' | 'lead'

/** A stem window lasts this many beats; long enough for phrases to breathe. */
export const STEM_WINDOW_BEATS = 16

/**
 * Hard sustain caps per part, in seconds. Stems contain pads and bass lines
 * whose authored durations can exceed the window; uncapped they bleed into the
 * next window, pile up and read as “long values / loops”.
 */
export const STEM_MAX_DURATION: Record<StemPartId, number> = {
  drums: 2,
  bass: 4,
  pad: 6,
  lead: 2.5,
}

/** Role caps for the generative score (the visible phrase, not the stems). */
export const EVENT_MAX_DURATION_MS: Record<string, number> = {
  drone: 6500,
  bass: 3500,
  melody: 2500,
  ornament: 400,
  percussion: 600,
}

export interface StemNoteInput {
  time: number
  duration: number
  midi: number
  velocity: number
}

export interface StemScheduleOptions {
  windowStart: number
  windowSeconds: number
  timeScale: number
  channel: number
  gate: number
  pitchShift: number
  granularity: number
  maxDurationSec: number
  velocityScale: number
  /** Pads and bass must not re-trigger the same pitch while it still sounds. */
  legatoSamePitch: boolean
  rng: () => number
}

export interface ScheduledNote {
  channel: number
  midi: number
  velocity: number
  atSec: number
  durationSec: number
}

export function clampMidi(value: number): number {
  return Math.max(0, Math.min(127, Math.round(value)))
}

export function clampVelocity(value: number): number {
  return Math.max(1, Math.min(127, Math.round(value)))
}

/**
 * Turns authored stem notes into a deterministic window schedule:
 * - only notes inside the window,
 * - gated by density,
 * - durations clamped to the part cap and to the window remainder,
 * - same-pitch overlap resolved for sustained parts (legato truncation),
 * - granular ornaments on a neighbouring octave, never the same pitch.
 */
export function buildStemNotes(
  notes: StemNoteInput[],
  options: StemScheduleOptions,
): ScheduledNote[] {
  const windowEnd = options.windowStart + options.windowSeconds
  const output: ScheduledNote[] = []
  const lastByMidi = new Map<number, ScheduledNote>()

  for (const note of notes) {
    if (note.time < options.windowStart || note.time >= windowEnd) continue
    if (options.rng() > options.gate) continue

    const atSec = (note.time - options.windowStart) * options.timeScale
    const windowRemainder = Math.max(0.08, (windowEnd - note.time) * options.timeScale)
    const durationSec = Math.max(
      0.08,
      Math.min(note.duration * options.timeScale, options.maxDurationSec, windowRemainder),
    )
    const midi = clampMidi(note.midi + options.pitchShift)
    const velocity = clampVelocity(note.velocity * 127 * options.velocityScale)

    if (options.legatoSamePitch) {
      const previous = lastByMidi.get(midi)
      if (previous) {
        const overlap = previous.atSec + previous.durationSec + 0.03 - atSec
        if (overlap > 0) {
          previous.durationSec = Math.max(0.08, previous.durationSec - overlap)
          if (previous.durationSec <= 0.08 && previous.atSec >= atSec - 0.02) continue
        }
      }
    }

    const scheduled: ScheduledNote = { channel: options.channel, midi, velocity, atSec, durationSec }
    output.push(scheduled)
    lastByMidi.set(midi, scheduled)

    if (options.granularity > 0.06 && options.rng() < options.granularity) {
      const offsetSec = Math.min(0.22, durationSec * 0.5)
      const granuleMidi = clampMidi(midi + (options.rng() > 0.5 ? 12 : -12))
      output.push({
        channel: options.channel,
        midi: granuleMidi,
        velocity: clampVelocity(velocity * 0.55),
        atSec: atSec + offsetSec,
        durationSec: Math.max(0.05, Math.min(durationSec * 0.28, 0.5)),
      })
    }
  }

  return output.sort((a, b) => a.atSec - b.atSec)
}

/**
 * Tracks notes currently held per channel. MIDI note-off addresses a channel
 * and pitch, so re-triggering a held pitch without releasing it first corrupts
 * the release (the old off silences the new note) and leaves voices hanging.
 * Every attack gets a generation: a release only acts when it still owns the
 * generation, so a stale timer cannot cut a newer segment of the same pitch.
 */
export class HeldNoteRegistry {
  private held = new Map<string, { channel: number; midi: number; generation: number }>()
  private nextGeneration = 1

  isHeld(channel: number, midi: number): boolean {
    return this.held.has(`${channel}:${midi}`)
  }

  /** Marks an attack and returns its generation, to be passed to markOff. */
  markOn(channel: number, midi: number): number {
    const generation = this.nextGeneration
    this.nextGeneration += 1
    this.held.set(`${channel}:${midi}`, { channel, midi, generation })
    return generation
  }

  /** Releases the entry only when `generation` still owns it. */
  markOff(channel: number, midi: number, generation: number): boolean {
    const key = `${channel}:${midi}`
    const entry = this.held.get(key)
    if (!entry || entry.generation !== generation) return false
    this.held.delete(key)
    return true
  }

  /** Releases every held note and returns them, for window boundaries and stop. */
  releaseAll(): Array<{ channel: number; midi: number }> {
    const released: Array<{ channel: number; midi: number }> = []
    for (const entry of this.held.values()) {
      released.push({ channel: entry.channel, midi: entry.midi })
    }
    this.held.clear()
    return released
  }

  get size(): number {
    return this.held.size
  }
}
