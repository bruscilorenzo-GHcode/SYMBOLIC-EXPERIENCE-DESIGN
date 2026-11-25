import { describe, expect, it } from 'vitest'
import {
  MINDKESTRA_PROTOCOL_ID,
  MUSICO_CROSS_ONTOLOGY,
  describeDataToMusic,
  mapReadingsToMusicalDescriptor,
  mapValue,
  sonifyZones,
  type EnvironmentalMetric,
  type EnvironmentalReading,
} from '../src'
import { GIARDINO_SONORO_DEMO } from '../src'

function reading(
  id: string,
  metric: EnvironmentalMetric,
  value: number,
  zoneId = 'zone-river',
  quality: EnvironmentalReading['quality'] = 'measured',
): EnvironmentalReading {
  return {
    id,
    metric,
    value,
    unit: 'unit',
    min: 0,
    max: 100,
    zoneId,
    timestamp: '2026-10-22T00:00:00.000Z',
    quality,
  }
}

describe('MUSI-CO DATA→MUSIC cross-ontology', () => {
  it('exposes the Mindkestra-compatible protocol', () => {
    expect(MUSICO_CROSS_ONTOLOGY.protocol).toBe(MINDKESTRA_PROTOCOL_ID)
    expect(MUSICO_CROSS_ONTOLOGY.id).toBe('musico.data-to-music.v1')
    expect(MUSICO_CROSS_ONTOLOGY.mappings.length).toBeGreaterThan(10)
    expect(MUSICO_CROSS_ONTOLOGY.note).toContain('Artistic mapping')
  })

  it('turns polluted water into rougher, darker, more granular music', () => {
    const clean = mapReadingsToMusicalDescriptor([
      reading('c-pollution', 'water.pollutionIndex', 0.1),
      reading('c-oxygen', 'water.dissolvedOxygen', 9),
      reading('c-turbidity', 'water.turbidity', 5),
      reading('c-ph', 'water.ph', 7.2),
    ])
    const polluted = mapReadingsToMusicalDescriptor([
      reading('p-pollution', 'water.pollutionIndex', 0.9),
      reading('p-oxygen', 'water.dissolvedOxygen', 2),
      reading('p-turbidity', 'water.turbidity', 80),
      reading('p-ph', 'water.ph', 7.8),
    ])

    expect(polluted.controls.roughness!).toBeGreaterThan(clean.controls.roughness!)
    expect(polluted.controls.brightness!).toBeLessThan(clean.controls.brightness!)
    expect(polluted.controls.granularity!).toBeGreaterThan(clean.controls.granularity!)
    expect(clean.controls.density!).toBeGreaterThan(polluted.controls.density!)
    expect(polluted.descriptor.mode).toBe('dorian')
    expect(polluted.descriptor.tempoBpm).toBeGreaterThanOrEqual(20)
    expect(polluted.usedReadings).toHaveLength(4)
  })

  it('maps particulate air pollution to closure and roughness', () => {
    const cleanAir = mapReadingsToMusicalDescriptor([reading('clean-air', 'air.pm25', 5)])
    const dirtyAir = mapReadingsToMusicalDescriptor([reading('dirty-air', 'air.pm25', 60)])
    expect(dirtyAir.controls.roughness!).toBeGreaterThan(cleanAir.controls.roughness!)
    expect(dirtyAir.controls.filterCutoff!).toBeLessThan(cleanAir.controls.filterCutoff!)
  })

  it('maps pH to a bounded harmonic centre', () => {
    const acidic = mapReadingsToMusicalDescriptor([reading('acid', 'water.ph', 4)])
    const alkaline = mapReadingsToMusicalDescriptor([reading('alkaline', 'water.ph', 10)])
    expect(acidic.controls.rootPitchClass).toBeCloseTo(0, 6)
    expect(alkaline.controls.rootPitchClass).toBeCloseTo(11, 6)
    expect(acidic.descriptor.tonicPc).toBeGreaterThanOrEqual(0)
    expect(acidic.descriptor.tonicPc).toBeLessThanOrEqual(11)
  })

  it('uses the default descriptor and warns when data is missing', () => {
    const result = mapReadingsToMusicalDescriptor([
      reading('missing', 'water.pollutionIndex', 0.5, 'zone-river', 'missing'),
    ])
    expect(result.usedReadings).toEqual([])
    expect(result.warnings.some((warning) => warning.includes('missing'))).toBe(true)
    expect(result.warnings.some((warning) => warning.includes('default descriptor'))).toBe(true)
    expect(result.descriptor.mode).toBe('dorian')
  })

  it('sonifies each landscape zone with its own channel span', () => {
    const zones = GIARDINO_SONORO_DEMO.zones
    const results = sonifyZones(
      [
        reading('river', 'water.pollutionIndex', 0.62, 'zone-river'),
        reading('grove', 'air.pm25', 18, 'zone-grove'),
      ],
      zones,
    )
    expect(results).toHaveLength(3)
    expect(results[0]).toMatchObject({ zoneId: 'zone-grove', channelStart: 0, channelCount: 4 })
    expect(results[1]).toMatchObject({ zoneId: 'zone-river', channelStart: 4, channelCount: 4 })
    expect(results[2]!.result.warnings.some((warning) => warning.includes('No usable'))).toBe(true)
  })

  it('is deterministic and exposes a human-readable summary', () => {
    const readings = [reading('river', 'water.pollutionIndex', 0.62)]
    const a = mapReadingsToMusicalDescriptor(readings)
    const b = mapReadingsToMusicalDescriptor(readings)
    expect(a).toEqual(b)
    expect(describeDataToMusic(a)).toContain('BPM')
    expect(describeDataToMusic(a)).toContain('roughness=')
  })

  it('clamps mapping values and supports inverse curves', () => {
    const mapping = MUSICO_CROSS_ONTOLOGY.mappings.find((item) => item.metric === 'water.pollutionIndex')!
    expect(mapValue(-10, mapping)).toBe(mapping.outputMin)
    expect(mapValue(10, mapping)).toBe(mapping.outputMax)
    const inverse = { ...mapping, curve: 'inverse' as const }
    expect(mapValue(0, inverse)).toBe(mapping.outputMax)
    expect(mapValue(1, inverse)).toBe(mapping.outputMin)
  })
})
