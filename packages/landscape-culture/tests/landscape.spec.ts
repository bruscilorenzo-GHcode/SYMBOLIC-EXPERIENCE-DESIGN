import { describe, expect, it } from 'vitest'
import {
  GIARDINO_SONORO_DEMO,
  REQUIRED_FOLIAGE,
  REQUIRED_STRATA,
  auditLandscapeCulture,
  type LandscapeCultureScenario,
} from '../src'

describe('Giardino Sonoro landscape-culture audit', () => {
  it('passes the complete reference scenario', () => {
    const audit = auditLandscapeCulture(GIARDINO_SONORO_DEMO)
    expect(audit.issues).toEqual([])
    expect(audit.scenarioId).toBe('giardino-sonoro-demo')
    expect(Object.keys(audit.palette)).toHaveLength(3)
  })

  it('covers every planting stratum and foliage size', () => {
    const audit = auditLandscapeCulture(GIARDINO_SONORO_DEMO)
    for (const palette of Object.values(audit.palette)) {
      for (const stratum of REQUIRED_STRATA) expect(palette.coverage.strata[stratum]).toBe(true)
      for (const size of REQUIRED_FOLIAGE) expect(palette.coverage.foliage[size]).toBe(true)
    }
  })

  it('plans wired multichannel for the outdoor zones and Bluetooth only for the sheltered heritage zone', () => {
    const audit = auditLandscapeCulture(GIARDINO_SONORO_DEMO)
    const grove = audit.wiring.find((plan) => plan.zoneId === 'zone-grove')!
    const river = audit.wiring.find((plan) => plan.zoneId === 'zone-river')!
    const clearing = audit.wiring.find((plan) => plan.zoneId === 'zone-clearing')!
    expect(grove.method.startsWith('wired-')).toBe(true)
    expect(river.method.startsWith('wired-')).toBe(true)
    expect(clearing.method).toBe('wireless-bluetooth')
    expect(clearing.warnings.some((warning) => warning.includes('Lossy codec'))).toBe(true)
  })

  it('keeps every visitor input in a musical coexistence map', () => {
    const audit = auditLandscapeCulture(GIARDINO_SONORO_DEMO)
    expect(audit.coexistence.sourceCount).toBe(4)
    expect(audit.coexistence.zoneMixes).toHaveLength(4)
    expect(new Set(audit.coexistence.zoneMixes.map((mix) => mix.inputId))).toEqual(
      new Set(['visitor-1', 'visitor-2', 'visitor-3', 'visitor-4']),
    )
    expect(audit.coexistence.globalMode).toBeDefined()
    expect(audit.coexistence.globalTempo).toBeGreaterThan(0)
  })

  it('produces a DATA→MUSIC reading for every zone', () => {
    const audit = auditLandscapeCulture(GIARDINO_SONORO_DEMO)
    expect(audit.dataToMusic).toHaveLength(3)
    const river = audit.dataToMusic.find((zone) => zone.zoneId === 'zone-river')!
    const clearing = audit.dataToMusic.find((zone) => zone.zoneId === 'zone-clearing')!
    expect(river.result.usedReadings.length).toBe(5)
    expect(river.result.controls.roughness).toBeGreaterThan(0.4)
    expect(river.result.controls.granularity).toBeGreaterThan(0.2)
    expect(clearing.result.usedReadings.length).toBe(2)
  })

  it('synthesizes the textual inputs into a validated multichannel draft', () => {
    const audit = auditLandscapeCulture(GIARDINO_SONORO_DEMO)
    expect(audit.textual.issues).toEqual([])
    expect(audit.textual.draft.attribution).toHaveLength(2)
    expect(audit.textual.draft.zones).toHaveLength(3)
    expect(audit.textual.draft.zones.flatMap((zone) => zone.layers).length).toBeGreaterThanOrEqual(3)
  })

  it('is deterministic', () => {
    const a = auditLandscapeCulture(GIARDINO_SONORO_DEMO)
    const b = auditLandscapeCulture(GIARDINO_SONORO_DEMO)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('rejects unknown zones and overlapping channel spans', () => {
    const invalid: LandscapeCultureScenario = {
      ...GIARDINO_SONORO_DEMO,
      visitorInputs: [
        { ...GIARDINO_SONORO_DEMO.visitorInputs[0]!, zoneId: 'zone-unknown' },
      ],
      zones: [
        { ...GIARDINO_SONORO_DEMO.zones[0]! },
        { ...GIARDINO_SONORO_DEMO.zones[1]!, channelStart: 2 },
      ],
    }
    const audit = auditLandscapeCulture(invalid)
    expect(audit.issues.some((issue) => issue.includes('unknown zone'))).toBe(true)
    expect(audit.issues.some((issue) => issue.includes('overlapping channel spans'))).toBe(true)
  })

  it('rejects zones beyond the channel budget', () => {
    const invalid: LandscapeCultureScenario = {
      ...GIARDINO_SONORO_DEMO,
      policy: { ...GIARDINO_SONORO_DEMO.policy, channelCount: 8 },
    }
    const audit = auditLandscapeCulture(invalid)
    expect(audit.issues.some((issue) => issue.includes('exceeds 8 channels'))).toBe(true)
  })

  it('fails an incomplete landscape palette', () => {
    const incomplete: LandscapeCultureScenario = {
      ...GIARDINO_SONORO_DEMO,
      planting: [
        {
          ...GIARDINO_SONORO_DEMO.planting[0]!,
          items: [
            { profileId: 'pachysandra-terminalis', quantity: 10, zoneId: 'zone-grove' },
          ],
        },
      ],
    }
    const audit = auditLandscapeCulture(incomplete)
    expect(audit.issues.some((issue) => issue.includes('missing shrub'))).toBe(true)
    expect(audit.issues.some((issue) => issue.includes('missing large-tree'))).toBe(true)
  })
})
