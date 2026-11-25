import type { PolarGrid } from '../types/speaker'
import { clamp } from '../math/angles'
import { samplePolarGridDb } from './grid'

export interface PolarAtlasOptions {
  width?: number
  height?: number
  minDb?: number
  maxDb?: number
  /** 'float' is recommended for WebGL2; 'uint8-rgba' packs four bands per texel. */
  format?: 'float' | 'uint8-rgba'
}

export interface PolarAtlas {
  width: number
  height: number
  bandCount: number
  /** Float layout: width × height × bandCount, normalised 0..1. */
  floatData?: Float32Array
  /** RGBA layout: width × height × ceil(bandCount/4) × 4, 0..255. */
  rgbaData?: Uint8Array
  minDb: number
  maxDb: number
  format: 'float' | 'uint8-rgba'
  /** Top row is +90° elevation, left column is −180° azimuth. */
  layout: 'equirectangular-atlas'
}

/**
 * Bakes a polar grid into an equirectangular atlas that a WebGL shader can
 * sample with `POLAR_TEXTURE_GLSL`. The float atlas stores band b at
 * `v = (row + b * height) / (height * bandCount)`.
 */
export function bakePolarAtlas(grid: PolarGrid, options: PolarAtlasOptions = {}): PolarAtlas {
  const width = Math.max(2, Math.round(options.width ?? 128))
  const height = Math.max(2, Math.round(options.height ?? 64))
  const bandCount = Math.max(1, grid.frequenciesHz.length)
  const format = options.format ?? 'float'

  let observedMin = Number.POSITIVE_INFINITY
  let observedMax = Number.NEGATIVE_INFINITY
  for (const band of grid.valuesDb) {
    for (const row of band) {
      for (const value of row) {
        if (Number.isFinite(value)) {
          observedMin = Math.min(observedMin, value)
          observedMax = Math.max(observedMax, value)
        }
      }
    }
  }
  const minDb = options.minDb ?? (Number.isFinite(observedMin) ? observedMin : -60)
  const maxDb = options.maxDb ?? (Number.isFinite(observedMax) ? Math.max(observedMax, minDb + 1) : 0)
  const span = Math.max(maxDb - minDb, 1e-6)

  if (format === 'float') {
    const floatData = new Float32Array(width * height * bandCount)
    for (let band = 0; band < bandCount; band += 1) {
      const frequency = grid.frequenciesHz[band] ?? 1000
      for (let row = 0; row < height; row += 1) {
        const elevation = 90 - ((row + 0.5) / height) * 180
        for (let col = 0; col < width; col += 1) {
          const azimuth = -180 + ((col + 0.5) / width) * 360
          const dB = samplePolarGridDb(grid, azimuth, elevation, frequency)
          const index = (band * height + row) * width + col
          floatData[index] = clamp((dB - minDb) / span, 0, 1)
        }
      }
    }
    return {
      width,
      height,
      bandCount,
      floatData,
      minDb,
      maxDb,
      format,
      layout: 'equirectangular-atlas',
    }
  }

  const groups = Math.ceil(bandCount / 4)
  const rgbaData = new Uint8Array(width * height * groups * 4)
  for (let band = 0; band < bandCount; band += 1) {
    const group = Math.floor(band / 4)
    const channel = band % 4
    const frequency = grid.frequenciesHz[band] ?? 1000
    for (let row = 0; row < height; row += 1) {
      const elevation = 90 - ((row + 0.5) / height) * 180
      for (let col = 0; col < width; col += 1) {
        const azimuth = -180 + ((col + 0.5) / width) * 360
        const dB = samplePolarGridDb(grid, azimuth, elevation, frequency)
        const value = Math.round(clamp((dB - minDb) / span, 0, 1) * 255)
        const index = ((group * height + row) * width + col) * 4 + channel
        rgbaData[index] = value
      }
    }
  }

  return {
    width,
    height,
    bandCount,
    rgbaData,
    minDb,
    maxDb,
    format,
    layout: 'equirectangular-atlas',
  }
}

/** Interleaved RGB preview for a CPU-side balloon or a UI thumbnail. */
export function polarAtlasPreview(
  grid: PolarGrid,
  bandIndex = 0,
  width = 128,
  height = 64,
): Uint8ClampedArray {
  const frequency = grid.frequenciesHz[bandIndex] ?? 1000
  const data = new Uint8ClampedArray(width * height * 4)
  for (let row = 0; row < height; row += 1) {
    const elevation = 90 - ((row + 0.5) / height) * 180
    for (let col = 0; col < width; col += 1) {
      const azimuth = -180 + ((col + 0.5) / width) * 360
      const dB = samplePolarGridDb(grid, azimuth, elevation, frequency)
      const t = clamp((dB + 40) / 40, 0, 1)
      const index = (row * width + col) * 4
      data[index] = Math.round(255 * (1 - t))
      data[index + 1] = Math.round(255 * Math.sin(Math.PI * t))
      data[index + 2] = Math.round(255 * t)
      data[index + 3] = 255
    }
  }
  return data
}
