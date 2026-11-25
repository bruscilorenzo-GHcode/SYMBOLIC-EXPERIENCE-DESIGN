import { describe, expect, it } from 'vitest'
import {
  airAbsorptionDbPerM,
  lineArrayTransitionDistanceM,
  lineSourceAttenuationDb,
  pointSourceAttenuationDb,
  splAtReceiver,
} from '../src'

const omni = {
  kind: 'parametric' as const,
  normalization: 'on-axis-0db' as const,
  referenceDistanceM: 1,
  parametric: { model: 'omnidirectional' as const },
}

describe('SPL propagation', () => {
  it('follows inverse-square law for a point source', () => {
    const at2m = splAtReceiver({
      receiverM: [0, 0, 2],
      frequencyHz: 1000,
      sources: [{ positionM: [0, 0, 0], directivity: omni, sensitivityDbSpl1W1m: 100 }],
    }).splDb
    const at4m = splAtReceiver({
      receiverM: [0, 0, 4],
      frequencyHz: 1000,
      sources: [{ positionM: [0, 0, 0], directivity: omni, sensitivityDbSpl1W1m: 100 }],
    }).splDb

    // The default ISO atmosphere adds a few thousandths of a dB over these runs.
    expect(at2m).toBeCloseTo(100 - 20 * Math.log10(2), 2)
    expect(Math.abs(at2m - at4m - 20 * Math.log10(2))).toBeLessThan(0.02)
  })

  it('applies on-axis gain and rear attenuation for a cardioid', () => {
    const front = splAtReceiver({
      receiverM: [0, 0, 2],
      frequencyHz: 1000,
      sources: [
        {
          positionM: [0, 0, 0],
          directivity: {
            kind: 'parametric',
            normalization: 'on-axis-0db',
            referenceDistanceM: 1,
            parametric: { model: 'cardioid', rearAttenuationDb: 30 },
          },
          sensitivityDbSpl1W1m: 100,
        },
      ],
    }).splDb
    const rear = splAtReceiver({
      receiverM: [0, 0, -2],
      frequencyHz: 1000,
      sources: [
        {
          positionM: [0, 0, 0],
          directivity: {
            kind: 'parametric',
            normalization: 'on-axis-0db',
            referenceDistanceM: 1,
            parametric: { model: 'cardioid', rearAttenuationDb: 30 },
          },
          sensitivityDbSpl1W1m: 100,
        },
      ],
    }).splDb

    expect(front).toBeCloseTo(100 - 20 * Math.log10(2), 2)
    expect(front - rear).toBeGreaterThan(25)
  })

  it('sums independent sources incoherently', () => {
    const result = splAtReceiver({
      receiverM: [0, 0, 2],
      frequencyHz: 1000,
      sources: [
        { positionM: [0, 0, 0], directivity: omni, sensitivityDbSpl1W1m: 90 },
        { positionM: [0, 0, 0], directivity: omni, sensitivityDbSpl1W1m: 90 },
      ],
    })
    expect(result.splDb).toBeCloseTo(90 - 20 * Math.log10(2) + 10 * Math.log10(2), 2)
  })

  it('reports cylindrical-to-spherical line-array decay', () => {
    const transition = lineArrayTransitionDistanceM(2, 1000)
    expect(transition).toBeGreaterThan(1)
    const nearLoss = lineSourceAttenuationDb(4, 1, 2, 1000) - lineSourceAttenuationDb(2, 1, 2, 1000)
    const sphericalLoss = pointSourceAttenuationDb(4, 1) - pointSourceAttenuationDb(2, 1)
    expect(nearLoss).toBeGreaterThan(3)
    expect(nearLoss).toBeLessThan(sphericalLoss)
  })

  it('increases atmospheric absorption with frequency', () => {
    const low = airAbsorptionDbPerM(1000)
    const high = airAbsorptionDbPerM(8000)
    expect(low).toBeGreaterThan(0.001)
    expect(low).toBeLessThan(0.02)
    expect(high).toBeGreaterThan(low * 5)
  })
})
