import { describe, expect, it } from 'vitest'
import type { AcousticSpeakerProfile, SpatialAudioSession } from '../src'
import { computeBom, estimateNetworkBudget } from '../src'

const profile = {
  id: 'p1',
  manufacturer: { id: 'm', name: 'Maker' },
  model: { name: 'Model', code: 'M-1' },
  kind: 'point-source',
  acoustics: {
    powerHandlingW: { rmsW: 100, peakW: 400 },
    bandsHz: [1000],
    sensitivityDbSpl1W1m: { frequenciesHz: [1000], values: [90] },
    maxSplDb: { frequenciesHz: [1000], values: [110] },
    impedanceOhm: { frequenciesHz: [1000], values: [8] },
    directivity: { kind: 'parametric', normalization: 'on-axis-0db', referenceDistanceM: 1, parametric: { model: 'omnidirectional' } },
  },
  electrical: { configuration: 'low-z', nominalImpedanceOhm: 8, connector: 'terminal', tapsW: [30] },
  physical: { ipRating: 'IP66', weightKg: 10, dimensionsM: { width: 1, height: 1, depth: 1 }, materials: [], operatingTemperatureC: { min: -10, max: 50 }, mountingPoints: [] },
  accessories: [],
  files: {},
  provenance: { source: 'test', retrievedAt: '', license: 'test', verification: 'illustrative' },
} as unknown as AcousticSpeakerProfile

function session(profileIds = ['p1', 'p1']): SpatialAudioSession {
  return {
    id: 's',
    speakerPlacements: profileIds.map((profileId, index) => ({
      id: `spk-${index}`,
      profileId,
      label: `Speaker ${index}`,
      positionM: [index, 2, 0],
      orientationDeg: [0, 0, 0],
      gainDb: 0,
      delayMs: 0,
      polarity: 0,
      groupIds: [],
      locked: false,
      amplifierChannelId: 'amp-1',
    })),
    outputs: [],
    renderer: { sampleRateHz: 48000 },
  } as unknown as SpatialAudioSession
}

describe('BOM and network budget', () => {
  it('sizes a low-Z system with headroom', () => {
    const bom = computeBom(session(['p1', 'p1', 'p1', 'p1', 'p1']), [profile], { headroomDb: 10 })
    expect(bom.totals.speakerCount).toBe(5)
    expect(bom.totals.rmsPowerW).toBe(500)
    expect(bom.totals.amplifierPowerW).toBeCloseTo(5000, 0)
    expect(bom.items.some((item) => item.category === 'loudspeaker')).toBe(true)
    expect(bom.warnings.some((warning) => warning.includes('Ω'))).toBe(true)
  })

  it('sizes a 70 V tap load', () => {
    const bom = computeBom(session(), [profile], { voltageMode: '70v' })
    expect(bom.totals.tapLoadW).toBe(60)
    expect(bom.totals.amplifierPowerW).toBe(75)
  })

  it('budgets Dante payload, overhead and latency', () => {
    const budget = estimateNetworkBudget({ channels: 48, redundant: true, switchHops: 2 })
    expect(budget.rawMbps).toBeCloseTo((48 * 48000 * 24) / 1e6, 3)
    expect(budget.budgetedMbps).toBeGreaterThan(budget.rawMbps)
    expect(budget.requirements.some((item) => item.includes('PTP'))).toBe(true)
    expect(budget.latencyBudgetMs).toBeGreaterThan(0)
  })
})
