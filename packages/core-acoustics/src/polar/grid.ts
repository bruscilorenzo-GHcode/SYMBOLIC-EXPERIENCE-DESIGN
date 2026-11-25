import type { PolarGrid } from '../types/speaker'
import { clamp } from '../math/angles'
import { logFrequencyLerp } from '../math/interpolate'

export interface GridSample {
  azimuthDeg: number
  elevationDeg: number
  frequencyHz: number
  valueDb: number
}

export function polarGridIsRegular(grid: PolarGrid, toleranceDeg = 1e-6): boolean {
  return isRegular(grid.azimuthsDeg, toleranceDeg) && isRegular(grid.elevationsDeg, toleranceDeg)
}

function isRegular(values: readonly number[], tolerance: number): boolean {
  if (values.length < 3) return true
  const step = values[1]! - values[0]!
  for (let i = 2; i < values.length; i += 1) {
    if (Math.abs(values[i]! - values[i - 1]! - step) > tolerance) return false
  }
  return true
}

/** Find the bracketing cell on a circular axis. */
function bracketCircular(
  values: readonly number[],
  value: number,
): { i0: number; i1: number; t: number } {
  const first = values[0]!
  const last = values[values.length - 1]!
  const span = 360
  let x = value
  while (x < first) x += span
  while (x >= first + span) x -= span

  if (x >= last) {
    const next = first + span
    return { i0: values.length - 1, i1: 0, t: clamp((x - last) / Math.max(next - last, 1e-9), 0, 1) }
  }
  for (let i = 0; i < values.length - 1; i += 1) {
    const a = values[i]!
    const b = values[i + 1]!
    if (x >= a && x <= b) return { i0: i, i1: i + 1, t: (x - a) / Math.max(b - a, 1e-9) }
  }
  return { i0: values.length - 1, i1: 0, t: 0 }
}

function bracketClamped(
  values: readonly number[],
  value: number,
): { i0: number; i1: number; t: number } {
  if (value <= values[0]!) return { i0: 0, i1: 0, t: 0 }
  if (value >= values[values.length - 1]!) {
    return { i0: values.length - 1, i1: values.length - 1, t: 0 }
  }
  for (let i = 0; i < values.length - 1; i += 1) {
    const a = values[i]!
    const b = values[i + 1]!
    if (value >= a && value <= b) return { i0: i, i1: i + 1, t: (value - a) / Math.max(b - a, 1e-9) }
  }
  return { i0: 0, i1: 0, t: 0 }
}

function bracketFrequency(
  frequencies: readonly number[],
  frequencyHz: number,
): { i0: number; i1: number; t: number } {
  const f = Math.max(frequencyHz, 1)
  if (f <= frequencies[0]!) return { i0: 0, i1: 0, t: 0 }
  if (f >= frequencies[frequencies.length - 1]!) {
    return { i0: frequencies.length - 1, i1: frequencies.length - 1, t: 0 }
  }
  for (let i = 0; i < frequencies.length - 1; i += 1) {
    const a = frequencies[i]!
    const b = frequencies[i + 1]!
    if (f >= a && f <= b) {
      const t = Math.log(f / a) / Math.max(Math.log(b / a), 1e-9)
      return { i0: i, i1: i + 1, t }
    }
  }
  return { i0: 0, i1: 0, t: 0 }
}

/**
 * Bilinear spherical interpolation with linear interpolation across log-frequency.
 * Azimuth wraps; elevation is clamped to the measured cap.
 */
export function samplePolarGridDb(
  grid: PolarGrid,
  azimuthDeg: number,
  elevationDeg: number,
  frequencyHz: number,
): number {
  if (grid.frequenciesHz.length === 0 || grid.azimuthsDeg.length === 0 || grid.elevationsDeg.length === 0) {
    return 0
  }

  const fb = bracketFrequency(grid.frequenciesHz, frequencyHz)
  const ab = bracketCircular(grid.azimuthsDeg, azimuthDeg)
  const eb = bracketClamped(grid.elevationsDeg, elevationDeg)

  const at = (band: number, el: number, az: number): number =>
    grid.valuesDb[band]?.[el]?.[az] ?? 0

  const sampleAtBand = (band: number): number => {
    const q00 = at(band, eb.i0, ab.i0)
    const q10 = at(band, eb.i0, ab.i1)
    const q01 = at(band, eb.i1, ab.i0)
    const q11 = at(band, eb.i1, ab.i1)
    const a = q00 + (q10 - q00) * ab.t
    const b = q01 + (q11 - q01) * ab.t
    return a + (b - a) * eb.t
  }

  const v0 = sampleAtBand(fb.i0)
  const v1 = sampleAtBand(fb.i1)
  if (fb.i0 === fb.i1) return v0
  return logFrequencyLerp(grid.frequenciesHz[fb.i0]!, grid.frequenciesHz[fb.i1]!, v0, v1, frequencyHz)
}

export function samplePolarGridLinear(
  grid: PolarGrid,
  azimuthDeg: number,
  elevationDeg: number,
  frequencyHz: number,
): number {
  return 10 ** (samplePolarGridDb(grid, azimuthDeg, elevationDeg, frequencyHz) / 20)
}

/** On-axis value at 0° azimuth / 0° elevation, used as the normalisation anchor. */
export function onAxisLevelDb(grid: PolarGrid): number {
  return samplePolarGridDb(grid, 0, 0, grid.frequenciesHz[0] ?? 1000)
}

export function normalizePolarGrid(grid: PolarGrid, mode: 'on-axis' | 'max' | 'none'): PolarGrid {
  if (mode === 'none') return grid
  const offsets = grid.frequenciesHz.map((frequency, bandIndex) => {
    if (mode === 'on-axis') return samplePolarGridDb(grid, 0, 0, frequency)
    let max = Number.NEGATIVE_INFINITY
    for (let e = 0; e < grid.elevationsDeg.length; e += 1) {
      for (let a = 0; a < grid.azimuthsDeg.length; a += 1) {
        max = Math.max(max, grid.valuesDb[bandIndex]?.[e]?.[a] ?? Number.NEGATIVE_INFINITY)
      }
    }
    return max
  })

  const valuesDb = grid.valuesDb.map((bands, bandIndex) =>
    bands.map((row) => row.map((value) => value - offsets[bandIndex]!)),
  )
  return { ...grid, valuesDb, normalization: mode === 'max' ? 'max-0db' : 'on-axis-0db' }
}

export function makePolarGrid(
  frequenciesHz: number[],
  azimuthsDeg: number[],
  elevationsDeg: number[],
  fill: (azimuthDeg: number, elevationDeg: number, frequencyHz: number) => number,
  options?: { normalization?: PolarGrid['normalization']; referenceDistanceM?: number },
): PolarGrid {
  const sortedFrequencies = [...frequenciesHz].sort((a, b) => a - b)
  const sortedAzimuths = [...azimuthsDeg].sort((a, b) => a - b)
  const sortedElevations = [...elevationsDeg].sort((a, b) => a - b)
  const valuesDb = sortedFrequencies.map((frequency) =>
    sortedElevations.map((elevation) => sortedAzimuths.map((azimuth) => fill(azimuth, elevation, frequency))),
  )
  return {
    frequenciesHz: sortedFrequencies,
    azimuthsDeg: sortedAzimuths,
    elevationsDeg: sortedElevations,
    valuesDb,
    normalization: options?.normalization ?? 'on-axis-0db',
    referenceDistanceM: options?.referenceDistanceM ?? 1,
  }
}
