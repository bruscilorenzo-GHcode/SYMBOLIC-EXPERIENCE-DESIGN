import type { MusicFeatures } from './types'
import { clamp, clamp01 } from './types'

export interface AnalysisOptions {
  maxDurationS?: number
  frameSize?: number
  hopSize?: number
}

const SILENT: MusicFeatures = {
  tempoBpm: 80,
  tonicPc: 0,
  mode: 'minor',
  density: 0,
  brightness: 0,
  roughness: 0,
  dynamicRangeDb: 0,
  spectralCentroidHz: 0,
  lowEnergyRatio: 0,
  highEnergyRatio: 0,
  onsetDensityPerSec: 0,
  durationS: 0,
  confidence: { tempo: 0, key: 0, spectral: 0 },
  source: 'analysis',
  warnings: ['No audio energy detected'],
}

/**
 * Deterministic, dependency-free feature extraction for the design bridge.
 * It is intentionally conservative: tempo/key are estimates with confidence,
 * not musicological facts. The UI must show the confidence and allow manual
 * correction before generating architecture.
 */
export function analyzeSamples(
  samples: Float32Array,
  sampleRate: number,
  options: AnalysisOptions = {},
): MusicFeatures {
  if (samples.length === 0 || !Number.isFinite(sampleRate) || sampleRate <= 0) return { ...SILENT }

  const maxSamples = Math.min(samples.length, Math.floor(sampleRate * (options.maxDurationS ?? 30)))
  const frameSize = options.frameSize ?? 2048
  const hopSize = options.hopSize ?? 1024
  if (maxSamples < frameSize / 2) {
    return { ...SILENT, durationS: maxSamples / sampleRate, warnings: ['Audio is shorter than one analysis frame'] }
  }

  const window = hannWindow(frameSize)
  const frameCount = Math.max(1, Math.floor((maxSamples - frameSize) / hopSize) + 1)
  const frameRms: number[] = []
  const onset: number[] = []
  const chroma = new Float64Array(12)

  let totalEnergy = 0
  let totalLowEnergy = 0
  let totalHighEnergy = 0
  let centroidWeighted = 0
  let magnitudeSum = 0
  let flatnessSum = 0
  let flatnessCount = 0
  const re = new Float64Array(frameSize)
  const im = new Float64Array(frameSize)
  const magnitudes = new Float64Array(frameSize / 2)

  let previousRms = 0
  for (let frame = 0; frame < frameCount; frame += 1) {
    const offset = frame * hopSize
    let energy = 0
    for (let i = 0; i < frameSize; i += 1) {
      const value = samples[offset + i] ?? 0
      energy += value * value
      re[i] = value * window[i]!
      im[i] = 0
    }
    const rms = Math.sqrt(energy / frameSize)
    frameRms.push(rms)
    onset.push(Math.max(0, rms - previousRms))
    previousRms = rms

    fft(re, im)
    let frameMagnitude = 0
    let frameCentroid = 0
    let frameLow = 0
    let frameHigh = 0
    let logSum = 0
    let magnitudeCount = 0

    for (let bin = 1; bin < frameSize / 2; bin += 1) {
      const frequency = (bin * sampleRate) / frameSize
      const magnitude = Math.hypot(re[bin]!, im[bin]!) / frameSize
      magnitudes[bin] = magnitude
      frameMagnitude += magnitude
      frameCentroid += frequency * magnitude
      if (frequency < 250) frameLow += magnitude * magnitude
      if (frequency > 2000) frameHigh += magnitude * magnitude
      if (frequency >= 50 && frequency <= 5000) {
        const midi = 69 + 12 * Math.log2(frequency / 440)
        const pitchClass = ((Math.round(midi) % 12) + 12) % 12
        chroma[pitchClass]! += magnitude
      }
      logSum += Math.log(magnitude + 1e-9)
      magnitudeCount += 1
    }

    totalEnergy += frameMagnitude * frameMagnitude
    totalLowEnergy += frameLow
    totalHighEnergy += frameHigh
    centroidWeighted += frameCentroid
    magnitudeSum += frameMagnitude

    if (frameMagnitude > 1e-9 && magnitudeCount > 0) {
      const arithmeticMean = frameMagnitude / magnitudeCount
      const geometricMean = Math.exp(logSum / magnitudeCount)
      flatnessSum += clamp01(geometricMean / Math.max(arithmeticMean, 1e-9))
      flatnessCount += 1
    }
  }

  const durationS = maxSamples / sampleRate
  const totalRms = Math.sqrt(
    (() => {
      let sum = 0
      for (let i = 0; i < maxSamples; i += 1) sum += (samples[i] ?? 0) ** 2
      return sum / maxSamples
    })(),
  )

  if (totalEnergy <= 1e-12 || totalRms <= 1e-7) {
    return { ...SILENT, durationS, warnings: ['Signal is effectively silent'] }
  }

  const spectralCentroidHz = magnitudeSum > 0 ? centroidWeighted / magnitudeSum : 0
  const lowEnergyRatio = clamp01(totalLowEnergy / Math.max(totalEnergy, 1e-12))
  const highEnergyRatio = clamp01(totalHighEnergy / Math.max(totalEnergy, 1e-12))
  const flatness = flatnessCount > 0 ? flatnessSum / flatnessCount : 0
  const dynamicRangeDb = dynamicRange(frameRms)
  const tempo = estimateTempo(onset, sampleRate / hopSize)
  const key = estimateKey(chroma)
  const onsetDensity = detectOnsetDensity(onset, durationS)
  const density = clamp01(onsetDensity / 6 * 0.55 + highEnergyRatio * 0.25 + (1 - dynamicRangeDb / 40) * 0.2)
  const brightness = clamp01(spectralCentroidHz / 5000 * 0.7 + highEnergyRatio * 0.3)
  const roughness = clamp01(flatness * 1.25)
  const warnings: string[] = []
  if (tempo.confidence < 0.2) warnings.push('Tempo confidence is low; verify or set it manually')
  if (key.confidence < 0.15) warnings.push('Key confidence is low; verify or set it manually')
  if (durationS < 2) warnings.push('Short analysis window; use at least 5–10 seconds for stability')
  if (totalRms < 0.01) warnings.push('Low input level; raise the source or normalize before analysis')

  return {
    tempoBpm: tempo.bpm,
    tonicPc: key.tonicPc,
    mode: key.mode,
    density,
    brightness,
    roughness,
    dynamicRangeDb,
    spectralCentroidHz,
    lowEnergyRatio,
    highEnergyRatio,
    onsetDensityPerSec: onsetDensity,
    durationS,
    confidence: {
      tempo: tempo.confidence,
      key: key.confidence,
      spectral: clamp01(1 - flatness * 0.5),
    },
    source: 'analysis',
    warnings,
  }
}

export function manualMusicFeatures(partial: Partial<MusicFeatures> = {}): MusicFeatures {
  return {
    tempoBpm: 72,
    tonicPc: 0,
    mode: 'minor',
    density: 0.45,
    brightness: 0.5,
    roughness: 0.3,
    dynamicRangeDb: 18,
    spectralCentroidHz: 1800,
    lowEnergyRatio: 0.45,
    highEnergyRatio: 0.3,
    onsetDensityPerSec: 2.5,
    durationS: 0,
    confidence: { tempo: 1, key: 1, spectral: 1 },
    source: 'manual',
    warnings: [],
    ...partial,
  }
}

function estimateTempo(onset: readonly number[], frameRate: number): { bpm: number; confidence: number } {
  if (onset.length < 8 || frameRate <= 0) return { bpm: 80, confidence: 0 }
  const mean = onset.reduce((sum, value) => sum + value, 0) / onset.length
  const variance = onset.reduce((sum, value) => sum + (value - mean) ** 2, 0) / onset.length
  const std = Math.sqrt(variance)
  if (std < 1e-6) return { bpm: 80, confidence: 0 }

  const minLag = Math.max(2, Math.round(frameRate * 0.3))
  const maxLag = Math.min(onset.length - 2, Math.round(frameRate * 1.2))
  let bestLag = 0
  let bestCorrelation = Number.NEGATIVE_INFINITY
  let totalCorrelation = 0
  let count = 0
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0
    for (let i = 0; i + lag < onset.length; i += 1) correlation += onset[i]! * onset[i + lag]!
    correlation /= onset.length - lag
    totalCorrelation += correlation
    count += 1
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }
  if (bestLag === 0) return { bpm: 80, confidence: 0 }
  const average = count > 0 ? totalCorrelation / count : 0
  const confidence = clamp01((bestCorrelation - average) / Math.max(bestCorrelation, 1e-9))
  let bpm = (60 * frameRate) / bestLag
  while (bpm < 70) bpm *= 2
  while (bpm > 180) bpm /= 2
  return { bpm: Math.round(bpm * 10) / 10, confidence: Math.round(confidence * 1000) / 1000 }
}

function estimateKey(chroma: Float64Array): {
  tonicPc: number
  mode: 'major' | 'minor'
  confidence: number
} {
  const major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
  const minor = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
  const total = chroma.reduce((sum, value) => sum + value, 0)
  if (total <= 1e-9) return { tonicPc: 0, mode: 'minor', confidence: 0 }

  let best: { tonicPc: number; mode: 'major' | 'minor'; score: number } = {
    tonicPc: 0,
    mode: 'major',
    score: Number.NEGATIVE_INFINITY,
  }
  let second = Number.NEGATIVE_INFINITY
  for (let tonic = 0; tonic < 12; tonic += 1) {
    const majorScore = major.reduce(
      (sum, weight, index) => sum + weight * (chroma[(tonic + index) % 12]! / total),
      0,
    )
    const minorScore = minor.reduce(
      (sum, weight, index) => sum + weight * (chroma[(tonic + index) % 12]! / total),
      0,
    )
    for (const [mode, score] of [['major', majorScore], ['minor', minorScore]] as const) {
      if (score > best.score) {
        second = best.score
        best = { tonicPc: tonic, mode, score }
      } else if (score > second) {
        second = score
      }
    }
  }
  const confidence = clamp01((best.score - Math.max(second, 0)) / Math.max(best.score, 1e-9))
  return { tonicPc: best.tonicPc, mode: best.mode, confidence: Math.round(confidence * 1000) / 1000 }
}

function detectOnsetDensity(onset: readonly number[], durationS: number): number {
  if (onset.length === 0 || durationS <= 0) return 0
  const mean = onset.reduce((sum, value) => sum + value, 0) / onset.length
  const variance = onset.reduce((sum, value) => sum + (value - mean) ** 2, 0) / onset.length
  const threshold = mean + Math.sqrt(variance) * 0.8
  let peaks = 0
  for (let i = 1; i < onset.length - 1; i += 1) {
    if (onset[i]! > threshold && onset[i]! >= onset[i - 1]! && onset[i]! >= onset[i + 1]!) peaks += 1
  }
  return Math.round((peaks / durationS) * 100) / 100
}

function dynamicRange(frameRms: readonly number[]): number {
  if (frameRms.length === 0) return 0
  const sorted = [...frameRms].sort((a, b) => a - b)
  const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
  return clamp(20 * Math.log10(Math.max(p95, 1e-9) / Math.max(p10, 1e-9)), 0, 60)
}

function hannWindow(size: number): Float64Array {
  const window = new Float64Array(size)
  for (let i = 0; i < size; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1))
  return window
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  let j = 0
  for (let i = 1; i < n; i += 1) {
    let bit = n >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit
    if (i < j) {
      const tr = re[i]!
      re[i] = re[j]!
      re[j] = tr
      const ti = im[i]!
      im[i] = im[j]!
      im[j] = ti
    }
  }

  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length
    const weightRe = Math.cos(angle)
    const weightIm = Math.sin(angle)
    for (let start = 0; start < n; start += length) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < length / 2; k += 1) {
        const evenIndex = start + k
        const oddIndex = evenIndex + length / 2
        const oddRe = re[oddIndex]! * curRe - im[oddIndex]! * curIm
        const oddIm = re[oddIndex]! * curIm + im[oddIndex]! * curRe
        re[oddIndex] = re[evenIndex]! - oddRe
        im[oddIndex] = im[evenIndex]! - oddIm
        re[evenIndex] = re[evenIndex]! + oddRe
        im[evenIndex] = im[evenIndex]! + oddIm
        const nextRe = curRe * weightRe - curIm * weightIm
        curIm = curRe * weightIm + curIm * weightRe
        curRe = nextRe
      }
    }
  }
}
