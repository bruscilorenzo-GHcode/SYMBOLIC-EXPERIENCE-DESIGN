import type { Vec3 } from '../types/common'

export const ZERO: Vec3 = [0, 0, 0]
export const UP: Vec3 = [0, 1, 0]

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

export function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v)
  if (len < 1e-12) return [0, 0, 1]
  return [v[0] / len, v[1] / len, v[2] / len]
}

export function distance(a: Vec3, b: Vec3): number {
  return length(subtract(a, b))
}

/** Row-major 3×3 matrix as a flat array. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

/**
 * Intrinsic Y-X-Z rotation, in degrees.
 * Yaw rotates around +Y, pitch around +X, roll around +Z.
 * The matrix maps a local direction into world space.
 */
export function rotationMatrixYXZ(rotationDeg: Vec3): Mat3 {
  const [yaw, pitch, roll] = [
    toRadians(rotationDeg[0]),
    toRadians(rotationDeg[1]),
    toRadians(rotationDeg[2]),
  ]
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cx = Math.cos(pitch)
  const sx = Math.sin(pitch)
  const cz = Math.cos(roll)
  const sz = Math.sin(roll)

  // R = Ry(yaw) * Rx(pitch) * Rz(roll)
  return [
    cy * cz + sy * sx * sz,
    -cy * sz + sy * sx * cz,
    sy * cx,
    cx * sz,
    cx * cz,
    -sx,
    -sy * cz + cy * sx * sz,
    sy * sz + cy * sx * cz,
    cy * cx,
  ]
}

export function applyMat3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

export function transposeMat3(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

/** World direction into a speaker-local direction (inverse rotation). */
export function worldToLocalDirection(m: Mat3, worldDir: Vec3): Vec3 {
  return applyMat3(transposeMat3(m), worldDir)
}

export function localToWorldDirection(m: Mat3, localDir: Vec3): Vec3 {
  return applyMat3(m, localDir)
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}
