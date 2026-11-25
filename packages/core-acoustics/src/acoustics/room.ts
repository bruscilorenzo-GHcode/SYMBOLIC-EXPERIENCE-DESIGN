export interface AbsorptionArea {
  areaM2: number
  absorption: number
}

export function meanAbsorption(items: readonly AbsorptionArea[]): number {
  let area = 0
  let sabins = 0
  for (const item of items) {
    const a = Math.max(0, item.areaM2)
    area += a
    sabins += a * clamp01(item.absorption)
  }
  return area > 0 ? sabins / area : 0
}

/** Sabine reverberation time. Returns Infinity for a perfectly reflective room. */
export function sabineT60(volumeM3: number, totalSurfaceAreaM2: number, averageAbsorption: number): number {
  const denominator = totalSurfaceAreaM2 * clamp01(averageAbsorption)
  if (denominator <= 1e-9) return Number.POSITIVE_INFINITY
  return (0.161 * Math.max(0, volumeM3)) / denominator
}

/** Eyring reverberation time, preferable for high absorption coefficients. */
export function eyringT60(volumeM3: number, totalSurfaceAreaM2: number, averageAbsorption: number): number {
  const alpha = clamp01(averageAbsorption)
  if (alpha <= 1e-9) return Number.POSITIVE_INFINITY
  const denominator = -totalSurfaceAreaM2 * Math.log(1 - alpha)
  if (denominator <= 1e-9) return 0
  return (0.161 * Math.max(0, volumeM3)) / denominator
}

/** Room constant R = S·α / (1 − α), in m² sabins. */
export function roomConstantM2(totalSurfaceAreaM2: number, averageAbsorption: number): number {
  const alpha = clamp01(averageAbsorption)
  if (alpha >= 1 - 1e-9) return Number.POSITIVE_INFINITY
  return (totalSurfaceAreaM2 * alpha) / (1 - alpha)
}

/** Critical distance for a source of directivity factor Q. */
export function criticalDistanceM(directivityFactorQ: number, roomConstant: number): number {
  if (roomConstant <= 0) return 0
  return Math.sqrt((Math.max(0, directivityFactorQ) * roomConstant) / (16 * Math.PI))
}

/**
 * Direct-to-reverberant ratio in dB:
 * D/R = 10 log10(Q·R / (16π·d²)).
 */
export function directToReverberantDb(
  directivityFactorQ: number,
  distanceM: number,
  roomConstant: number,
): number {
  const d = Math.max(distanceM, 1e-3)
  const ratio = (Math.max(0, directivityFactorQ) * Math.max(0, roomConstant)) / (16 * Math.PI * d * d)
  return 10 * Math.log10(Math.max(ratio, 1e-12))
}

/**
 * Diffuse-field level relative to the source's 1 m free-field level:
 * L_rev = L_1m + 10 log10(4 / R).
 */
export function reverberantLevelOffsetDb(roomConstant: number): number {
  if (roomConstant <= 0) return Number.NEGATIVE_INFINITY
  return 10 * Math.log10(4 / roomConstant)
}

/** Sabine T60 per octave band, using band-wise absorption areas. */
export function sabineT60ByBand(
  volumeM3: number,
  totalSurfaceAreaM2: number,
  absorptionByBand: readonly number[],
): number[] {
  return absorptionByBand.map((alpha) => sabineT60(volumeM3, totalSurfaceAreaM2, alpha))
}

/** Convert a measured decay curve (dB vs seconds) to T60 by 60 dB extrapolation. */
export function t60FromDecay(decayDb: readonly number[], sampleIntervalS: number): number {
  if (decayDb.length < 2) return 0
  const start = decayDb[0]!
  const end = decayDb[decayDb.length - 1]!
  const drop = start - end
  if (drop <= 0) return Number.POSITIVE_INFINITY
  return (60 / drop) * (decayDb.length - 1) * sampleIntervalS
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
