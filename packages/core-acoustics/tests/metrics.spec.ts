import { describe, expect, it } from 'vitest'
import {
  clarityC50Db,
  coverageStats,
  directToReverberantDb,
  estimateSti,
  phaseCoherence,
  roomConstantM2,
  sabineT60,
} from '../src'

describe('room and intelligibility metrics', () => {
  it('computes Sabine T60 and room constant', () => {
    const t60 = sabineT60(1000, 1200, 0.2)
    expect(t60).toBeCloseTo((0.161 * 1000) / (1200 * 0.2), 6)
    expect(roomConstantM2(1200, 0.2)).toBeCloseTo(300, 6)
  })

  it('computes direct-to-reverberant ratio', () => {
    const dtr = directToReverberantDb(1, 2, 300)
    expect(dtr).toBeCloseTo(10 * Math.log10(300 / (16 * Math.PI * 4)), 6)
  })

  it('estimates STI from T60 and SNR', () => {
    const dry = estimateSti({ t60S: 0.2, snrDb: 30 })
    const wet = estimateSti({ t60S: 4, snrDb: 0 })
    expect(dry.sti).toBeGreaterThan(0.85)
    expect(wet.sti).toBeLessThan(dry.sti)
    expect(dry.bandTransmissionIndex).toHaveLength(7)
  })

  it('computes clarity and phase coherence', () => {
    expect(clarityC50Db(1, 0.1)).toBeCloseTo(10, 6)
    expect(phaseCoherence([{ distanceM: 1, levelDb: 90 }], 1000)).toBeCloseTo(1, 6)
    const anti = phaseCoherence(
      [
        { distanceM: 1, levelDb: 90 },
        { distanceM: 1, levelDb: 90, polarity: 1 },
      ],
      1000,
    )
    expect(anti).toBeLessThan(0.001)
  })

  it('summarises coverage uniformity', () => {
    const stats = coverageStats([90, 91, 92, 99], 3)
    expect(stats.sampleCount).toBe(4)
    expect(stats.withinTolerancePct).toBe(75)
  })
})
