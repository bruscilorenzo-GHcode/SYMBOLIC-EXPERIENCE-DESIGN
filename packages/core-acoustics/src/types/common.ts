export type Vec2 = readonly [number, number]
export type Vec3 = readonly [number, number, number]
export type HexColor = `#${string}`
export type IsoDateTime = string
export type SchemaVersion = '1.0.0'

/** Right-handed, metric world. Y is up by default; Z is "north"/stage depth. */
export interface CoordinateSystem {
  handedness: 'right'
  upAxis: 'Y' | 'Z'
  units: 'm'
  /** Rotation of true north relative to +Z, clockwise in degrees. */
  trueNorthDeg?: number
}

export interface GeoReference {
  latitudeDeg: number
  longitudeDeg: number
  altitudeM: number
  trueNorthDeg?: number
}

export interface Transform {
  positionM: Vec3
  /** Intrinsic Y-X-Z rotation in degrees, ordered [yaw (Y), pitch (X), roll (Z)]. */
  rotationDeg: Vec3
  scale?: Vec3
}

/** Aligned arrays. `values[i]` belongs to `frequenciesHz[i]`. */
export interface BandSeries {
  frequenciesHz: number[]
  values: number[]
  unit?: string
}

export interface Provenance {
  source: string
  sourceUrl?: string
  retrievedAt: IsoDateTime
  license: string
  verification: 'manufacturer' | 'distributor' | 'measured' | 'estimated' | 'illustrative'
  checksumSha256?: string
  notes?: string
}

export interface AuditStamp {
  createdAt: IsoDateTime
  createdBy: string
  updatedAt: IsoDateTime
  updatedBy: string
  revision: number
}
