import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COEXISTENCE_POLICY,
  composeCoexistence,
  findCompatibleTransposition,
  reconcileTempo,
  type VisitorMusicalInput,
} from '../src'
import type { MusicalDescriptor } from '../src'

function descriptor(overrides: Partial<MusicalDescriptor> = {}): MusicalDescriptor {
  return {
    tonicPc: 0,
    mode: 'dorian',
    tempoBpm: 72,
    meter: [4, 4],
    register: 'mid',
    density: 0.5,
    brightness: 0.5,
    roughness: 0.3,
    timbre: 'woody',
    ...overrides,
  }
}

function input(id: string, overrides: Partial<VisitorMusicalInput> = {}): VisitorMusicalInput {
  return {
    id,
    visitorId: `visitor-${id}`,
    zoneId: 'zone-grove',
    descriptor: descriptor(),
    durationS: 12,
    priority: 1,
    ...overrides,
  }
}

describe('Syntagma-derived musical coexistence', () => {
  it('passes a single visitor through unchanged', () => {
    const result = composeCoexistence([input('solo')])
    expect(result.globalTonic).toBe(0)
    expect(result.globalMode).toBe('dorian')
    expect(result.globalTempo).toBe(72)
    expect(result.zoneMixes).toHaveLength(1)
    expect(result.zoneMixes[0]).toMatchObject({
      transpositionSemitones: 0,
      tempoScale: 1,
      gainDb: 0,
      role: 'lead',
    })
    expect(result.zoneMixes[0]!.densityShare).toBeCloseTo(0.5, 6)
  })

  it('keeps compatible visitors in their own key and tempo', () => {
    const result = composeCoexistence([
      input('a', { priority: 1.2 }),
      input('b', { descriptor: descriptor({ register: 'high', density: 0.4 }) }),
    ])
    expect(result.globalTonic).toBe(0)
    expect(result.globalTempo).toBe(72)
    for (const mix of result.zoneMixes) {
      expect(mix.transpositionSemitones).toBe(0)
      expect(mix.tempoScale).toBe(1)
    }
    expect(result.zoneMixes.map((mix) => mix.channel)).toEqual([0, 1])
    expect(result.zoneMixes[0]!.role).toBe('lead')
    expect(result.zoneMixes[1]!.role).toBe('texture')
  })

  it('transposes a distant tonic into the global modal field', () => {
    const result = composeCoexistence([
      input('c', { descriptor: descriptor({ tonicPc: 0, mode: 'ionian' }), priority: 2 }),
      input('fsharp', { descriptor: descriptor({ tonicPc: 6, mode: 'ionian' }) }),
    ])
    expect(result.globalTonic).toBe(0)
    const fsharp = result.zoneMixes.find((mix) => mix.inputId === 'fsharp')!
    expect(fsharp.transpositionSemitones).not.toBe(0)
    expect([2, 4, 5, 7, 9, 11]).toContain((6 + fsharp.transpositionSemitones) % 12)
  })

  it('warns when the transposition constraint cannot reach the global mode', () => {
    const result = composeCoexistence(
      [
        input('c', { descriptor: descriptor({ tonicPc: 0, mode: 'ionian' }), priority: 2 }),
        input('fsharp', { descriptor: descriptor({ tonicPc: 6, mode: 'ionian' }) }),
      ],
      { ...DEFAULT_COEXISTENCE_POLICY, maxTranspositionSemitones: 0 },
    )
    expect(result.warnings.some((warning) => warning.includes('no transposition'))).toBe(true)
    const fsharp = result.zoneMixes.find((mix) => mix.inputId === 'fsharp')!
    expect(Math.abs(fsharp.transpositionSemitones)).toBeLessThanOrEqual(4)
  })

  it('reconciles tempo with a drift limit and explicit warnings', () => {
    const result = composeCoexistence([
      input('slow', { descriptor: descriptor({ tempoBpm: 120 }) }),
      input('fast', { descriptor: descriptor({ tempoBpm: 140 }) }),
    ])
    expect(result.globalTempo).toBe(120)
    const fast = result.zoneMixes.find((mix) => mix.inputId === 'fast')!
    expect(fast.tempoScale).toBeLessThanOrEqual(1.06)
    expect(fast.tempoScale).toBeGreaterThanOrEqual(0.94)
    expect(result.warnings.some((warning) => warning.includes('tempo 140'))).toBe(true)
  })

  it('shares a density budget instead of summing to overload', () => {
    const inputs = ['a', 'b', 'c', 'd'].map((id) =>
      input(id, { descriptor: descriptor({ density: 0.8 }) }),
    )
    const result = composeCoexistence(inputs)
    const total = result.zoneMixes.reduce((sum, mix) => sum + mix.densityShare, 0)
    expect(total).toBeLessThanOrEqual(1 + 1e-9)
    expect(result.zoneMixes.every((mix) => mix.densityShare > 0)).toBe(true)
    expect(new Set(result.zoneMixes.map((mix) => mix.channel)).size).toBe(4)
  })

  it('assigns a pedal role to a quiet low-register visitor', () => {
    const result = composeCoexistence([
      input('lead', { priority: 2, descriptor: descriptor({ density: 0.7 }) }),
      input('pedal', {
        priority: 0.8,
        descriptor: descriptor({ register: 'low', density: 0.2, timbre: 'stone' }),
      }),
    ])
    expect(result.zoneMixes.find((mix) => mix.inputId === 'lead')!.role).toBe('lead')
    expect(result.zoneMixes.find((mix) => mix.inputId === 'pedal')!.role).toBe('pedal')
    expect(result.zoneMixes.find((mix) => mix.inputId === 'pedal')!.gainDb).toBe(-6)
  })

  it('returns a safe empty result', () => {
    const result = composeCoexistence([])
    expect(result.sourceCount).toBe(0)
    expect(result.zoneMixes).toEqual([])
    expect(result.warnings).toContain('No visitor musical inputs')
  })

  it('exposes the transposition and tempo helpers', () => {
    expect(findCompatibleTransposition(0, 0, 'dorian', 6)).toEqual({ semitones: 0, compatible: true })
    expect(reconcileTempo(50, 60, 5).scale).toBeCloseTo(1.05, 2)
  })
})
