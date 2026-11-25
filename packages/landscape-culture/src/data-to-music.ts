import type { LandscapeZone } from './landscape-types'
import type { Mode, MusicalDescriptor, Register } from './music'
import { DEFAULT_DESCRIPTOR, MODES, clamp, clamp01, normalizePitchClass } from './music'

export type EnvironmentalMetric =
  | 'water.pollutionIndex'
  | 'water.dissolvedOxygen'
  | 'water.turbidity'
  | 'water.ph'
  | 'air.pm25'
  | 'air.no2'
  | 'air.pollutionIndex'
  | 'noise.laeq'
  | 'weather.temperature'
  | 'weather.humidity'
  | 'light.par'
  | 'flow.rate'

export type ReadingQuality = 'measured' | 'modelled' | 'estimated' | 'missing'

export interface EnvironmentalReading {
  id: string
  metric: EnvironmentalMetric
  value: number
  unit: string
  min: number
  max: number
  zoneId: string
  timestamp: string
  quality?: ReadingQuality
}

export type MusicalTarget =
  | 'tempo'
  | 'rootPitchClass'
  | 'modeIndex'
  | 'registerIndex'
  | 'density'
  | 'brightness'
  | 'roughness'
  | 'pulse'
  | 'spread'
  | 'gainDb'
  | 'filterCutoff'
  | 'granularity'
  | 'reverb'

export type MappingCurve = 'linear' | 'log' | 'exp' | 'inverse'

export interface CrossOntologyMapping {
  metric: EnvironmentalMetric
  target: MusicalTarget
  inputMin: number
  inputMax: number
  outputMin: number
  outputMax: number
  curve: MappingCurve
  /** 1 = pollution/high values increase the target; -1 = invert. */
  polarity: 1 | -1
  weight: number
  rationale: string
}

export interface DataToMusicOntology {
  id: string
  name: string
  protocol: string
  note: string
  mappings: CrossOntologyMapping[]
  modes: Mode[]
}

export interface DataToMusicResult {
  protocol: string
  descriptor: MusicalDescriptor
  controls: Partial<Record<MusicalTarget, number>>
  usedReadings: string[]
  warnings: string[]
}

export interface ZoneSonification {
  zoneId: string
  channelStart: number
  channelCount: number
  result: DataToMusicResult
}

export const MINDKESTRA_PROTOCOL_ID = 'musico.mindkestra.data-to-music.v1'

/**
 * MUSI-CO / Mindkestra-compatible cross-ontology.
 *
 * This is an artistic sonification contract, not a scientific pollution index.
 * A high pollution value is not "louder": it increases roughness, lowers
 * brightness and opens granular texture, while clean/high-oxygen water supports
 * density and brightness. The point is a coherent musical world that preserves
 * the data's direction and relative magnitude.
 */
export const MUSICO_CROSS_ONTOLOGY: DataToMusicOntology = {
  id: 'musico.data-to-music.v1',
  name: 'MUSI-CO DATA→MUSIC / Mindkestra cross-ontology',
  protocol: MINDKESTRA_PROTOCOL_ID,
  note:
    'Artistic mapping. Values are normalised within the declared ranges and aggregated per target. Replace ranges with the official MUSI-CO/Mindkestra protocol tables when available.',
  modes: ['dorian', 'aeolian', 'phrygian', 'ionian', 'lydian', 'mixolydian', 'locrian'],
  mappings: [
    {
      metric: 'water.pollutionIndex',
      target: 'roughness',
      inputMin: 0,
      inputMax: 1,
      outputMin: 0.05,
      outputMax: 0.95,
      curve: 'linear',
      polarity: 1,
      weight: 1,
      rationale: 'Polluted water thickens the spectrum and increases granular friction.',
    },
    {
      metric: 'water.pollutionIndex',
      target: 'brightness',
      inputMin: 0,
      inputMax: 1,
      outputMin: 0.8,
      outputMax: 0.2,
      curve: 'linear',
      polarity: 1,
      weight: 0.7,
      rationale: 'Clean water is bright; pollution absorbs the upper partials.',
    },
    {
      metric: 'water.dissolvedOxygen',
      target: 'density',
      inputMin: 0,
      inputMax: 14,
      outputMin: 0.2,
      outputMax: 0.8,
      curve: 'linear',
      polarity: 1,
      weight: 1,
      rationale: 'Oxygen supports life and polyphonic activity.',
    },
    {
      metric: 'water.turbidity',
      target: 'granularity',
      inputMin: 0,
      inputMax: 100,
      outputMin: 0.1,
      outputMax: 1,
      curve: 'log',
      polarity: 1,
      weight: 1,
      rationale: 'Turbidity becomes grain size and density of the texture.',
    },
    {
      metric: 'water.ph',
      target: 'rootPitchClass',
      inputMin: 4,
      inputMax: 10,
      outputMin: 0,
      outputMax: 11,
      curve: 'linear',
      polarity: 1,
      weight: 0.8,
      rationale: 'pH is a slow harmonic centre, not a pitch event.',
    },
    {
      metric: 'air.pm25',
      target: 'roughness',
      inputMin: 0,
      inputMax: 100,
      outputMin: 0.05,
      outputMax: 0.95,
      curve: 'log',
      polarity: 1,
      weight: 1,
      rationale: 'Particulate matter becomes spectral roughness.',
    },
    {
      metric: 'air.pm25',
      target: 'filterCutoff',
      inputMin: 0,
      inputMax: 100,
      outputMin: 0.9,
      outputMax: 0.15,
      curve: 'log',
      polarity: 1,
      weight: 0.8,
      rationale: 'High particulate load closes the filter.',
    },
    {
      metric: 'air.no2',
      target: 'roughness',
      inputMin: 0,
      inputMax: 200,
      outputMin: 0.05,
      outputMax: 0.9,
      curve: 'log',
      polarity: 1,
      weight: 0.8,
      rationale: 'NO₂ adds an acidic edge to the harmonic field.',
    },
    {
      metric: 'air.pollutionIndex',
      target: 'brightness',
      inputMin: 0,
      inputMax: 1,
      outputMin: 0.8,
      outputMax: 0.15,
      curve: 'linear',
      polarity: 1,
      weight: 0.7,
      rationale: 'Air pollution veils the high partials.',
    },
    {
      metric: 'noise.laeq',
      target: 'pulse',
      inputMin: 30,
      inputMax: 90,
      outputMin: 0,
      outputMax: 1,
      curve: 'linear',
      polarity: 1,
      weight: 0.5,
      rationale: 'Higher ambient noise increases the pulse/articulation rate.',
    },
    {
      metric: 'weather.temperature',
      target: 'tempo',
      inputMin: -10,
      inputMax: 40,
      outputMin: 42,
      outputMax: 110,
      curve: 'linear',
      polarity: 1,
      weight: 0.6,
      rationale: 'Warm air invites a faster metabolic pulse.',
    },
    {
      metric: 'weather.humidity',
      target: 'reverb',
      inputMin: 0,
      inputMax: 100,
      outputMin: 0.1,
      outputMax: 0.85,
      curve: 'linear',
      polarity: 1,
      weight: 0.5,
      rationale: 'Humidity is mapped to diffusion and tail length.',
    },
    {
      metric: 'light.par',
      target: 'brightness',
      inputMin: 0,
      inputMax: 2000,
      outputMin: 0.2,
      outputMax: 0.95,
      curve: 'log',
      polarity: 1,
      weight: 0.4,
      rationale: 'Photosynthetic light opens the spectrum.',
    },
    {
      metric: 'flow.rate',
      target: 'tempo',
      inputMin: 0,
      inputMax: 10,
      outputMin: 48,
      outputMax: 120,
      curve: 'linear',
      polarity: 1,
      weight: 0.5,
      rationale: 'River flow is the landscape clock.',
    },
  ],
}

export function mapReadingsToMusicalDescriptor(
  readings: readonly EnvironmentalReading[],
  ontology: DataToMusicOntology = MUSICO_CROSS_ONTOLOGY,
): DataToMusicResult {
  const warnings: string[] = []
  const usedReadings: string[] = []
  const accum = new Map<MusicalTarget, { sum: number; weight: number }>()

  for (const reading of readings) {
    if (reading.quality === 'missing') {
      warnings.push(`${reading.metric} (${reading.zoneId}) is missing; no musical contribution`)
      continue
    }
    const mappings = ontology.mappings.filter((mapping) => mapping.metric === reading.metric)
    if (mappings.length === 0) {
      warnings.push(`${reading.metric} is not in ${ontology.id}`)
      continue
    }
    if (!Number.isFinite(reading.value)) {
      warnings.push(`${reading.metric} has a non-finite value`)
      continue
    }
    let contributed = false
    for (const mapping of mappings) {
      const value = mapValue(reading.value, mapping)
      const current = accum.get(mapping.target) ?? { sum: 0, weight: 0 }
      current.sum += value * mapping.weight
      current.weight += mapping.weight
      accum.set(mapping.target, current)
      contributed = true
    }
    if (contributed) usedReadings.push(reading.id)
  }

  const controls: Partial<Record<MusicalTarget, number>> = {}
  for (const [target, value] of accum) {
    controls[target] = value.sum / Math.max(1e-9, value.weight)
  }

  if (usedReadings.length === 0) {
    warnings.push('No usable environmental readings; using the default descriptor')
  }

  const descriptor: MusicalDescriptor = {
    ...DEFAULT_DESCRIPTOR,
    tempoBpm: clamp(controls.tempo ?? DEFAULT_DESCRIPTOR.tempoBpm, 20, 300),
    tonicPc: normalizePitchClass(controls.rootPitchClass ?? DEFAULT_DESCRIPTOR.tonicPc),
    mode: modeFromControl(controls.modeIndex, ontology.modes),
    register: registerFromControl(controls.registerIndex),
    density: clamp01(controls.density ?? DEFAULT_DESCRIPTOR.density),
    brightness: clamp01(controls.brightness ?? DEFAULT_DESCRIPTOR.brightness),
    roughness: clamp01(controls.roughness ?? DEFAULT_DESCRIPTOR.roughness),
  }

  return {
    protocol: ontology.protocol,
    descriptor,
    controls,
    usedReadings,
    warnings,
  }
}

export function sonifyZones(
  readings: readonly EnvironmentalReading[],
  zones: readonly LandscapeZone[],
  ontology: DataToMusicOntology = MUSICO_CROSS_ONTOLOGY,
): ZoneSonification[] {
  return zones.map((zone) => {
    const zoneReadings = readings.filter((reading) => reading.zoneId === zone.id)
    return {
      zoneId: zone.id,
      channelStart: zone.channelStart,
      channelCount: zone.channelCount,
      result: mapReadingsToMusicalDescriptor(zoneReadings, ontology),
    }
  })
}

export function mapValue(value: number, mapping: CrossOntologyMapping): number {
  const span = mapping.inputMax - mapping.inputMin
  if (Math.abs(span) < 1e-12) return mapping.outputMin
  const normalized = clamp01((value - mapping.inputMin) / span)
  let shaped = normalized
  if (mapping.curve === 'log') {
    shaped =
      mapping.inputMin >= 0
        ? Math.log1p(normalized * 9) / Math.log(10)
        : normalized
  } else if (mapping.curve === 'exp') {
    shaped = normalized * normalized
  } else if (mapping.curve === 'inverse') {
    shaped = 1 - normalized
  }
  if (mapping.polarity === -1) shaped = 1 - shaped
  return mapping.outputMin + (mapping.outputMax - mapping.outputMin) * shaped
}

function modeFromControl(index: number | undefined, modes: Mode[]): Mode {
  if (index === undefined) return DEFAULT_DESCRIPTOR.mode
  return modes[((Math.round(index) % modes.length) + modes.length) % modes.length] ?? 'dorian'
}

function registerFromControl(index: number | undefined): Register {
  if (index === undefined) return DEFAULT_DESCRIPTOR.register
  const value = Math.round(index)
  return value <= 0 ? 'low' : value >= 2 ? 'high' : 'mid'
}

export function describeDataToMusic(result: DataToMusicResult): string {
  const controls = Object.entries(result.controls)
    .filter(([, value]) => typeof value === 'number')
    .map(([key, value]) => `${key}=${(value as number).toFixed(2)}`)
    .join(', ')
  return `${result.descriptor.mode} · ${result.descriptor.tempoBpm.toFixed(0)} BPM · ${controls}`
}

export { MODES }
