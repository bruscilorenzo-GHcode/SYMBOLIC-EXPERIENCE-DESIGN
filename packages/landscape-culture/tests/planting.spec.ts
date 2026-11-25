import { describe, expect, it } from 'vitest'
import {
  GIARDINO_SONORO_DEMO,
  PLANT_CATALOG,
  REQUIRED_FOLIAGE,
  REQUIRED_STRATA,
  auditLandscapePalette,
  getPlantProfile,
  paletteAcousticSummary,
  plantingTotals,
  validatePlantProfile,
  vegetationAttenuationDb,
  type PlantingDesign,
} from '../src'

describe('landscape planting culture', () => {
  it('itemises every vertical stratum and foliage size', () => {
    for (const stratum of REQUIRED_STRATA) {
      expect(PLANT_CATALOG.some((profile) => profile.stratum === stratum), stratum).toBe(true)
    }
    for (const size of REQUIRED_FOLIAGE) {
      expect(PLANT_CATALOG.some((profile) => profile.foliageSize === size), size).toBe(true)
    }
    expect(new Set(PLANT_CATALOG.map((profile) => profile.botanicalName)).size).toBe(PLANT_CATALOG.length)
  })

  it('validates every catalog profile', () => {
    for (const profile of PLANT_CATALOG) {
      expect(validatePlantProfile(profile), profile.id).toEqual([])
    }
  })

  it('orders canopy attenuation by foliage size and frequency', () => {
    const smallLeaves = getPlantProfile('quercus-ilex')!
    const largeLeaves = getPlantProfile('platanus-acerifolia')!
    const smallAt1k = smallLeaves.acoustic.canopyAttenuationDbPerM.values[4]!
    const largeAt1k = largeLeaves.acoustic.canopyAttenuationDbPerM.values[4]!
    expect(largeAt1k).toBeGreaterThan(smallAt1k)
    expect(vegetationAttenuationDb(smallLeaves, 20, 8000)).toBeGreaterThan(
      vegetationAttenuationDb(smallLeaves, 20, 1000),
    )
    expect(vegetationAttenuationDb(smallLeaves, 20, 1000)).toBeGreaterThan(
      vegetationAttenuationDb(smallLeaves, 10, 1000),
    )
  })

  it('accepts the Giardino Sonoro demo palette', () => {
    for (const design of GIARDINO_SONORO_DEMO.planting) {
      const audit = auditLandscapePalette(design)
      expect(audit.issues, design.id).toEqual([])
      for (const stratum of REQUIRED_STRATA) expect(audit.coverage.strata[stratum], `${design.id}:${stratum}`).toBe(true)
      for (const size of REQUIRED_FOLIAGE) expect(audit.coverage.foliage[size], `${design.id}:${size}`).toBe(true)
    }
  })

  it('detects an incomplete vertical palette', () => {
    const incomplete: PlantingDesign = {
      id: 'incomplete',
      name: 'Incomplete palette',
      zoneId: 'zone-test',
      areaM2: 100,
      items: [
        { profileId: 'pachysandra-terminalis', quantity: 20, zoneId: 'zone-test' },
        { profileId: 'viburnum-tinus', quantity: 4, zoneId: 'zone-test' },
      ],
    }
    const audit = auditLandscapePalette(incomplete)
    expect(audit.issues.some((issue) => issue.includes('small-tree'))).toBe(true)
    expect(audit.issues.some((issue) => issue.includes('large-tree'))).toBe(true)
    expect(audit.issues.some((issue) => issue.includes('large foliage'))).toBe(true)
  })

  it('warns about an exotic-only palette', () => {
    const exoticOnly: PlantingDesign = {
      id: 'exotic',
      name: 'Exotic-only palette',
      zoneId: 'zone-test',
      areaM2: 100,
      items: [
        { profileId: 'pachysandra-terminalis', quantity: 20, zoneId: 'zone-test' },
        { profileId: 'hydrangea-macrophylla', quantity: 4, zoneId: 'zone-test' },
        { profileId: 'acer-palmatum', quantity: 2, zoneId: 'zone-test' },
        { profileId: 'magnolia-grandiflora', quantity: 1, zoneId: 'zone-test' },
        { profileId: 'platanus-acerifolia', quantity: 1, zoneId: 'zone-test' },
      ],
    }
    const audit = auditLandscapePalette(exoticOnly)
    expect(audit.issues).toEqual([])
    expect(audit.warnings.some((warning) => warning.includes('native/Mediterranean share'))).toBe(true)
  })

  it('computes totals and a band-wise acoustic summary', () => {
    const design = GIARDINO_SONORO_DEMO.planting[0]!
    const totals = plantingTotals(design)
    expect(totals.totalPlants).toBe(100)
    expect(totals.byStratum['large-tree']).toBe(2)
    expect(totals.canopyAreaM2).toBeGreaterThan(0)
    const summary = paletteAcousticSummary(design)
    expect(summary.absorption.values).toHaveLength(9)
    expect(summary.scattering.values.every((value) => value >= 0 && value <= 1)).toBe(true)
    expect(summary.canopyAttenuationDbPerM.values.every((value) => value > 0)).toBe(true)
  })
})
