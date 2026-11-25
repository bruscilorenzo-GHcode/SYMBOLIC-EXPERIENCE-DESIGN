import { describe, expect, it } from 'vitest'
import {
  composePlan,
  depositTrace,
  modulationFromWish,
  parseWish,
  readModulation,
  type Trace,
} from '../src/index'

describe('performing wish', () => {
  it('classifies the PDF examples deterministically', () => {
    const dance = parseWish('Voglio ballare per 1000 persone')
    expect(dance.medium).toBe('dance')
    expect(dance.audience).toBe('crowd')
    const sport = parseWish('Overcome my sport limits')
    expect(sport.medium).toBe('sport')
    const film = parseWish('Direct a film with my friends')
    expect(film.medium).toBe('image')
    expect(film.audience).toBe('circle')
    expect(parseWish('Voglio ballare per 1000 persone')).toEqual(dance)
  })

  it('falls back safely on unknown or empty wishes', () => {
    const empty = parseWish('')
    expect(empty.medium).toBe('imaginal')
    expect(empty.audience).toBe('self')
    expect(empty.confidence).toBe(0)
  })
})

describe('modulation', () => {
  it('normalises traditions and measures interaction', () => {
    const balanced = readModulation({ traditions: { bar: 1, rehab: 1, atelier: 1 }, group: 0.5, virtual: 0.5 })
    expect(balanced.interaction).toBeCloseTo(1, 3)
    const pure = readModulation({ traditions: { bar: 0, rehab: 1, atelier: 0 }, group: 2, virtual: -1 })
    expect(pure.interaction).toBe(0)
    expect(pure.dominant).toBe('rehab')
    expect(pure.group).toBe(1)
    expect(pure.virtual).toBe(0)
  })
})

describe('improvement plan', () => {
  const wish = parseWish('I want to dance for 1000 people')
  const mod = modulationFromWish(wish)

  it('has as many sessions as the tier and an ordered arc', () => {
    for (const [tier, count] of [['threshold', 4], ['cycle', 8], ['metamorphosis', 12]] as const) {
      const plan = composePlan(wish, mod, tier)
      expect(plan.sessions).toHaveLength(count)
      expect(plan.sessions[0]!.phase).toBe('threshold')
      expect(plan.sessions[count - 1]!.phase).toBe('trace')
      expect(plan.sessions[count - 2]!.phase).toBe('performance')
      expect(plan.sessions[0]!.assistants).toContain('host')
      expect(plan.sessions[count - 2]!.field).toBe('arts')
    }
  })

  it('is deterministic and respects disabled fields', () => {
    const a = composePlan(wish, mod, 'cycle', { disabledFields: ['food'] })
    const b = composePlan(wish, mod, 'cycle', { disabledFields: ['food'] })
    expect(a).toEqual(b)
    expect(a.sessions.some((s) => s.field === 'food')).toBe(false)
  })

  it('routes healing fields into a linked Healing Room', () => {
    const calm = parseWish('Riequilibrare la mia fantasia e padroneggiare un nuovo stato')
    const plan = composePlan(calm, { traditions: { bar: 0.1, rehab: 0.7, atelier: 0.2 }, group: 0.1, virtual: 0.2 }, 'cycle', {
      healing: { name: 'Room', soundModules: 3, objects: 4, light: 'skylight' },
    })
    expect(plan.sessions.some((s) => s.venue === 'healing-room')).toBe(true)
    expect(plan.assistants.some((a) => a.id === 'doppelganger')).toBe(true)
  })

  it('deposits traces append-only and once per session', () => {
    const plan = composePlan(wish, mod, 'threshold')
    let traces: Trace[] = []
    traces = depositTrace(traces, plan, 0, 1)
    traces = depositTrace(traces, plan, 0, 2)
    traces = depositTrace(traces, plan, 3, 3)
    expect(traces).toHaveLength(2)
    expect(traces[1]!.kind).toBe(wish.trace)
  })
})
