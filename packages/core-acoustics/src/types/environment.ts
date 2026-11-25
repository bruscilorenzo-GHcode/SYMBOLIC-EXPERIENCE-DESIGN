import type {
  BandSeries,
  GeoReference,
  SchemaVersion,
  Transform,
  Vec2,
  Vec3,
} from './common'

export interface SurfaceMaterial {
  id: string
  name: string
  category:
    | 'concrete'
    | 'plaster'
    | 'wood'
    | 'metal'
    | 'glass'
    | 'fabric'
    | 'vegetation'
    | 'water'
    | 'soil'
    | 'acoustic-panel'
    | 'membrane'
    | 'other'
  /** Octave-band absorption coefficients, 0..1. */
  absorption: BandSeries
  /** Octave-band scattering coefficients, 0..1. */
  scattering: BandSeries
  /** Octave-band transmission loss in dB. Omit for effectively opaque boundaries. */
  transmissionLossDb?: BandSeries
  notes?: string
}

export type BoundaryRole =
  | 'wall'
  | 'floor'
  | 'ceiling'
  | 'facade'
  | 'canopy'
  | 'ground'
  | 'water'
  | 'glass'
  | 'soft'
  | 'other'

export interface MeshGeometry {
  positions: number[]
  indices: number[]
  normals?: number[]
  uvs?: number[]
}

export interface PolygonExtrusionGeometry {
  /** Footprint in the XZ plane, counter-clockwise. */
  footprint: Vec2[]
  heightM: number
  /** Extrude downward from `transform.positionM.y` instead of upward. */
  downward?: boolean
}

export interface PlaneGeometry {
  widthM: number
  depthM: number
  transform: Transform
}

export interface BoxGeometry {
  sizeM: Vec3
  transform: Transform
}

export type BoundaryGeometry =
  | { type: 'mesh'; mesh: MeshGeometry; transform?: Transform }
  | { type: 'polygon-extrusion'; geometry: PolygonExtrusionGeometry; transform?: Transform }
  | { type: 'plane'; geometry: PlaneGeometry }
  | { type: 'box'; geometry: BoxGeometry }

export interface Opening {
  id: string
  kind: 'door' | 'window' | 'void' | 'skylight'
  /** Opening rectangle in surface-local metres, origin at surface centroid. */
  widthM: number
  heightM: number
  offsetM: Vec2
  /** 0 = fully open, 1 = fully closed with the parent material. */
  closure: number
  materialId?: string
}

export interface BoundarySurface {
  id: string
  name: string
  role: BoundaryRole
  geometry: BoundaryGeometry
  materialId: string
  layerIds: string[]
  areaM2?: number
  openings?: Opening[]
  acousticOverride?: {
    absorption?: BandSeries
    scattering?: BandSeries
    transmissionLossDb?: BandSeries
  }
  locked: boolean
  visible: boolean
}

export type Exposure = 'indoor' | 'sheltered' | 'outdoor' | 'submerged'

export interface AcousticZone {
  id: string
  name: string
  kind: 'room' | 'open-air' | 'transition' | 'listener' | 'service'
  exposure: Exposure
  /** Plan footprint used for occupancy, weather and BOM rules. */
  footprint?: Vec2[]
  mesh?: MeshGeometry
  floorHeightM?: number
  ceilingHeightM?: number
  acousticOverride?: {
    t60S?: number
    temperatureC?: number
    humidityPct?: number
    pressureKPa?: number
    windSpeedMs?: number
    windDirectionDeg?: number
  }
  capacity?: number
  tags: string[]
}

export interface ListenerPlane {
  id: string
  name: string
  heightM: number
  footprint: Vec2[]
  resolutionM: number
  /** Design targets used by the coverage solver and compliance reports. */
  targets?: {
    minSplDb?: number
    maxSplDb?: number
    uniformityDb?: number
    minSti?: number
    minDirectToReverberantDb?: number
  }
  tags: string[]
}

export interface EnvironmentLayer {
  id: string
  name: string
  kind: 'cad' | 'raster' | 'acoustic' | 'speaker' | 'listener' | 'annotation' | 'ai'
  visible: boolean
  locked: boolean
  opacity: number
  color?: string
}

export interface CadImportReference {
  id: string
  format: 'dwg' | 'dxf' | 'pdf' | 'svg'
  fileName: string
  /** Model-space units per source unit after calibration. */
  scaleToMetres: number
  originOffsetM: Vec2
  rotationDeg: number
  calibration?: {
    method: 'known-distance' | 'known-dimension' | 'georeference' | 'manual'
    referenceDistanceM?: number
    referencePixels?: number
    confidence?: number
  }
}

export interface RasterImportReference {
  id: string
  format: 'png' | 'jpg' | 'webp'
  fileName: string
  widthPx: number
  heightPx: number
  metresPerPixel: number
  originOffsetM: Vec2
  rotationDeg: number
  calibration?: {
    method: 'two-point' | 'known-dimension' | 'georeference' | 'manual'
    p1Px?: Vec2
    p2Px?: Vec2
    distanceM?: number
    confidence?: number
  }
  trace?: {
    method: 'manual' | 'assisted' | 'auto'
    confidence?: number
    reviewedBy?: string
  }
}

export interface ArchitecturalEnvironment {
  schemaVersion: SchemaVersion
  id: string
  name: string
  description?: string
  coordinateSystem: {
    handedness: 'right'
    upAxis: 'Y'
    units: 'm'
    trueNorthDeg?: number
  }
  geo?: GeoReference
  layers: EnvironmentLayer[]
  materials: SurfaceMaterial[]
  surfaces: BoundarySurface[]
  zones: AcousticZone[]
  listenerPlanes: ListenerPlane[]
  imports: {
    cad: CadImportReference[]
    raster: RasterImportReference[]
  }
  defaultConditions: {
    temperatureC: number
    humidityPct: number
    pressureKPa: number
    windSpeedMs: number
    windDirectionDeg: number
  }
  metadata: {
    createdAt: string
    updatedAt: string
    author: string
    tags: string[]
  }
}
