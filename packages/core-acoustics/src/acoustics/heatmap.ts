import type { ListenerPlane } from '../types/environment'
import type { Vec2 } from '../types/common'
import type { AirConditions } from './air'
import type { SplSource } from './spl'
import { coverageStats, type CoverageStats } from './metrics'
import { splAtReceiver } from './spl'

export interface HeatmapRequest {
  plane: ListenerPlane
  sources: readonly SplSource[]
  frequencyHz: number
  conditions?: AirConditions
  /** If true, phase is included; leave false for architectural coverage maps. */
  coherent?: boolean
}

export interface HeatmapResult {
  width: number
  height: number
  /** Cell size in metres, identical on both axes. */
  cellSizeM: number
  originM: [number, number]
  /** Row-major, `height * width`. NaN marks points outside the listener footprint. */
  valuesDb: Float32Array
  mask: Uint8Array
  stats: CoverageStats
  frequencyHz: number
}

export function sampleListenerPlane(request: HeatmapRequest): HeatmapResult {
  const { plane } = request
  if (plane.footprint.length < 3) throw new Error('Listener plane footprint needs at least three points')
  const resolution = Math.max(plane.resolutionM, 0.05)

  const xs = plane.footprint.map((point) => point[0])
  const zs = plane.footprint.map((point) => point[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  const width = Math.max(1, Math.ceil((maxX - minX) / resolution) + 1)
  const height = Math.max(1, Math.ceil((maxZ - minZ) / resolution) + 1)

  const valuesDb = new Float32Array(width * height)
  const mask = new Uint8Array(width * height)
  valuesDb.fill(Number.NaN)

  const inside: number[] = []
  for (let row = 0; row < height; row += 1) {
    const z = minZ + row * resolution
    for (let col = 0; col < width; col += 1) {
      const x = minX + col * resolution
      if (!pointInPolygon(x, z, plane.footprint)) continue
      const index = row * width + col
      const result = splAtReceiver({
        receiverM: [x, plane.heightM, z],
        frequencyHz: request.frequencyHz,
        sources: request.sources,
        conditions: request.conditions,
        coherent: request.coherent,
      })
      if (Number.isFinite(result.splDb)) {
        valuesDb[index] = result.splDb
        mask[index] = 1
        inside.push(result.splDb)
      }
    }
  }

  return {
    width,
    height,
    cellSizeM: resolution,
    originM: [minX, minZ],
    valuesDb,
    mask,
    stats: coverageStats(inside, plane.targets?.uniformityDb ?? 3),
    frequencyHz: request.frequencyHz,
  }
}

export function heatmapToPngData(
  result: HeatmapResult,
  minDb = result.stats.minDb,
  maxDb = result.stats.maxDb,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(result.width * result.height * 4)
  const span = Math.max(maxDb - minDb, 1e-6)
  for (let i = 0; i < result.valuesDb.length; i += 1) {
    const dB = result.valuesDb[i]!
    const offset = i * 4
    if (!result.mask[i] || !Number.isFinite(dB)) {
      data[offset + 3] = 0
      continue
    }
    const t = Math.min(1, Math.max(0, (dB - minDb) / span))
    const [r, g, b] = turboRamp(t)
    data[offset] = r
    data[offset + 1] = g
    data[offset + 2] = b
    data[offset + 3] = 255
  }
  return data
}

export function pointInPolygon(x: number, z: number, polygon: readonly Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i]![0]
    const zi = polygon[i]![1]
    const xj = polygon[j]![0]
    const zj = polygon[j]![1]
    const intersects = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi || 1e-12) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Blue → cyan → green → yellow → red ramp for UI previews. */
function turboRamp(t: number): [number, number, number] {
  const stops: [number, number, number, number][] = [
    [0.0, 20, 40, 120],
    [0.25, 0, 170, 210],
    [0.5, 0, 200, 110],
    [0.75, 245, 210, 40],
    [1.0, 230, 50, 40],
  ]
  const clamped = Math.min(1, Math.max(0, t))
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i]!
    const b = stops[i + 1]!
    if (clamped >= a[0] && clamped <= b[0]) {
      const local = (clamped - a[0]) / Math.max(b[0] - a[0], 1e-9)
      return [
        Math.round(a[1] + (b[1] - a[1]) * local),
        Math.round(a[2] + (b[2] - a[2]) * local),
        Math.round(a[3] + (b[3] - a[3]) * local),
      ]
    }
  }
  return [230, 50, 40]
}
