import type { SpatializationMode } from '@aura-spec/core-acoustics'
import type { MusicalDescriptor, PlantStratum } from '@aura-spec/landscape-culture'

export type DesignDirection = 'music-to-space' | 'space-to-music'
export type SiteKind = 'indoor' | 'outdoor' | 'phygital'
export type Climate = 'mediterranean' | 'temperate' | 'cold' | 'tropical'
export type AcousticIntent = 'intimate' | 'immersive' | 'public' | 'contemplative'

export interface SiteContext {
  siteKind: SiteKind
  widthM: number
  depthM: number
  ceilingHeightM: number
  climate: Climate
  /** 0 = night / enclosed, 1 = full daylight / open sky. */
  daylight: number
  acousticIntent: AcousticIntent
}

export const DEFAULT_SITE_CONTEXT: SiteContext = {
  siteKind: 'outdoor',
  widthM: 24,
  depthM: 16,
  ceilingHeightM: 6,
  climate: 'mediterranean',
  daylight: 0.8,
  acousticIntent: 'immersive',
}

export interface MusicFeatures {
  tempoBpm: number
  tonicPc: number
  /** Major/minor estimate; design mapping treats this as modal weight, not truth. */
  mode: 'major' | 'minor'
  density: number
  brightness: number
  roughness: number
  dynamicRangeDb: number
  spectralCentroidHz: number
  lowEnergyRatio: number
  highEnergyRatio: number
  onsetDensityPerSec: number
  durationS: number
  confidence: {
    tempo: number
    key: number
    spectral: number
  }
  source: 'analysis' | 'manual' | 'live'
  warnings: string[]
}

export type ArchitecturalItemKind =
  | 'floor'
  | 'wall'
  | 'glass'
  | 'canopy'
  | 'planter'
  | 'water'
  | 'stage'
  | 'path'
  | 'column'
  | 'opening'

export interface ArchitecturalItemSpec {
  id: string
  kind: ArchitecturalItemKind
  label: string
  /** Centre in plan metres. */
  xM: number
  zM: number
  widthM: number
  depthM: number
  heightM: number
  baseHeightM: number
  rotationDeg: number
  materialId: string
  color: string
}

export type DesignZoneKind = 'threshold' | 'core' | 'refuge' | 'canopy' | 'water-edge' | 'path'

export interface DesignZoneSpec {
  id: string
  name: string
  kind: DesignZoneKind
  xM: number
  zM: number
  widthM: number
  depthM: number
  ceilingHeightM: number
  exposure: 'indoor' | 'sheltered' | 'outdoor'
}

export interface SpeakerIntent {
  id: string
  profileId: string
  label: string
  xM: number
  yM: number
  zM: number
  yawDeg: number
  gainDb: number
  delayMs: number
  zoneId: string
}

export interface PlantingIntent {
  stratum: PlantStratum
  quantity: number
  rationale: string
}

export interface ArchitectureIntent {
  site: SiteContext
  footprint: { widthM: number; depthM: number }
  ceilingHeightM: number
  items: ArchitecturalItemSpec[]
  zones: DesignZoneSpec[]
  speakers: SpeakerIntent[]
  planting: PlantingIntent[]
  acoustics: {
    targetT60S: number
    targetDirectToReverberantDb: number
    targetUniformityDb: number
  }
  rationale: string[]
}

export interface SuggestedSource {
  id: string
  name: string
  zoneId: string
  positionM: [number, number, number]
  descriptor: MusicalDescriptor
  spatialization: SpatializationMode
  gainDb: number
  spreadDeg: number
  rationale: string
}

export interface ZoneSoundscape {
  zoneId: string
  name: string
  channelStart: number
  channelCount: number
  descriptor: MusicalDescriptor
  sources: SuggestedSource[]
}

export interface SoundscapeMetrics {
  volumeM3: number
  surfaceAreaM2: number
  t60S: number
  glassRatio: number
  hardRatio: number
  softRatio: number
  waterPresence: number
  canopyPresence: number
  zoneCount: number
  speakerCount: number
  listenerAreaM2: number
}

export interface SoundscapePlan {
  globalDescriptor: MusicalDescriptor
  metrics: SoundscapeMetrics
  zones: ZoneSoundscape[]
  sources: SuggestedSource[]
  spatialization: SpatializationMode
  rationale: string[]
  warnings: string[]
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
