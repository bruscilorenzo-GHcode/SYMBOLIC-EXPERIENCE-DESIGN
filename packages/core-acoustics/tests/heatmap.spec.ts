import { describe, expect, it } from 'vitest'
import { pointInPolygon, sampleListenerPlane } from '../src'

const omni = {
  kind: 'parametric' as const,
  normalization: 'on-axis-0db' as const,
  referenceDistanceM: 1,
  parametric: { model: 'omnidirectional' as const },
}

describe('listener-plane heatmap', () => {
  it('masks outside the listener footprint', () => {
    expect(pointInPolygon(0, 0, [[-1, -1], [1, -1], [1, 1], [-1, 1]])).toBe(true)
    expect(pointInPolygon(2, 0, [[-1, -1], [1, -1], [1, 1], [-1, 1]])).toBe(false)
  })

  it('produces a finite SPL field for one source', () => {
    const result = sampleListenerPlane({
      plane: {
        id: 'p',
        name: 'listener',
        heightM: 1.2,
        footprint: [[-5, -5], [5, -5], [5, 5], [-5, 5]],
        resolutionM: 1,
        tags: [],
      },
      sources: [
        {
          id: 's1',
          positionM: [0, 4, 0],
          directivity: omni,
          sensitivityDbSpl1W1m: 100,
        },
      ],
      frequencyHz: 1000,
    })

    expect(result.width).toBeGreaterThan(5)
    expect(result.height).toBeGreaterThan(5)
    expect(result.mask.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0)
    expect(result.stats.minDb).toBeGreaterThan(60)
    expect(result.stats.maxDb).toBeLessThan(110)
    const centerIndex = Math.floor(result.height / 2) * result.width + Math.floor(result.width / 2)
    expect(result.valuesDb[centerIndex]).toBeGreaterThan(result.stats.meanDb)
  })
})
