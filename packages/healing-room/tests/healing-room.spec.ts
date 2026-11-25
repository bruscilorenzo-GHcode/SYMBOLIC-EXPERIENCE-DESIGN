import { describe, expect, it } from 'vitest'
import {
  COMMUNICATION_CHANNELS,
  FOCUS_REQUIRED_DEPTH,
  HEALING_LAYOUTS,
  HEALING_STATIONS,
  MIND_STATES,
  advanceFocus,
  canEnterFocusZone,
  createHealingSession,
  deriveDoppelganger,
  enterHealingZone,
  footprintContains,
  healingLayoutById,
  materialiseHealingGoal,
  mindStateFromFocus,
  parseHealingSession,
  pushDiagnosticSample,
  serializeHealingSession,
  sessionHealed,
  setHealingFocus,
  soundbedForMindState,
  stationByKind,
  zoneFootprint,
  type DiagnosticSample,
} from '../src/index'

function samplesOf(entries: Array<[DiagnosticSample['channel'], number]>): DiagnosticSample[] {
  return entries.map(([channel, value], index) => ({
    id: `s-${index}`,
    channel,
    value,
    at: 1700000000000 + index,
  }))
}

describe('mind state ladder', () => {
  it('walks the meditation ladder deterministically', () => {
    expect(mindStateFromFocus(0)).toBe('everyday')
    expect(mindStateFromFocus(0.24)).toBe('everyday')
    expect(mindStateFromFocus(0.25)).toBe('observing')
    expect(mindStateFromFocus(0.54)).toBe('observing')
    expect(mindStateFromFocus(0.55)).toBe('focused')
    expect(mindStateFromFocus(0.85)).toBe('empty')
    expect(mindStateFromFocus(1)).toBe('empty')
  })

  it('clamps focus accumulation', () => {
    expect(advanceFocus(0.98, 0.1)).toBe(1)
    expect(advanceFocus(0.02, -0.1)).toBe(0)
  })

  it('paces breath longer as the mind empties', () => {
    const everyday = soundbedForMindState('everyday')
    const empty = soundbedForMindState('empty')
    expect(empty.breathSeconds).toBeGreaterThan(everyday.breathSeconds)
    expect(empty.density).toBeLessThan(everyday.density)
  })

  it('defines strictly increasing thresholds', () => {
    for (let index = 1; index < MIND_STATES.length; index++) {
      expect(MIND_STATES[index]!.threshold).toBeGreaterThan(MIND_STATES[index - 1]!.threshold)
    }
  })
})

describe('doppelgänger derivation', () => {
  it('returns null without samples', () => {
    expect(deriveDoppelganger([])).toBeNull()
  })

  it('is deterministic for identical sample sets', () => {
    const a = deriveDoppelganger(samplesOf([['self', 0.7], ['twin', 0.4], ['self', 0.5], ['others', 0.2]]))
    const b = deriveDoppelganger(samplesOf([['self', 0.7], ['twin', 0.4], ['self', 0.5], ['others', 0.2]]))
    expect(a).toEqual(b)
  })

  it('tracks the dominant channel and stays in range', () => {
    const entity = deriveDoppelganger(samplesOf([['self', 0.9], ['self', 0.9], ['twin', 0.1], ['twin', 0.1]]))
    expect(entity).not.toBeNull()
    expect(entity!.dominantChannel).toBe('self')
    expect(entity!.satellites).toBeGreaterThanOrEqual(3)
    expect(entity!.satellites).toBeLessThanOrEqual(12)
    expect(entity!.breathHz).toBeGreaterThanOrEqual(0.08)
    expect(entity!.breathHz).toBeLessThanOrEqual(0.32)
    expect(entity!.traits).toHaveLength(COMMUNICATION_CHANNELS.length)
  })

  it('brightens quieter entities', () => {
    const calm = deriveDoppelganger(samplesOf([['twin', 0.1], ['twin', 0.1], ['twin', 0.1]]))
    const loud = deriveDoppelganger(samplesOf([['twin', 0.95], ['twin', 0.95], ['twin', 0.95]]))
    expect(calm!.luminance).toBeGreaterThan(loud!.luminance)
    expect(calm!.complexity).toBeLessThan(loud!.complexity)
  })
})

describe('healing goal', () => {
  it('stays hidden below the focused-mind threshold', () => {
    const entity = deriveDoppelganger(samplesOf([['self', 0.6], ['self', 0.6], ['self', 0.6], ['self', 0.6]]))
    expect(materialiseHealingGoal(entity, 0.3)).toBeNull()
  })

  it('materialises fully in the empty mind', () => {
    const entity = deriveDoppelganger(samplesOf([['self', 0.6], ['self', 0.6], ['self', 0.6], ['self', 0.6]]))
    const goal = materialiseHealingGoal(entity, 1)
    expect(goal).not.toBeNull()
    expect(goal!.materialisation).toBe(1)
    expect(goal!.id).toBe('goal-self')
    expect(goal!.artifact.form).toBe('lotus')
  })

  it('keys the goal on the dominant channel', () => {
    const entity = deriveDoppelganger(samplesOf([['others', 0.9], ['others', 0.9], ['others', 0.9], ['others', 0.9]]))
    const goal = materialiseHealingGoal(entity, 0.8)
    expect(goal!.id).toBe('goal-others')
    expect(goal!.artifact.form).toBe('lattice')
  })
})

describe('zones and layouts', () => {
  it('keeps the brief areas for observation and focus', () => {
    const observation = zoneFootprint('linear', 'observation')
    const focus = zoneFootprint('concentrated', 'focus')
    expect(observation.widthM).toBeGreaterThan(0)
    expect(focus.widthM).toBe(6)
  })

  it('nests the focus area inside the observation area when concentrated', () => {
    const observation = zoneFootprint('concentrated', 'observation')
    const focus = zoneFootprint('concentrated', 'focus')
    expect(footprintContains(observation, focus)).toBe(true)
    const vestibule = zoneFootprint('concentrated', 'vestibule')
    expect(footprintContains(vestibule, observation)).toBe(true)
  })

  it('keeps linear zones independent', () => {
    const layout = healingLayoutById('linear')
    const ordered = [...layout.footprints].sort((a, b) => a.xM - b.xM)
    for (let index = 1; index < ordered.length; index++) {
      const previous = ordered[index - 1]!
      const current = ordered[index]!
      expect(current.xM - current.widthM / 2).toBeGreaterThanOrEqual(previous.xM + previous.widthM / 2)
    }
  })

  it('offers exactly two space-relation variations', () => {
    expect(HEALING_LAYOUTS.map((layout) => layout.id)).toEqual(['linear', 'concentrated'])
  })
})

describe('stations', () => {
  it('matches the brief typologies', () => {
    const kiosk = stationByKind('kiosk-4')
    expect(kiosk.areaSqm).toBe(4)
    expect(kiosk.sphericalDisplay).toBe(true)
    expect(kiosk.soundShower).toBe(true)

    const capsule = stationByKind('capsule-16')
    expect(capsule.areaSqm).toBe(16)

    const event = stationByKind('event-255')
    expect(event.areaSqm).toBe(265.64)
    expect(HEALING_STATIONS).toHaveLength(3)
  })
})

describe('session flow', () => {
  it('gates the focus area on collected data and focus depth', () => {
    let state = createHealingSession()
    expect(canEnterFocusZone(state).reason).toBe('data')
    expect(enterHealingZone(state, 'focus')).toBe(state)

    state = pushDiagnosticSample(state, 'self', 0.8, 1700000000000)
    state = pushDiagnosticSample(state, 'self', 0.8, 1700000000001)
    state = pushDiagnosticSample(state, 'twin', 0.6, 1700000000002)
    state = pushDiagnosticSample(state, 'twin', 0.6, 1700000000003)
    expect(state.doppelganger).not.toBeNull()
    expect(canEnterFocusZone(state).reason).toBe('focus')

    state = setHealingFocus(state, FOCUS_REQUIRED_DEPTH)
    expect(canEnterFocusZone(state).ok).toBe(true)
    const entered = enterHealingZone(state, 'focus')
    expect(entered.zone).toBe('focus')
    expect(entered.goal).not.toBeNull()
  })

  it('detects a healed session only in the empty mind with a full goal', () => {
    let state = createHealingSession()
    for (let index = 0; index < 4; index++) {
      state = pushDiagnosticSample(state, 'self', 0.7, 1700000000000 + index)
    }
    state = setHealingFocus(state, 0.9)
    expect(sessionHealed(state)).toBe(true)
    state = setHealingFocus(state, 0.5)
    expect(sessionHealed(state)).toBe(false)
  })

  it('round-trips through serialization and keeps determinism', () => {
    let state = createHealingSession()
    state = pushDiagnosticSample(state, 'others', 0.55, 1700000000000)
    state = pushDiagnosticSample(state, 'artefacts', 0.4, 1700000000001)
    state = setHealingFocus(state, 0.7)
    const parsed = parseHealingSession(serializeHealingSession(state))
    expect(parsed).toEqual(state)

    const garbage = parseHealingSession('{not json')
    expect(garbage).toBeNull()
  })

  it('caps the rolling sample window', () => {
    let state = createHealingSession()
    for (let index = 0; index < 40; index++) {
      state = pushDiagnosticSample(state, 'twin', 0.5, 1700000000000 + index)
    }
    expect(state.samples).toHaveLength(24)
  })
})
