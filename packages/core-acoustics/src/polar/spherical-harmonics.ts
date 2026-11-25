import type { PolarGrid, SphericalHarmonicSet } from '../types/speaker'
import { toRadians } from '../math/angles'
import { logFrequencyLerp } from '../math/interpolate'

export interface ShFitOptions {
  /** Tikhonov regularisation added to the normal equations. */
  regularization?: number
  /** Skip samples below this value; useful when a table uses -999 as "no data". */
  floorDb?: number
}

export function shCoefficientCount(order: number): number {
  return (order + 1) * (order + 1)
}

/**
 * Real spherical-harmonic basis, normalised to the orthonormal convention.
 * Index order follows l = 0..order, m = -l..l (ACN-like, within each degree).
 *
 * Direction convention: elevation from the horizontal plane, azimuth around +Y,
 * with +Z = 0° azimuth. The basis itself is evaluated with the standard
 * polar angle θ = 90° - elevation.
 */
export function realSHBasis(order: number, azimuthDeg: number, elevationDeg: number): number[] {
  const phi = toRadians(azimuthDeg)
  const theta = toRadians(90 - elevationDeg)
  const x = Math.cos(theta)
  const values: number[] = []

  for (let l = 0; l <= order; l += 1) {
    for (let m = -l; m <= l; m += 1) {
      const absM = Math.abs(m)
      const norm = Math.sqrt(((2 * l + 1) / (4 * Math.PI)) * (factorial(l - absM) / factorial(l + absM)))
      const p = associatedLegendre(l, absM, x)
      if (m === 0) {
        values.push(norm * p)
      } else if (m > 0) {
        values.push(Math.SQRT2 * norm * p * Math.cos(absM * phi))
      } else {
        values.push(Math.SQRT2 * norm * p * Math.sin(absM * phi))
      }
    }
  }
  return values
}

/** Least-squares fit of the dB balloon to real SH coefficients, band by band. */
export function fitSphericalHarmonics(
  grid: PolarGrid,
  order: number,
  options: ShFitOptions = {},
): SphericalHarmonicSet {
  const k = shCoefficientCount(order)
  const regularization = options.regularization ?? 1e-6
  const floor = options.floorDb ?? -200

  const coefficients = grid.frequenciesHz.map((_, bandIndex) => {
    const a: number[][] = []
    const y: number[] = []
    for (let e = 0; e < grid.elevationsDeg.length; e += 1) {
      for (let az = 0; az < grid.azimuthsDeg.length; az += 1) {
        const value = grid.valuesDb[bandIndex]?.[e]?.[az]
        if (value === undefined || value < floor) continue
        a.push(realSHBasis(order, grid.azimuthsDeg[az]!, grid.elevationsDeg[e]!))
        y.push(value)
      }
    }
    if (a.length === 0) return new Array<number>(k).fill(0)

    const normal = Array.from({ length: k }, () => new Array<number>(k).fill(0))
    const rhs = new Array<number>(k).fill(0)
    for (let row = 0; row < a.length; row += 1) {
      const basis = a[row]!
      const target = y[row]!
      for (let i = 0; i < k; i += 1) {
        rhs[i]! += basis[i]! * target
        for (let j = 0; j < k; j += 1) normal[i]![j]! += basis[i]! * basis[j]!
      }
    }
    for (let i = 0; i < k; i += 1) normal[i]![i]! += regularization
    return solveLinearSystem(normal, rhs)
  })

  return {
    order,
    frequenciesHz: [...grid.frequenciesHz],
    coefficients,
    normalization: grid.normalization,
  }
}

export function evaluateSphericalHarmonics(
  set: SphericalHarmonicSet,
  azimuthDeg: number,
  elevationDeg: number,
  frequencyHz: number,
): number {
  if (set.frequenciesHz.length === 0) return 0
  const f = Math.max(frequencyHz, 1)
  const frequencies = set.frequenciesHz
  if (f <= frequencies[0]!) return dot(set.coefficients[0]!, realSHBasis(set.order, azimuthDeg, elevationDeg))
  if (f >= frequencies[frequencies.length - 1]!) {
    return dot(set.coefficients[set.coefficients.length - 1]!, realSHBasis(set.order, azimuthDeg, elevationDeg))
  }

  for (let i = 0; i < frequencies.length - 1; i += 1) {
    const f0 = frequencies[i]!
    const f1 = frequencies[i + 1]!
    if (f >= f0 && f <= f1) {
      const a = dot(set.coefficients[i]!, realSHBasis(set.order, azimuthDeg, elevationDeg))
      const b = dot(set.coefficients[i + 1]!, realSHBasis(set.order, azimuthDeg, elevationDeg))
      return logFrequencyLerp(f0, f1, a, b, f)
    }
  }
  return 0
}

export function shToGrid(
  set: SphericalHarmonicSet,
  azimuthsDeg: number[],
  elevationsDeg: number[],
): number[][][] {
  return set.frequenciesHz.map((frequency) =>
    elevationsDeg.map((elevation) =>
      azimuthsDeg.map((azimuth) => evaluateSphericalHarmonics(set, azimuth, elevation, frequency)),
    ),
  )
}

function dot(a: readonly number[], b: readonly number[]): number {
  let sum = 0
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) sum += a[i]! * b[i]!
  return sum
}

const factorialCache: number[] = [1]

function factorial(n: number): number {
  if (n < 0) return 1
  for (let i = factorialCache.length; i <= n; i += 1) factorialCache[i] = factorialCache[i - 1]! * i
  return factorialCache[n]!
}

/** Associated Legendre polynomial P_l^m(x), including the Condon–Shortley phase. */
function associatedLegendre(l: number, m: number, x: number): number {
  if (m < 0 || m > l) return 0
  let pmm = 1
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, 1 - x * x))
    let fact = 1
    for (let i = 1; i <= m; i += 1) {
      pmm *= -fact * somx2
      fact += 2
    }
  }
  if (l === m) return pmm
  let pmmp1 = x * (2 * m + 1) * pmm
  if (l === m + 1) return pmmp1
  let pll = 0
  for (let ll = m + 2; ll <= l; ll += 1) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m)
    pmm = pmmp1
    pmmp1 = pll
  }
  return pll
}

function solveLinearSystem(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length
  const a = matrix.map((row) => [...row])
  const b = [...rhs]

  for (let col = 0; col < n; col += 1) {
    let pivot = col
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row]![col]!) > Math.abs(a[pivot]![col]!)) pivot = row
    }
    if (Math.abs(a[pivot]![col]!) < 1e-14) continue
    if (pivot !== col) {
      const tmp = a[pivot]!
      a[pivot] = a[col]!
      a[col] = tmp
      const tb = b[pivot]!
      b[pivot] = b[col]!
      b[col] = tb
    }
    const diag = a[col]![col]!
    for (let row = col + 1; row < n; row += 1) {
      const factor = a[row]![col]! / diag
      if (factor === 0) continue
      for (let j = col; j < n; j += 1) a[row]![j]! -= factor * a[col]![j]!
      b[row]! -= factor * b[col]!
    }
  }

  const result = new Array<number>(n).fill(0)
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = b[row]!
    for (let col = row + 1; col < n; col += 1) sum -= a[row]![col]! * result[col]!
    const diag = a[row]![row]!
    result[row] = Math.abs(diag) < 1e-14 ? 0 : sum / diag
  }
  return result
}
