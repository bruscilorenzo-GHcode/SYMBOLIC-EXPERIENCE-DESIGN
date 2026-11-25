import type { AcousticSpeakerProfile } from '../types/speaker'
import type { Vec3 } from '../types/common'
import type { AirConditions } from './air'
import { STANDARD_AIR, airAbsorptionDbPerM } from './air'
import { bandValueAt } from './bands'
import { sampleDirectivityDb } from './directivity'
import {
  SPEED_OF_SOUND_M_S,
  lineSourceAttenuationDb,
  pointSourceAttenuationDb,
} from './line-array'
import { directionToAzEl } from '../math/angles'
import { distance, normalize, subtract, worldToLocalDirection, rotationMatrixYXZ } from '../math/vec3'
import { dbToAmplitude, sumSplIncoherentDb } from '../math/interpolate'

export interface SplSource {
  id?: string
  positionM: Vec3
  orientationDeg?: Vec3
  profile?: AcousticSpeakerProfile
  /** Overrides `profile.acoustics.directivity` when both are present. */
  directivity?: AcousticSpeakerProfile['acoustics']['directivity']
  gainDb?: number
  delayMs?: number
  polarity?: 0 | 1
  /** Electrical input power. The sensitivity reference is 1 W unless overridden. */
  inputPowerW?: number
  sensitivityDbSpl1W1m?: number
  lineArray?: {
    lengthM: number
    elementCount: number
    elementSpacingM: number
    steerDeg?: number
  }
  model?: 'point' | 'line' | 'auto'
}

export interface SplRequest {
  receiverM: Vec3
  frequencyHz: number
  sources: readonly SplSource[]
  conditions?: AirConditions
  /** Coherent summation models phase alignment; incoherent is the safe default. */
  coherent?: boolean
  speedOfSound?: number
}

export interface SourceSpl {
  id?: string
  splDb: number
  distanceM: number
  azimuthDeg: number
  elevationDeg: number
  directivityDb: number
  geometricLossDb: number
  airLossDb: number
  sensitivityDbSpl1W1m: number
  driveDb: number
}

export interface SplAtReceiverResult {
  splDb: number
  sources: SourceSpl[]
  coherent: boolean
}

export function splAtReceiver(request: SplRequest): SplAtReceiverResult {
  const conditions = request.conditions ?? STANDARD_AIR
  const speedOfSound = request.speedOfSound ?? SPEED_OF_SOUND_M_S
  const coherent = request.coherent ?? false
  const perSource = request.sources.map((source) =>
    computeSourceSpl(source, request.receiverM, request.frequencyHz, conditions, speedOfSound),
  )

  if (perSource.length === 0) {
    return { splDb: Number.NEGATIVE_INFINITY, sources: [], coherent }
  }

  if (!coherent) {
    return {
      splDb: sumSplIncoherentDb(perSource.map((item) => item.splDb)),
      sources: perSource,
      coherent,
    }
  }

  const k = (2 * Math.PI * request.frequencyHz) / speedOfSound
  let real = 0
  let imag = 0
  for (let i = 0; i < perSource.length; i += 1) {
    const item = perSource[i]!
    const source = request.sources[i]!
    const amplitude = dbToAmplitude(item.splDb)
    const delayRad = ((source.delayMs ?? 0) / 1000) * 2 * Math.PI * request.frequencyHz
    const polarityPhase = (source.polarity ?? 0) * Math.PI
    const phase = -k * item.distanceM - delayRad + polarityPhase
    real += amplitude * Math.cos(phase)
    imag += amplitude * Math.sin(phase)
  }

  return {
    splDb: 20 * Math.log10(Math.max(Math.hypot(real, imag), 1e-12)),
    sources: perSource,
    coherent,
  }
}

export function splBandsAtReceiver(
  request: Omit<SplRequest, 'frequencyHz'>,
  frequenciesHz: readonly number[],
): { frequencyHz: number; splDb: number }[] {
  return frequenciesHz.map((frequencyHz) => ({
    frequencyHz,
    splDb: splAtReceiver({ ...request, frequencyHz }).splDb,
  }))
}

export function computeSourceSpl(
  source: SplSource,
  receiverM: Vec3,
  frequencyHz: number,
  conditions: AirConditions = STANDARD_AIR,
  speedOfSound = SPEED_OF_SOUND_M_S,
): SourceSpl {
  const delta = subtract(receiverM, source.positionM)
  const d = Math.max(distance(source.positionM, receiverM), 1e-3)
  const worldDirection = normalize(delta)
  const rotation = rotationMatrixYXZ(source.orientationDeg ?? [0, 0, 0])
  const localDirection = worldToLocalDirection(rotation, worldDirection)
  const { azimuthDeg, elevationDeg } = directionToAzEl(localDirection)

  const polar =
    source.directivity ??
    source.profile?.acoustics.directivity ?? {
      kind: 'parametric' as const,
      normalization: 'on-axis-0db' as const,
      referenceDistanceM: 1,
      parametric: { model: 'omnidirectional' as const },
    }
  const directivityDb = sampleDirectivityDb(polar, azimuthDeg, elevationDeg, frequencyHz)

  const referenceDistanceM = Math.max(
    polar.referenceDistanceM || 1,
    1e-3,
  )
  const geometryModel =
    source.model === 'line' || (source.model !== 'point' && source.lineArray)
      ? 'line'
      : source.model === 'auto' && source.profile?.acoustics.lineArray
        ? 'line'
        : 'point'

  const lengthM =
    source.lineArray?.lengthM ??
    source.profile?.acoustics.lineArray?.lengthM ??
    1

  const geometricLossDb =
    geometryModel === 'line'
      ? lineSourceAttenuationDb(d, referenceDistanceM, lengthM, frequencyHz, speedOfSound)
      : pointSourceAttenuationDb(d, referenceDistanceM)

  const airLossDb =
    airAbsorptionDbPerM(frequencyHz, conditions) * Math.max(0, d - referenceDistanceM)

  const sensitivityDbSpl1W1m =
    source.sensitivityDbSpl1W1m ??
    (source.profile
      ? bandValueAt(source.profile.acoustics.sensitivityDbSpl1W1m, frequencyHz)
      : 90)

  const inputPowerW = Math.max(source.inputPowerW ?? 1, 1e-9)
  const driveDb = 10 * Math.log10(inputPowerW)
  const gainDb = source.gainDb ?? 0

  return {
    id: source.id,
    splDb:
      sensitivityDbSpl1W1m +
      driveDb +
      gainDb +
      directivityDb -
      geometricLossDb -
      airLossDb,
    distanceM: d,
    azimuthDeg,
    elevationDeg,
    directivityDb,
    geometricLossDb,
    airLossDb,
    sensitivityDbSpl1W1m,
    driveDb,
  }
}

/** Energy sum of per-source levels, exposed for custom propagation pipelines. */
export function combineIncoherent(levelsDb: readonly number[]): number {
  return sumSplIncoherentDb(levelsDb)
}
