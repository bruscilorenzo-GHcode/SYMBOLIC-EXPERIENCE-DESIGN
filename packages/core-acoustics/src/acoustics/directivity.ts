import type { PolarDataSet, PolarGrid, ParametricDirectivity } from '../types/speaker'
import { clamp, toRadians } from '../math/angles'
import { makePolarGrid, samplePolarGridDb } from '../polar/grid'
import { evaluateSphericalHarmonics } from '../polar/spherical-harmonics'
import { lineArrayArrayFactorDb, verticalWindowDb } from './line-array'

export interface DirectivityProvider {
  readonly data: PolarDataSet
  sampleDb(azimuthDeg: number, elevationDeg: number, frequencyHz: number): number
  sampleLinear(azimuthDeg: number, elevationDeg: number, frequencyHz: number): number
}

export function createDirectivityProvider(data: PolarDataSet): DirectivityProvider {
  return {
    data,
    sampleDb: (azimuthDeg, elevationDeg, frequencyHz) =>
      sampleDirectivityDb(data, azimuthDeg, elevationDeg, frequencyHz),
    sampleLinear: (azimuthDeg, elevationDeg, frequencyHz) =>
      10 ** (sampleDirectivityDb(data, azimuthDeg, elevationDeg, frequencyHz) / 20),
  }
}

/** Directivity in dB, relative to the on-axis response (0 dB on axis). */
export function sampleDirectivityDb(
  data: PolarDataSet,
  azimuthDeg: number,
  elevationDeg: number,
  frequencyHz: number,
): number {
  if (data.kind === 'grid' && data.grid) {
    const raw = samplePolarGridDb(data.grid, azimuthDeg, elevationDeg, frequencyHz)
    if (data.normalization !== 'absolute') return raw
    return raw - samplePolarGridDb(data.grid, 0, 0, frequencyHz)
  }

  if (data.kind === 'sh' && data.sh) {
    const raw = evaluateSphericalHarmonics(data.sh, azimuthDeg, elevationDeg, frequencyHz)
    if (data.normalization !== 'absolute') return raw
    return raw - evaluateSphericalHarmonics(data.sh, 0, 0, frequencyHz)
  }

  if (data.kind === 'parametric' && data.parametric) {
    return parametricDirectivityDb(data.parametric, azimuthDeg, elevationDeg, frequencyHz)
  }

  return 0
}

/**
 * Bakes a parametric/SH directivity model into a regular grid so it can be
 * parsed, fitted, previewed, and uploaded to the GPU with the same pipeline as
 * a manufacturer measurement.
 */
export function polarGridFromDirectivity(
  data: PolarDataSet,
  options: {
    frequenciesHz?: number[]
    azimuthStepDeg?: number
    elevationStepDeg?: number
  } = {},
): PolarGrid {
  const frequencies = options.frequenciesHz ?? [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
  const azStep = options.azimuthStepDeg ?? 5
  const elStep = options.elevationStepDeg ?? 5
  const azimuths = Array.from({ length: Math.round(360 / azStep) }, (_, i) => -180 + i * azStep)
  const elevations = Array.from({ length: Math.round(180 / elStep) + 1 }, (_, i) => -90 + i * elStep)
  return makePolarGrid(
    frequencies,
    azimuths,
    elevations,
    (azimuth, elevation, frequency) => sampleDirectivityDb(data, azimuth, elevation, frequency),
    {
      normalization: 'on-axis-0db',
      referenceDistanceM: data.referenceDistanceM,
    },
  )
}

export function parametricDirectivityDb(
  model: ParametricDirectivity,
  azimuthDeg: number,
  elevationDeg: number,
  frequencyHz: number,
): number {
  if (model.model === 'omnidirectional') return 0

  const horizontal = Math.cos(toRadians(azimuthDeg)) * Math.cos(toRadians(elevationDeg))

  if (model.model === 'cardioid' || model.model === 'supercardioid') {
    const base = model.model === 'cardioid' ? 0.5 + 0.5 * horizontal : 0.37 + 0.63 * horizontal
    const floor = 10 ** (-(model.rearAttenuationDb ?? 60) / 20)
    return 20 * Math.log10(Math.max(base, floor, 1e-6))
  }

  if (model.model === 'line-array') {
    const steer = model.steerDeg ?? 0
    const vertical = lineArrayArrayFactorDb(
      model.elementCount,
      model.elementSpacingM,
      steer,
      elevationDeg,
      frequencyHz,
    )
    const window = verticalWindowDb(elevationDeg - steer, model.verticalWindowDeg ?? 60)
    return clamp(vertical + window, -80, 0)
  }

  if (model.model === 'lens') {
    const h = Math.max(1, model.horizontalBeamwidthDeg)
    const v = Math.max(1, model.verticalBeamwidthDeg)
    const azTerm = (2 * azimuthDeg) / h
    const elTerm = (2 * elevationDeg) / v
    const directional = -3 * (azTerm * azTerm + elTerm * elTerm)
    const rearFloor = Math.abs(azimuthDeg) > 90 ? -(model.rearAttenuationDb ?? 18) : 0
    return clamp(directional + rearFloor, -60, 0)
  }

  return 0
}
