import type {
  BandSeries,
  HexColor,
  IsoDateTime,
  Provenance,
  SchemaVersion,
  Transform,
  Vec3,
} from './common'

export type SpeakerKind =
  | 'point-source'
  | 'line-array'
  | 'column'
  | 'subwoofer'
  | 'omnidirectional'
  | 'acoustic-lens'
  | 'surface-transducer'
  | 'coaxial'
  | 'horn'

export type DirectivityNormalization = 'on-axis-0db' | 'max-0db' | 'absolute'

/**
 * Regular spherical grid. Values are indexed as
 * `valuesDb[band][elevation][azimuth]`.
 *
 * Azimuth 0° points along local +Z (front), increasing toward local +X.
 * Elevation is measured from the horizontal plane, +90° is local +Y.
 */
export interface PolarGrid {
  frequenciesHz: number[]
  azimuthsDeg: number[]
  elevationsDeg: number[]
  valuesDb: number[][][]
  normalization: DirectivityNormalization
  referenceDistanceM: number
}

/** Real spherical-harmonic expansion of a polar balloon, per band. */
export interface SphericalHarmonicSet {
  order: number
  frequenciesHz: number[]
  /** `coefficients[band][coefficientIndex]`, ACN-ish ordering from `realSHBasis`. */
  coefficients: number[][]
  normalization: DirectivityNormalization
}

export type ParametricDirectivity =
  | { model: 'omnidirectional' }
  | { model: 'cardioid'; rearAttenuationDb?: number }
  | { model: 'supercardioid'; rearAttenuationDb?: number }
  | {
      model: 'line-array'
      lengthM: number
      elementCount: number
      elementSpacingM: number
      steerDeg?: number
      /** Additional vertical window in degrees, applied as a cosine taper. */
      verticalWindowDeg?: number
    }
  | {
      model: 'lens'
      horizontalBeamwidthDeg: number
      verticalBeamwidthDeg: number
      rearAttenuationDb?: number
    }

export interface PolarDataSet {
  kind: 'grid' | 'sh' | 'parametric'
  normalization: DirectivityNormalization
  referenceDistanceM: number
  grid?: PolarGrid
  sh?: SphericalHarmonicSet
  parametric?: ParametricDirectivity
  sourceFormat?: 'aura-polar-csv-v1' | 'gll' | 'clf' | 'ease' | 'measurement' | 'synthetic'
}

export interface LineArraySpec {
  lengthM: number
  elementCount: number
  elementSpacingM: number
  wavefront: 'cylindrical' | 'spherical'
  beamSteering: {
    supported: boolean
    maxAngleDeg: number
    resolutionDeg: number
    /** Processing latency of the steering DSP, in samples at `processingRateHz`. */
    latencySamples?: number
    processingRateHz?: number
  }
  /** Technology label only; electrical behaviour is always taken from the measured polar data. */
  pat?: {
    supported: boolean
    notes?: string
  }
  nearFieldModel?: 'cylindrical-to-spherical' | 'spherical'
}

export interface LensSpec {
  type: 'acoustic-lens' | 'omni-cone' | 'cylinder' | 'directional-sphere'
  diffusionModel: 'lambertian' | 'measured-polar' | 'custom'
  notes?: string
}

export interface PowerHandling {
  rmsW: number
  programW?: number
  peakW?: number
}

export interface ElectricalSpec {
  configuration: 'low-z' | '70v' | '100v' | 'self-powered' | 'poe' | 'dante-powered'
  nominalImpedanceOhm?: number
  tapsW?: number[]
  connector: string
  wiring?: string
  recommendedAmplifierPowerW?: number
  maxCurrentA?: number
  dante?: {
    channels: number
    sampleRatesHz: number[]
    redundancy: 'none' | 'primary-secondary'
    poe?: boolean
  }
  aes67?: boolean
  avb?: boolean
}

export interface PhysicalSpec {
  dimensionsM: { width: number; height: number; depth: number }
  weightKg: number
  materials: string[]
  ipRating: string
  operatingTemperatureC: { min: number; max: number }
  mountingPoints: string[]
  colorOptions?: HexColor[]
}

export interface AccessorySpec {
  id: string
  name: string
  sku?: string
  type: 'mount' | 'bracket' | 'stand' | 'cable' | 'connector' | 'weather-shield' | 'transformer' | 'other'
  included: boolean
  ipRating?: string
  loadRatingKg?: number
  notes?: string
}

export interface SpeakerFiles {
  gll?: string
  clf?: string
  ease?: string
  datasheetPdf?: string
  measurementArchive?: string
  impulseResponses?: string[]
}

export interface AcousticSpeakerProfile {
  schemaVersion: SchemaVersion
  id: string
  manufacturer: {
    id: string
    name: string
    website?: string
    country?: string
  }
  model: {
    name: string
    code: string
    family?: string
    series?: string
    description?: string
  }
  kind: SpeakerKind
  tags: string[]
  acoustics: {
    bandsHz: number[]
    sensitivityDbSpl1W1m: BandSeries
    maxSplDb: BandSeries
    impedanceOhm: BandSeries
    powerHandlingW: PowerHandling
    directivity: PolarDataSet
    directivityIndexDb?: BandSeries
    directivityFactorQ?: BandSeries
    nominalDispersionDeg?: {
      horizontal?: number
      vertical?: number
      coverageAngle?: number
    }
    lineArray?: LineArraySpec
    lens?: LensSpec
    lowFrequencyExtensionHz?: number
    recommendedCrossoverHz?: number
  }
  electrical: ElectricalSpec
  physical: PhysicalSpec
  accessories: AccessorySpec[]
  files: SpeakerFiles
  provenance: Provenance
  extensions?: Record<string, unknown>
}

export interface SpeakerPlacement {
  id: string
  profileId: string
  label: string
  positionM: Vec3
  /** [yaw, pitch, roll] in degrees; yaw 0 faces +Z. */
  orientationDeg: Vec3
  /** Rigging offset from the mounting point, in speaker-local coordinates. */
  mountingOffsetM?: Vec3
  transform?: Transform
  gainDb: number
  delayMs: number
  polarity: 0 | 1
  mountAccessoryId?: string
  amplifierChannelId?: string
  outputChannelId?: string
  zoneId?: string
  groupIds: string[]
  locked: boolean
}

export interface ManufacturerCatalogEntry {
  manufacturerId: string
  name: string
  website?: string
  license: string
  lastSyncedAt: IsoDateTime
  profileCount: number
}
