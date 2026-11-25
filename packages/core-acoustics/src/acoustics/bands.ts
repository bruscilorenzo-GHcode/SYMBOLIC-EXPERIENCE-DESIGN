import type { BandSeries } from '../types/common'
import { logFrequencyLerp } from '../math/interpolate'

export const OCTAVE_BANDS_HZ = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const
export const THIRD_OCTAVE_BANDS_HZ = [
  50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150,
  4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
] as const

/** Interpolate a band series at an arbitrary frequency (log-frequency). */
export function bandValueAt(series: BandSeries, frequencyHz: number): number {
  const frequencies = series.frequenciesHz
  const values = series.values
  if (frequencies.length === 0) return 0
  if (frequencies.length === 1) return values[0] ?? 0
  if (frequencyHz <= frequencies[0]!) return values[0] ?? 0
  if (frequencyHz >= frequencies[frequencies.length - 1]!) return values[values.length - 1] ?? 0

  for (let i = 0; i < frequencies.length - 1; i += 1) {
    const f0 = frequencies[i]!
    const f1 = frequencies[i + 1]!
    if (frequencyHz >= f0 && frequencyHz <= f1) {
      return logFrequencyLerp(f0, f1, values[i] ?? 0, values[i + 1] ?? 0, frequencyHz)
    }
  }
  return values[values.length - 1] ?? 0
}

export function bandValueAtOrNull(series: BandSeries | undefined, frequencyHz: number): number | null {
  if (!series) return null
  return bandValueAt(series, frequencyHz)
}

export function bandSeriesFromOctaves(values: readonly number[]): BandSeries {
  return { frequenciesHz: [...OCTAVE_BANDS_HZ], values: [...values], unit: 'octave' }
}

export function bandSeriesMean(series: BandSeries): number {
  if (series.values.length === 0) return 0
  return series.values.reduce((sum, value) => sum + value, 0) / series.values.length
}
