import type { Vec3 } from '../types/common'

export const DEG_TO_RAD = Math.PI / 180
export const RAD_TO_DEG = 180 / Math.PI

export function toRadians(deg: number): number {
  return deg * DEG_TO_RAD
}

export function toDegrees(rad: number): number {
  return rad * RAD_TO_DEG
}

/** Wrap to [-180, 180). */
export function wrapDegrees180(deg: number): number {
  const wrapped = ((deg + 180) % 360 + 360) % 360
  return wrapped - 180
}

/** Wrap to [0, 360). */
export function wrapDegrees360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function shortestAngleDeltaDeg(a: number, b: number): number {
  return wrapDegrees180(b - a)
}

/**
 * Direction to azimuth/elevation in the AURA convention:
 * +Z = 0° azimuth, +X = +90°, +Y = +90° elevation.
 * Azimuth is in [-180, 180), elevation in [-90, 90].
 */
export function directionToAzEl(direction: Vec3): { azimuthDeg: number; elevationDeg: number } {
  const [x, y, z] = direction
  const horizontal = Math.hypot(x, z)
  return {
    azimuthDeg: horizontal < 1e-12 ? 0 : toDegrees(Math.atan2(x, z)),
    elevationDeg: horizontal < 1e-12 && Math.abs(y) < 1e-12 ? 0 : toDegrees(Math.atan2(y, horizontal)),
  }
}

export function azElToDirection(azimuthDeg: number, elevationDeg: number): Vec3 {
  const az = toRadians(azimuthDeg)
  const el = toRadians(elevationDeg)
  const horizontal = Math.cos(el)
  return [horizontal * Math.sin(az), Math.sin(el), horizontal * Math.cos(az)]
}

export function angularDistanceDeg(aAz: number, aEl: number, bAz: number, bEl: number): number {
  const a = azElToDirection(aAz, aEl)
  const b = azElToDirection(bAz, bEl)
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)
  return toDegrees(Math.acos(dot))
}
