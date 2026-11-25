import { clamp } from './angles'

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function inverseLerp(a: number, b: number, value: number): number {
  if (Math.abs(b - a) < 1e-12) return 0
  return (value - a) / (b - a)
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp(inverseLerp(edge0, edge1, x), 0, 1)
  return t * t * (3 - 2 * t)
}

export function bilinear(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  q00: number,
  q10: number,
  q01: number,
  q11: number,
  x: number,
  y: number,
): number {
  const tx = inverseLerp(x0, x1, x)
  const ty = inverseLerp(y0, y1, y)
  const a = lerp(q00, q10, tx)
  const b = lerp(q01, q11, tx)
  return lerp(a, b, ty)
}

/** Linear interpolation over log-frequency, which behaves better for octave data. */
export function logFrequencyLerp(f0: number, f1: number, value0: number, value1: number, f: number): number {
  if (f0 <= 0 || f1 <= 0 || f <= 0) return lerp(value0, value1, inverseLerp(f0, f1, f))
  const t = Math.log(f / f0) / Math.log(f1 / f0)
  return lerp(value0, value1, clamp(t, 0, 1))
}

export function dbToAmplitude(db: number): number {
  return 10 ** (db / 20)
}

export function amplitudeToDb(amplitude: number): number {
  return 20 * Math.log10(Math.max(amplitude, 1e-12))
}

export function dbToPower(db: number): number {
  return 10 ** (db / 10)
}

export function powerToDb(power: number): number {
  return 10 * Math.log10(Math.max(power, 1e-24))
}

/** Incoherent (energy) summation of independent sources. */
export function sumSplIncoherentDb(levelsDb: readonly number[]): number {
  if (levelsDb.length === 0) return Number.NEGATIVE_INFINITY
  let power = 0
  for (const level of levelsDb) power += dbToPower(level)
  return powerToDb(power)
}

export function averageDb(levelsDb: readonly number[]): number {
  if (levelsDb.length === 0) return Number.NEGATIVE_INFINITY
  let power = 0
  for (const level of levelsDb) power += dbToPower(level)
  return powerToDb(power / levelsDb.length)
}

export function clampDb(db: number, min = -120, max = 200): number {
  return Math.min(max, Math.max(min, db))
}
