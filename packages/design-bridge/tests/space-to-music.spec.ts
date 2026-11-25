import { describe, expect, it } from 'vitest'
import type { ArchitecturalEnvironment, SpatialAudioSession } from '@aura-spec/core-acoustics'
import { soundscapeFromArchitecture } from '../src'

const BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

function material(id: string, category: 'concrete' | 'glass' | 'vegetation', absorption: number): ArchitecturalEnvironment['materials'][number] {
  return {
    id,
    name: id,
    category,
    absorption: { frequenciesHz: BANDS, values: BANDS.map(() => absorption) },
    scattering: { frequenciesHz: BANDS, values: BANDS.map(() => 0.2) },
  }
}

function environment(glassRatio = 0.25, absorption = 0.1): ArchitecturalEnvironment {
  const width = 24
  const depth = 16
  const height = 6
  return {
    schemaVersion: '1.0.0',
    id: `env-${glassRatio}-${absorption}`,
    name: 'Test courtyard',
    coordinateSystem: { handedness: 'right', upAxis: 'Y', units: 'm' },
    layers: [],
    materials: [
      material('concrete', 'concrete', absorption),
      material('glass', 'glass', 0.05),
      material('green', 'vegetation', 0.35),
    ],
    surfaces: [
      {
        id: 'floor',
        name: 'Floor',
        role: 'floor',
        geometry: {
          type: 'plane',
          geometry: { widthM: width, depthM: depth, transform: { positionM: [0, 0, 0], rotationDeg: [0, 0, 0] } },
        },
        materialId: 'concrete',
        layerIds: [],
        locked: false,
        visible: true,
      },
      {
        id: 'north',
        name: 'North wall',
        role: 'wall',
        geometry: {
          type: 'plane',
          geometry: { widthM: width, depthM: height, transform: { positionM: [0, height / 2, -depth / 2], rotationDeg: [0, 0, 0] } },
        },
        materialId: glassRatio > 0.3 ? 'glass' : 'concrete',
        layerIds: [],
        locked: false,
        visible: true,
      },
      {
        id: 'planter',
        name: 'Planter',
        role: 'soft',
        geometry: {
          type: 'plane',
          geometry: { widthM: 8, depthM: 2, transform: { positionM: [-6, 0.4, 4], rotationDeg: [0, 0, 0] } },
        },
        materialId: 'green',
        layerIds: [],
        locked: false,
        visible: true,
      },
    ],
    zones: [
      {
        id: 'zone-main',
        name: 'Main',
        kind: 'open-air',
        exposure: 'outdoor',
        footprint: [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]],
        floorHeightM: 0,
        ceilingHeightM: height,
        tags: [],
      },
      {
        id: 'zone-edge',
        name: 'Edge',
        kind: 'transition',
        exposure: 'sheltered',
        footprint: [[-width / 2, -depth / 2], [-width / 4, -depth / 2], [-width / 4, depth / 2], [-width / 2, depth / 2]],
        floorHeightM: 0,
        ceilingHeightM: 3,
        tags: [],
      },
    ],
    listenerPlanes: [
      {
        id: 'listener',
        name: 'Audience',
        heightM: 1.2,
        footprint: [[-8, -6], [8, -6], [8, 6], [-8, 6]],
        resolutionM: 1,
        tags: [],
      },
    ],
    imports: { cad: [], raster: [] },
    defaultConditions: { temperatureC: 20, humidityPct: 50, pressureKPa: 101.325, windSpeedMs: 0, windDirectionDeg: 0 },
    metadata: { createdAt: '', updatedAt: '', author: 'test', tags: [] },
  }
}

function session(): SpatialAudioSession {
  return {
    id: 'session',
    speakerPlacements: Array.from({ length: 8 }, (_, index) => ({
      id: `spk-${index}`,
      profileId: 'as-reference-omni-01',
      label: `Speaker ${index}`,
      positionM: [index, 3, 0],
      orientationDeg: [0, 0, 0],
      gainDb: 0,
      delayMs: 0,
      polarity: 0,
      groupIds: [],
      locked: false,
    })),
    outputs: Array.from({ length: 8 }, (_, index) => ({ id: `out-${index}`, index })),
    transport: { timeSignature: [4, 4] },
  } as unknown as SpatialAudioSession
}

describe('architecture-first soundscape', () => {
  it('derives a complete soundscape plan from spatial features', () => {
    const plan = soundscapeFromArchitecture(environment(), session())
    expect(plan.metrics.volumeM3).toBeGreaterThan(0)
    expect(plan.metrics.surfaceAreaM2).toBeGreaterThan(0)
    expect(plan.metrics.t60S).toBeGreaterThan(0)
    expect(plan.metrics.zoneCount).toBe(2)
    expect(plan.metrics.speakerCount).toBe(8)
    expect(plan.zones).toHaveLength(2)
    expect(plan.sources).toHaveLength(2)
    expect(plan.zones[0]!.channelStart).toBe(0)
    expect(plan.zones[1]!.channelStart).toBe(4)
    expect(plan.globalDescriptor.tempoBpm).toBeGreaterThanOrEqual(40)
    expect(plan.globalDescriptor.tempoBpm).toBeLessThanOrEqual(120)
    expect(plan.spatialization).toBe('hoa')
    expect(plan.rationale.length).toBeGreaterThanOrEqual(4)
  })

  it('responds to glass and absorption', () => {
    const hard = soundscapeFromArchitecture(environment(0.5, 0.05), session())
    const soft = soundscapeFromArchitecture(environment(0.1, 0.5), session())
    expect(hard.globalDescriptor.brightness).toBeGreaterThan(soft.globalDescriptor.brightness)
    expect(hard.metrics.t60S).toBeGreaterThan(soft.metrics.t60S)
    expect(hard.globalDescriptor.mode).not.toBe(soft.globalDescriptor.mode)
  })

  it('warns when the model has no surfaces or speakers', () => {
    const empty = { ...environment(), surfaces: [] }
    const noSpeakers = { ...session(), speakerPlacements: [], outputs: [] }
    const plan = soundscapeFromArchitecture(empty, noSpeakers)
    expect(plan.warnings.some((warning) => warning.includes('No boundary surfaces'))).toBe(true)
    expect(plan.warnings.some((warning) => warning.includes('No speaker placements'))).toBe(true)
  })

  it('is deterministic', () => {
    expect(soundscapeFromArchitecture(environment(), session())).toEqual(
      soundscapeFromArchitecture(environment(), session()),
    )
  })
})
