import { describe, expect, it } from 'vitest'
import {
  EVENT_MAX_DURATION_MS,
  HeldNoteRegistry,
  STEM_MAX_DURATION,
  STEM_WINDOW_BEATS,
  buildStemNotes,
  clampMidi,
  type StemNoteInput,
  type StemScheduleOptions,
} from '../src/play/audio/noteScheduler'

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function options(overrides: Partial<StemScheduleOptions> = {}): StemScheduleOptions {
  return {
    windowStart: 0,
    windowSeconds: 8,
    timeScale: 1,
    channel: 3,
    gate: 1,
    pitchShift: 0,
    granularity: 0,
    maxDurationSec: STEM_MAX_DURATION.pad,
    velocityScale: 1,
    legatoSamePitch: true,
    rng: mulberry32(42),
    ...overrides,
  }
}

const note = (time: number, duration: number, midi = 60, velocity = 0.8): StemNoteInput => ({
  time,
  duration,
  midi,
  velocity,
})

describe('stem scheduling', () => {
  it('keeps only notes inside the window', () => {
    const notes = buildStemNotes(
      [note(-1, 1), note(0.5, 1), note(7.9, 1), note(8, 1), note(9, 1)],
      options({ gate: 1 }),
    )
    expect(notes.map((entry) => entry.atSec)).toEqual([0.5, 7.9])
  })

  it('caps durations by the part limit and by the window remainder', () => {
    const notes = buildStemNotes(
      [note(0, 30, 60), note(7.5, 4, 62)],
      options({ maxDurationSec: STEM_MAX_DURATION.pad }),
    )
    const first = notes.find((entry) => entry.midi === 60)!
    const second = notes.find((entry) => entry.midi === 62)!
    expect(first.durationSec).toBeLessThanOrEqual(STEM_MAX_DURATION.pad)
    expect(second.durationSec).toBeLessThanOrEqual(0.5 + 0.001)
    expect(second.durationSec).toBeGreaterThan(0)
  })

  it('truncates a sustained held pitch before the next attack', () => {
    const notes = buildStemNotes(
      [note(0, 6, 48), note(3, 6, 48)],
      options({ legatoSamePitch: true, maxDurationSec: 8 }),
    )
    const samePitch = notes.filter((entry) => entry.midi === 48)
    expect(samePitch).toHaveLength(2)
    const [first, second] = samePitch
    expect(first!.atSec + first!.durationSec).toBeLessThanOrEqual(second!.atSec + 0.001)
  })

  it('places granular ornaments on the neighbouring octave, never the same pitch', () => {
    const notes = buildStemNotes([note(0, 2, 60)], options({ granularity: 1 }))
    const granules = notes.filter((entry) => entry.atSec > 0)
    expect(granules).toHaveLength(1)
    expect(Math.abs(granules[0]!.midi - 60)).toBe(12)
  })

  it('is deterministic for a seeded rng', () => {
    const input = [note(0, 1, 60), note(1, 1, 64), note(2, 1, 67), note(3, 1, 72)]
    const a = buildStemNotes(input, options({ gate: 0.5, granularity: 0.4, rng: mulberry32(7) }))
    const b = buildStemNotes(input, options({ gate: 0.5, granularity: 0.4, rng: mulberry32(7) }))
    expect(a).toEqual(b)
  })

  it('never exceeds per-part caps for any part', () => {
    for (const [part, cap] of Object.entries(STEM_MAX_DURATION)) {
      const notes = buildStemNotes([note(0, 120, 55)], options({ maxDurationSec: cap }))
      expect(notes[0]!.durationSec).toBeLessThanOrEqual(cap)
      expect(part).toBeTruthy()
    }
  })

  it('keeps windows long enough to breathe', () => {
    expect(STEM_WINDOW_BEATS).toBeGreaterThanOrEqual(16)
  })

  it('caps generative roles below a whole cycle', () => {
    expect(EVENT_MAX_DURATION_MS.drone).toBeLessThanOrEqual(7000)
    expect(EVENT_MAX_DURATION_MS.melody).toBeLessThan(3000)
    expect(EVENT_MAX_DURATION_MS.ornament).toBeLessThan(600)
  })
})

describe('held-note registry', () => {
  it('tracks per-channel held notes and releases them once', () => {
    const held = new HeldNoteRegistry()
    held.markOn(3, 60)
    held.markOn(3, 64)
    held.markOn(4, 60)
    expect(held.isHeld(3, 60)).toBe(true)
    expect(held.size).toBe(3)
    held.markOff(3, 60, 1)
    expect(held.isHeld(3, 60)).toBe(false)
    const released = held.releaseAll()
    expect(released).toHaveLength(2)
    expect(held.size).toBe(0)
    expect(held.releaseAll()).toHaveLength(0)
  })

  it('ignores a stale release so a newer segment survives', () => {
    const held = new HeldNoteRegistry()
    const first = held.markOn(2, 48)
    const second = held.markOn(2, 48)
    expect(held.markOff(2, 48, first)).toBe(false)
    expect(held.isHeld(2, 48)).toBe(true)
    expect(held.markOff(2, 48, second)).toBe(true)
    expect(held.isHeld(2, 48)).toBe(false)
  })

  it('clamps midi values into the valid range', () => {
    expect(clampMidi(-4)).toBe(0)
    expect(clampMidi(200)).toBe(127)
    expect(clampMidi(60.4)).toBe(60)
  })
})
