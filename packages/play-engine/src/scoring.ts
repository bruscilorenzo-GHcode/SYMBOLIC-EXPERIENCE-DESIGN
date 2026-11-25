import { clampUnit } from './parameters'
import type { PlayScore, PlayWorld } from './types'

/**
 * Five independent, legible dimensions. There is deliberately no single
 * "points" number: the garden can be coherent but ecologically poor, or novel
 * but illegible. The score is a composition profile, not a leaderboard.
 */
export function scoreWorld(world: PlayWorld): PlayScore {
  const { acoustics, environmental, music, social, vegetation } = world
  const t60Fit = 1 - Math.min(1, Math.abs(acoustics.t60S - 1.45) / 2.4)
  const harmonicWarnings = social.coexistence.warnings.length
  const harmonicAgreement = 1 - Math.min(1, harmonicWarnings / 7)
  const dataCoverage =
    environmental.dataToMusic.usedReadings.length / Math.max(1, environmental.readings.length)
  const musicalCoherence = clampUnit(
    0.12 +
      harmonicAgreement * 0.29 +
      dataCoverage * 0.17 +
      t60Fit * 0.18 +
      (1 - music.descriptor.roughness) * 0.1 +
      acoustics.intelligibility * 0.14,
  )

  const ecologicalBalance = clampUnit(
    vegetation.ecologicalBalance * 0.74 +
      environmental.waterQuality * 0.12 +
      environmental.airQuality * 0.09 +
      (vegetation.canopyProjectionM2 > 0 ? 0.05 : 0),
  )

  const spatialClarity = clampUnit(
    acoustics.spatialClarity * 0.65 +
      acoustics.clarity * 0.18 +
      (1 - acoustics.waterMasking) * 0.09 +
      (1 - acoustics.crowdMasking) * 0.08,
  )

  const inclusion = clampUnit(social.inclusion)

  const values = Object.values(world.parameters)
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length)
  const spread = clampUnit(Math.sqrt(variance) / 0.3)
  const rarePair =
    Math.abs(world.parameters.canopy - world.parameters.water) * 0.22 +
    world.parameters.stone * (1 - world.parameters.wind) * 0.18 +
    Math.abs(world.parameters.light - world.parameters.guests) * 0.16 +
    world.parameters.wind * world.parameters.season * 0.14
  const edge = values.filter((value) => value < 0.2 || value > 0.8).length / Math.max(1, values.length)
  const novelty = clampUnit(0.16 + spread * 0.36 + rarePair * 0.3 + edge * 0.16)

  return {
    musicalCoherence: round(musicalCoherence, 3),
    ecologicalBalance: round(ecologicalBalance, 3),
    inclusion: round(inclusion, 3),
    spatialClarity: round(spatialClarity, 3),
    novelty: round(novelty, 3),
  }
}

export function scoreLabel(value: number): string {
  if (value >= 0.82) return 'pieno'
  if (value >= 0.64) return 'vivo'
  if (value >= 0.46) return 'in ascolto'
  if (value >= 0.28) return 'fragile'
  return 'latente'
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
