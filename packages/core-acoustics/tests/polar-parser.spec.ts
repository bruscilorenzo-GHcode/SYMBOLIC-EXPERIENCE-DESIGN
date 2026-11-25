import { describe, expect, it } from 'vitest'
import {
  bakePolarAtlas,
  fitSphericalHarmonics,
  normalizePolarGrid,
  parsePolarTable,
  samplePolarGridDb,
} from '../src'

const singlePlane = `
# normalization: on-axis-0db
# reference_distance_m: 1
azimuth_deg,1000,2000
-90,-6,-8
0,0,0
90,-6,-8
`

const balloon = `
# angle_unit: deg
# value_unit: db
azimuth_deg,elevation_deg,1000
-90,-45,-12
-90,0,-6
-90,45,-12
0,-45,-3
0,0,0
0,45,-3
90,-45,-12
90,0,-6
90,45,-12
`

describe('manufacturer polar parsing', () => {
  it('parses a single-plane table and normalises on axis', () => {
    const parsed = parsePolarTable(singlePlane)
    expect(parsed.grid.frequenciesHz).toEqual([1000, 2000])
    expect(parsed.grid.azimuthsDeg).toEqual([-90, 0, 90])
    expect(samplePolarGridDb(parsed.grid, 0, 0, 1000)).toBeCloseTo(0, 6)
    expect(samplePolarGridDb(parsed.grid, 90, 0, 1000)).toBeCloseTo(-6, 5)
    expect(samplePolarGridDb(parsed.grid, 45, 0, 1000)).toBeCloseTo(-3, 5)
    expect(parsed.warnings.some((warning) => warning.includes('±90'))).toBe(true)
  })

  it('parses azimuth + elevation balloons', () => {
    const parsed = parsePolarTable(balloon, { gridResolutionDeg: 45 })
    expect(parsed.grid.azimuthsDeg.length).toBeGreaterThanOrEqual(8)
    expect(parsed.grid.elevationsDeg).toContain(-45)
    expect(parsed.grid.elevationsDeg).toContain(45)
    expect(samplePolarGridDb(parsed.grid, 0, 0, 1000)).toBeCloseTo(0, 3)
    expect(samplePolarGridDb(parsed.grid, 0, 45, 1000)).toBeCloseTo(-3, 3)
  })

  it('normalises a table whose on-axis value is not zero', () => {
    const parsed = parsePolarTable(`
azimuth_deg,1000
-90,88
0,94
90,88
`, { normalization: 'on-axis' })
    expect(samplePolarGridDb(parsed.grid, 0, 0, 1000)).toBeCloseTo(0, 6)
    expect(samplePolarGridDb(parsed.grid, 90, 0, 1000)).toBeCloseTo(-6, 5)
    expect(normalizePolarGrid(parsed.grid, 'none').valuesDb[0]![1]![1]).toBeCloseTo(0, 6)
  })

  it('bakes a float atlas with the expected dimensions', () => {
    const parsed = parsePolarTable(singlePlane)
    const atlas = bakePolarAtlas(parsed.grid, { width: 32, height: 16 })
    expect(atlas.width).toBe(32)
    expect(atlas.height).toBe(16)
    expect(atlas.bandCount).toBe(2)
    expect(atlas.floatData?.length).toBe(32 * 16 * 2)
    expect(atlas.floatData?.every((value) => value >= 0 && value <= 1)).toBe(true)
  })

  it('fits and evaluates spherical harmonics', () => {
    const parsed = parsePolarTable(balloon, { gridResolutionDeg: 30 })
    const sh = fitSphericalHarmonics(parsed.grid, 2)
    expect(sh.coefficients).toHaveLength(1)
    expect(sh.coefficients[0]).toHaveLength(9)
    expect(sh.coefficients.every((band) => band.every((value) => Number.isFinite(value)))).toBe(true)
  })
})
