import { clamp } from '../math/angles'

export const STI_MODULATION_FREQUENCIES_HZ = [
  0.63, 0.8, 1, 1.25, 1.6, 2, 2.5, 3.15, 4, 5, 6.3, 8, 10, 12.5,
] as const

/** Male speech octave-band weights, IEC 60268-16 style. */
export const STI_BAND_WEIGHTS = [0.129, 0.143, 0.114, 0.114, 0.186, 0.171, 0.143] as const
export const STI_BANDS_HZ = [125, 250, 500, 1000, 2000, 4000, 8000] as const

export interface StiInput {
  /** Reverberation time per STI band; a scalar is applied to all bands. */
  t60S: number | number[]
  /** Broadband or per-band signal-to-noise ratio in dB. */
  snrDb: number | number[]
}

export interface StiResult {
  sti: number
  bandTransmissionIndex: number[]
  bandMtf: number[]
  method: 'engineering-estimate'
}

/**
 * Engineering estimate of the Speech Transmission Index from T60 and SNR.
 *
 * The modulation transfer function is the product of the reverberant MTF
 * (Schroeder) and the noise MTF. TI = (SNR_eff + 15) / 30, then band-weighted.
 * This is deterministic and useful for design iterations; it is not a
 * substitute for a certified IEC 60268-16 measurement.
 */
export function estimateSti(input: StiInput): StiResult {
  const bandCount = STI_BANDS_HZ.length
  const t60 = expandToBands(input.t60S, bandCount)
  const snr = expandToBands(input.snrDb, bandCount)

  const bandMtf: number[] = []
  const bandTransmissionIndex: number[] = []

  for (let band = 0; band < bandCount; band += 1) {
    const rt = Math.max(0, t60[band] ?? 0)
    const snrDb = snr[band] ?? 0
    let bandSum = 0
    let mtfSum = 0

    for (const modulationHz of STI_MODULATION_FREQUENCIES_HZ) {
      const mtfReverb =
        rt <= 0
          ? 1
          : 1 / Math.sqrt(1 + ((2 * Math.PI * modulationHz * rt) / 13.8) ** 2)
      const mtfNoise = 1 / (1 + 10 ** (-snrDb / 10))
      const mtf = clamp(mtfReverb * mtfNoise, 1e-6, 1 - 1e-6)
      const effectiveSnr = 10 * Math.log10(mtf / (1 - mtf))
      bandSum += clamp((effectiveSnr + 15) / 30, 0, 1)
      mtfSum += mtf
    }

    const ti = bandSum / STI_MODULATION_FREQUENCIES_HZ.length
    bandTransmissionIndex.push(ti)
    bandMtf.push(mtfSum / STI_MODULATION_FREQUENCIES_HZ.length)
  }

  let sti = 0
  for (let band = 0; band < bandCount; band += 1) {
    sti += (bandTransmissionIndex[band] ?? 0) * STI_BAND_WEIGHTS[band]!
  }

  return {
    sti: clamp(sti, 0, 1),
    bandTransmissionIndex,
    bandMtf,
    method: 'engineering-estimate',
  }
}

/**
 * Clarity C50 from early (0–50 ms) and late (50 ms–∞) energy.
 * C50 = 10 log10(E_early / E_late).
 */
export function clarityC50Db(earlyEnergy: number, lateEnergy: number): number {
  return 10 * Math.log10(Math.max(earlyEnergy, 1e-24) / Math.max(lateEnergy, 1e-24))
}

export interface CoverageStats {
  minDb: number
  maxDb: number
  meanDb: number
  standardDeviationDb: number
  /** Percentage of samples within ±tolerance of the mean. */
  withinTolerancePct: number
  toleranceDb: number
  sampleCount: number
}

export function coverageStats(valuesDb: readonly number[], toleranceDb = 3): CoverageStats {
  const finite = valuesDb.filter((value) => Number.isFinite(value))
  if (finite.length === 0) {
    return {
      minDb: Number.NEGATIVE_INFINITY,
      maxDb: Number.NEGATIVE_INFINITY,
      meanDb: Number.NEGATIVE_INFINITY,
      standardDeviationDb: 0,
      withinTolerancePct: 0,
      toleranceDb,
      sampleCount: 0,
    }
  }

  const minDb = Math.min(...finite)
  const maxDb = Math.max(...finite)
  const meanDb = finite.reduce((sum, value) => sum + value, 0) / finite.length
  const variance =
    finite.reduce((sum, value) => sum + (value - meanDb) ** 2, 0) / Math.max(finite.length, 1)
  const within = finite.filter((value) => Math.abs(value - meanDb) <= toleranceDb).length

  return {
    minDb,
    maxDb,
    meanDb,
    standardDeviationDb: Math.sqrt(variance),
    withinTolerancePct: (within / finite.length) * 100,
    toleranceDb,
    sampleCount: finite.length,
  }
}

export interface PhaseSource {
  distanceM: number
  levelDb: number
  polarity?: 0 | 1
  delayMs?: number
}

/**
 * Coherence of a set of arrivals at one receiver:
 * |Σ a_i e^{−j(kd_i + φ_i)}| / Σ a_i, where 1 means perfect phase alignment.
 */
export function phaseCoherence(
  sources: readonly PhaseSource[],
  frequencyHz: number,
  speedOfSound = 343,
): number {
  if (sources.length === 0) return 0
  const k = (2 * Math.PI * frequencyHz) / speedOfSound
  let real = 0
  let imag = 0
  let amplitudeSum = 0
  for (const source of sources) {
    const amplitude = 10 ** (source.levelDb / 20)
    const delayRad = ((source.delayMs ?? 0) / 1000) * 2 * Math.PI * frequencyHz
    const polarityPhase = (source.polarity ?? 0) * Math.PI
    const phase = -k * source.distanceM - delayRad + polarityPhase
    real += amplitude * Math.cos(phase)
    imag += amplitude * Math.sin(phase)
    amplitudeSum += amplitude
  }
  return amplitudeSum <= 0 ? 0 : Math.hypot(real, imag) / amplitudeSum
}

/** A-weighting in dB at a given frequency. */
export function aWeightingDb(frequencyHz: number): number {
  const f2 = frequencyHz * frequencyHz
  const numerator = 12194 ** 2 * f2 * f2
  const denominator =
    (f2 + 20.6 ** 2) *
    Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) *
    (f2 + 12194 ** 2)
  if (denominator <= 0) return -100
  return 20 * Math.log10(numerator / denominator) + 2.0
}

/** Equivalent continuous level from a series of short-term levels. */
export function leqDb(levelsDb: readonly number[], durationsS?: readonly number[]): number {
  if (levelsDb.length === 0) return Number.NEGATIVE_INFINITY
  let energy = 0
  let duration = 0
  for (let i = 0; i < levelsDb.length; i += 1) {
    const dt = durationsS?.[i] ?? 1
    energy += 10 ** ((levelsDb[i] ?? 0) / 10) * dt
    duration += dt
  }
  return duration <= 0 ? Number.NEGATIVE_INFINITY : 10 * Math.log10(energy / duration)
}

function expandToBands(value: number | number[], count: number): number[] {
  if (Array.isArray(value)) {
    return Array.from({ length: count }, (_, index) => value[index] ?? value[value.length - 1] ?? 0)
  }
  return new Array<number>(count).fill(value)
}
