import { clamp } from '../math/angles'

export const SPEED_OF_SOUND_M_S = 343

/**
 * Near-field / far-field transition of a finite line source.
 * d_nf = L² f / (2c). Inside d_nf the wavefront is approximately cylindrical.
 */
export function lineArrayTransitionDistanceM(
  lengthM: number,
  frequencyHz: number,
  speedOfSound = SPEED_OF_SOUND_M_S,
): number {
  if (lengthM <= 0 || frequencyHz <= 0 || speedOfSound <= 0) return 0
  return (lengthM * lengthM * frequencyHz) / (2 * speedOfSound)
}

/**
 * Combined cylindrical → spherical geometric loss of a finite line array.
 *
 * L(d) = L0 - 10 log10(d/d0) - 10 log10(1 + d/d_nf)
 *
 * For d << d_nf this is −3 dB per doubling (cylindrical);
 * for d >> d_nf it becomes −6 dB per doubling (spherical).
 */
export function lineSourceAttenuationDb(
  distanceM: number,
  referenceDistanceM: number,
  lengthM: number,
  frequencyHz: number,
  speedOfSound = SPEED_OF_SOUND_M_S,
): number {
  const d = Math.max(distanceM, 1e-3)
  const d0 = Math.max(referenceDistanceM, 1e-3)
  const dnf = Math.max(lineArrayTransitionDistanceM(lengthM, frequencyHz, speedOfSound), 1e-9)
  return 10 * Math.log10(d / d0) + 10 * Math.log10(1 + d / dnf)
}

/** Idealised point-source loss for comparison: −6 dB per doubling. */
export function pointSourceAttenuationDb(distanceM: number, referenceDistanceM: number): number {
  return 20 * Math.log10(Math.max(distanceM, 1e-3) / Math.max(referenceDistanceM, 1e-3))
}

/**
 * Far-field array factor for a uniformly excited, uniformly spaced line array.
 *
 * ψ = k s (sin θ − sin θ_s)
 * AF(ψ) = |sin(Nψ/2) / (N sin(ψ/2))|
 *
 * Returns dB relative to the steered main lobe (0 dB).
 */
export function lineArrayArrayFactorDb(
  elementCount: number,
  elementSpacingM: number,
  steerAngleDeg: number,
  observationAngleDeg: number,
  frequencyHz: number,
  speedOfSound = SPEED_OF_SOUND_M_S,
): number {
  const n = Math.max(1, Math.floor(elementCount))
  if (n === 1) return 0
  const k = (2 * Math.PI * frequencyHz) / speedOfSound
  const psi =
    k *
    elementSpacingM *
    (Math.sin((observationAngleDeg * Math.PI) / 180) - Math.sin((steerAngleDeg * Math.PI) / 180))
  const half = psi / 2
  const denominator = n * Math.sin(half)
  const amplitude =
    Math.abs(denominator) < 1e-12 ? 1 : Math.abs(Math.sin(n * half) / denominator)
  return 20 * Math.log10(Math.max(amplitude, 1e-6))
}

/** Element delays for electronic steering, in seconds. Element 0 is the reference. */
export function steeringDelaysS(
  elementCount: number,
  elementSpacingM: number,
  steerAngleDeg: number,
  speedOfSound = SPEED_OF_SOUND_M_S,
): number[] {
  const n = Math.max(1, Math.floor(elementCount))
  const base = (elementSpacingM * Math.sin((steerAngleDeg * Math.PI) / 180)) / speedOfSound
  return Array.from({ length: n }, (_, index) => index * base)
}

/**
 * Spatial Nyquist limit: element spacing must not exceed half a wavelength,
 * otherwise grating lobes appear in the steered beam.
 */
export function maxAliasingFrequencyHz(
  elementSpacingM: number,
  speedOfSound = SPEED_OF_SOUND_M_S,
): number {
  if (elementSpacingM <= 0) return 0
  return speedOfSound / (2 * elementSpacingM)
}

/**
 * Vertical window used by the synthetic `line-array` parametric directivity.
 * The window is flat on axis and rolls off smoothly at the edge of the
 * specified coverage cone.
 */
export function verticalWindowDb(elevationDeg: number, windowDeg: number): number {
  if (windowDeg <= 0) return 0
  const t = clamp(Math.abs(elevationDeg) / windowDeg, 0, 1)
  const amplitude = Math.cos((Math.PI / 2) * t)
  return 20 * Math.log10(Math.max(amplitude, 1e-6))
}
