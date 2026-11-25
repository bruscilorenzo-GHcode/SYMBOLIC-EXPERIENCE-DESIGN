import { describe, expect, it } from 'vitest'
import {
  lineArrayArrayFactorDb,
  maxAliasingFrequencyHz,
  steeringDelaysS,
  verticalWindowDb,
} from '../src'

describe('line-array beam model', () => {
  it('has a 0 dB main lobe at the steering angle', () => {
    const onBeam = lineArrayArrayFactorDb(8, 0.12, 30, 30, 2000)
    const offBeam = lineArrayArrayFactorDb(8, 0.12, 30, -30, 2000)
    expect(onBeam).toBeCloseTo(0, 6)
    expect(offBeam).toBeLessThan(-10)
  })

  it('produces monotonic steering delays', () => {
    const delays = steeringDelaysS(8, 0.12, 30)
    expect(delays).toHaveLength(8)
    expect(delays[0]).toBe(0)
    for (let i = 1; i < delays.length; i += 1) {
      expect(delays[i]!).toBeGreaterThan(delays[i - 1]!)
    }
  })

  it('reports the spatial Nyquist limit', () => {
    expect(maxAliasingFrequencyHz(0.12)).toBeCloseTo(343 / 0.24, 6)
  })

  it('rolls off outside the vertical window', () => {
    expect(verticalWindowDb(0, 60)).toBeCloseTo(0, 6)
    expect(verticalWindowDb(45, 30)).toBeLessThan(-10)
  })
})
