import type { BandSeries, Provenance } from '@aura-spec/core-acoustics'
import { OCTAVE_BANDS_HZ, bandValueAt } from '@aura-spec/core-acoustics'

export type PlantStratum = 'ground-cover' | 'shrub' | 'small-tree' | 'medium-tree' | 'large-tree'
export type FoliageSize = 'small' | 'medium' | 'large'
export type LeafPersistence = 'evergreen' | 'deciduous' | 'semi-evergreen'
export type WaterNeed = 'low' | 'medium' | 'high'
export type NativeStatus = 'native' | 'mediterranean' | 'naturalised' | 'exotic'

export interface PlantAcoustics {
  absorption: BandSeries
  scattering: BandSeries
  /** Excess attenuation of a vegetation belt, dB per metre of belt depth. */
  canopyAttenuationDbPerM: BandSeries
  windNoiseSensitivity: number
  canopyHeightM: number
}

export interface PlantProfile {
  id: string
  commonName: string
  botanicalName: string
  family: string
  stratum: PlantStratum
  foliageSize: FoliageSize
  persistence: LeafPersistence
  heightM: number
  spreadM: number
  densityPerM2: number
  waterNeed: WaterNeed
  nativeStatus: NativeStatus
  climate: string[]
  soil: string[]
  acoustic: PlantAcoustics
  provenance: Provenance
  notes: string
}

export interface PlantingItem {
  profileId: string
  quantity: number
  zoneId: string
}

export interface PlantingDesign {
  id: string
  name: string
  zoneId: string
  areaM2: number
  items: PlantingItem[]
}

export interface PlantingTotals {
  totalPlants: number
  byStratum: Record<PlantStratum, number>
  byFoliage: Record<FoliageSize, number>
  canopyAreaM2: number
}

export interface PaletteAudit {
  issues: string[]
  warnings: string[]
  totals: PlantingTotals
  coverage: {
    strata: Record<PlantStratum, boolean>
    foliage: Record<FoliageSize, boolean>
    nativeRatio: number
    evergreenRatio: number
  }
}

export interface LandscapeAuditOptions {
  exposure?: 'indoor' | 'sheltered' | 'outdoor'
  minNativeRatio?: number
  minEvergreenRatio?: number
  maxCanopyOverlap?: number
}

export const REQUIRED_STRATA: PlantStratum[] = [
  'ground-cover',
  'shrub',
  'small-tree',
  'medium-tree',
  'large-tree',
]

export const REQUIRED_FOLIAGE: FoliageSize[] = ['small', 'medium', 'large']

const BANDS = [...OCTAVE_BANDS_HZ]

const PROVENANCE: Provenance = {
  source: 'AURA-SPEC landscape-culture seed',
  retrievedAt: '2026-10-22T00:00:00.000Z',
  license: 'Illustrative engineering/ecology placeholder — not a measured vegetation dataset',
  verification: 'estimated',
  notes:
    'Acoustic coefficients are design estimates for software tests. Replace with site measurements or a reviewed vegetation acoustics dataset before specification.',
}

const STRATUM_BASE: Record<
  PlantStratum,
  { absorption: number; scattering: number; attenuation: number; wind: number; canopyHeight: number }
> = {
  'ground-cover': { absorption: 0.1, scattering: 0.22, attenuation: 0.06, wind: 0.25, canopyHeight: 0.25 },
  shrub: { absorption: 0.16, scattering: 0.32, attenuation: 0.12, wind: 0.4, canopyHeight: 1.2 },
  'small-tree': { absorption: 0.2, scattering: 0.4, attenuation: 0.18, wind: 0.55, canopyHeight: 3 },
  'medium-tree': { absorption: 0.23, scattering: 0.46, attenuation: 0.23, wind: 0.65, canopyHeight: 7 },
  'large-tree': { absorption: 0.26, scattering: 0.52, attenuation: 0.3, wind: 0.75, canopyHeight: 14 },
}

const FOLIAGE_FACTOR: Record<FoliageSize, number> = { small: 0.8, medium: 1, large: 1.25 }

function series(values: number[]): BandSeries {
  return { frequenciesHz: [...BANDS], values }
}

function makeAcoustics(
  stratum: PlantStratum,
  foliage: FoliageSize,
  windOverride?: number,
): PlantAcoustics {
  const base = STRATUM_BASE[stratum]
  const factor = FOLIAGE_FACTOR[foliage]
  const absorption = BANDS.map((_, index) =>
    Math.min(0.95, base.absorption * factor + index * 0.012 * factor),
  )
  const scattering = BANDS.map((_, index) =>
    Math.min(0.95, base.scattering * factor + index * 0.018 * factor),
  )
  const attenuation = BANDS.map((_, index) =>
    Math.max(0.01, (base.attenuation + index * 0.035) * factor),
  )
  return {
    absorption: series(absorption.map(round3)),
    scattering: series(scattering.map(round3)),
    canopyAttenuationDbPerM: series(attenuation.map(round3)),
    windNoiseSensitivity: windOverride ?? base.wind,
    canopyHeightM: base.canopyHeight,
  }
}

const CATALOG: PlantProfile[] = [
  plant({
    id: 'pachysandra-terminalis',
    commonName: 'Japanese spurge',
    botanicalName: 'Pachysandra terminalis',
    family: 'Buxaceae',
    stratum: 'ground-cover',
    foliageSize: 'small',
    persistence: 'evergreen',
    heightM: 0.25,
    spreadM: 0.5,
    densityPerM2: 8,
    waterNeed: 'medium',
    nativeStatus: 'naturalised',
    climate: ['temperate', 'mediterranean-shade'],
    soil: ['humus', 'well-drained'],
    wind: 0.2,
    notes: 'Dense evergreen carpet for shaded grove edges; low wind noise.',
  }),
  plant({
    id: 'liriope-muscari',
    commonName: 'Lily turf',
    botanicalName: 'Liriope muscari',
    family: 'Asparagaceae',
    stratum: 'ground-cover',
    foliageSize: 'medium',
    persistence: 'evergreen',
    heightM: 0.4,
    spreadM: 0.45,
    densityPerM2: 6,
    waterNeed: 'low',
    nativeStatus: 'exotic',
    climate: ['mediterranean', 'temperate'],
    soil: ['loam', 'well-drained'],
    wind: 0.3,
    notes: 'Strap foliage creates a fine, dry rustle; useful under trees.',
  }),
  plant({
    id: 'thymus-serpyllum',
    commonName: 'Wild thyme',
    botanicalName: 'Thymus serpyllum',
    family: 'Lamiaceae',
    stratum: 'ground-cover',
    foliageSize: 'small',
    persistence: 'evergreen',
    heightM: 0.12,
    spreadM: 0.35,
    densityPerM2: 12,
    waterNeed: 'low',
    nativeStatus: 'native',
    climate: ['mediterranean', 'temperate'],
    soil: ['sandy', 'stony', 'well-drained'],
    wind: 0.25,
    notes: 'Aromatic ground cover for sunny, dry paving edges.',
  }),
  plant({
    id: 'viburnum-tinus',
    commonName: 'Laurustinus',
    botanicalName: 'Viburnum tinus',
    family: 'Adoxaceae',
    stratum: 'shrub',
    foliageSize: 'medium',
    persistence: 'evergreen',
    heightM: 2.4,
    spreadM: 1.8,
    densityPerM2: 1.1,
    waterNeed: 'medium',
    nativeStatus: 'mediterranean',
    climate: ['mediterranean'],
    soil: ['loam', 'clay-loam'],
    wind: 0.45,
    notes: 'Evergreen screen with dense winter structure; good mid-layer mask.',
  }),
  plant({
    id: 'laurus-nobilis',
    commonName: 'Bay laurel',
    botanicalName: 'Laurus nobilis',
    family: 'Lauraceae',
    stratum: 'shrub',
    foliageSize: 'medium',
    persistence: 'evergreen',
    heightM: 3,
    spreadM: 2,
    densityPerM2: 1,
    waterNeed: 'low',
    nativeStatus: 'mediterranean',
    climate: ['mediterranean'],
    soil: ['loam', 'stony'],
    wind: 0.5,
    notes: 'Aromatic evergreen; can be clipped into a loose acoustic hedge.',
  }),
  plant({
    id: 'hydrangea-macrophylla',
    commonName: 'Mophead hydrangea',
    botanicalName: 'Hydrangea macrophylla',
    family: 'Hydrangeaceae',
    stratum: 'shrub',
    foliageSize: 'large',
    persistence: 'deciduous',
    heightM: 1.5,
    spreadM: 1.4,
    densityPerM2: 1.4,
    waterNeed: 'high',
    nativeStatus: 'exotic',
    climate: ['temperate', 'mediterranean-shade'],
    soil: ['humus', 'moist'],
    wind: 0.35,
    notes: 'Large soft leaves; strong seasonal contrast, needs water and shelter.',
  }),
  plant({
    id: 'acer-palmatum',
    commonName: 'Japanese maple',
    botanicalName: 'Acer palmatum',
    family: 'Sapindaceae',
    stratum: 'small-tree',
    foliageSize: 'medium',
    persistence: 'deciduous',
    heightM: 4.5,
    spreadM: 3.5,
    densityPerM2: 1,
    waterNeed: 'medium',
    nativeStatus: 'exotic',
    climate: ['temperate', 'mediterranean-shade'],
    soil: ['humus', 'well-drained'],
    wind: 0.5,
    notes: 'Fine branching and layered canopy; excellent understory scale.',
  }),
  plant({
    id: 'cercis-siliquastrum',
    commonName: 'Judas tree',
    botanicalName: 'Cercis siliquastrum',
    family: 'Fabaceae',
    stratum: 'small-tree',
    foliageSize: 'medium',
    persistence: 'deciduous',
    heightM: 5,
    spreadM: 4,
    densityPerM2: 1,
    waterNeed: 'low',
    nativeStatus: 'mediterranean',
    climate: ['mediterranean'],
    soil: ['stony', 'well-drained'],
    wind: 0.55,
    notes: 'Spring blossom and broad heart-shaped leaves; a Mediterranean marker.',
  }),
  plant({
    id: 'olea-europaea',
    commonName: 'Olive',
    botanicalName: 'Olea europaea',
    family: 'Oleaceae',
    stratum: 'medium-tree',
    foliageSize: 'small',
    persistence: 'evergreen',
    heightM: 7,
    spreadM: 5,
    densityPerM2: 0.8,
    waterNeed: 'low',
    nativeStatus: 'mediterranean',
    climate: ['mediterranean'],
    soil: ['stony', 'well-drained'],
    wind: 0.7,
    notes: 'Small silver leaves and a sculptural trunk; wind-sensitive acoustic shimmer.',
  }),
  plant({
    id: 'magnolia-grandiflora',
    commonName: 'Southern magnolia',
    botanicalName: 'Magnolia grandiflora',
    family: 'Magnoliaceae',
    stratum: 'medium-tree',
    foliageSize: 'large',
    persistence: 'evergreen',
    heightM: 9,
    spreadM: 6,
    densityPerM2: 0.7,
    waterNeed: 'medium',
    nativeStatus: 'exotic',
    climate: ['mediterranean', 'temperate'],
    soil: ['humus', 'well-drained'],
    wind: 0.55,
    notes: 'Large leathery leaves; dense evergreen mass with low transparency.',
  }),
  plant({
    id: 'quercus-ilex',
    commonName: 'Holm oak',
    botanicalName: 'Quercus ilex',
    family: 'Fagaceae',
    stratum: 'large-tree',
    foliageSize: 'small',
    persistence: 'evergreen',
    heightM: 14,
    spreadM: 10,
    densityPerM2: 0.5,
    waterNeed: 'low',
    nativeStatus: 'mediterranean',
    climate: ['mediterranean'],
    soil: ['stony', 'loam'],
    wind: 0.7,
    notes: 'Permanent evergreen canopy; the structural backbone of a Mediterranean grove.',
  }),
  plant({
    id: 'tilia-cordata',
    commonName: 'Small-leaved lime',
    botanicalName: 'Tilia cordata',
    family: 'Malvaceae',
    stratum: 'large-tree',
    foliageSize: 'medium',
    persistence: 'deciduous',
    heightM: 16,
    spreadM: 9,
    densityPerM2: 0.5,
    waterNeed: 'medium',
    nativeStatus: 'native',
    climate: ['temperate'],
    soil: ['loam', 'humus'],
    wind: 0.65,
    notes: 'Dense summer canopy, strong seasonal acoustic change from leaf fall.',
  }),
  plant({
    id: 'platanus-acerifolia',
    commonName: 'London plane',
    botanicalName: 'Platanus × acerifolia',
    family: 'Platanaceae',
    stratum: 'large-tree',
    foliageSize: 'large',
    persistence: 'deciduous',
    heightM: 18,
    spreadM: 12,
    densityPerM2: 0.4,
    waterNeed: 'medium',
    nativeStatus: 'naturalised',
    climate: ['temperate', 'mediterranean'],
    soil: ['loam', 'clay-loam'],
    wind: 0.8,
    notes: 'Large leaves and high wind noise; powerful canopy but needs space and management.',
  }),
]

export const PLANT_CATALOG: PlantProfile[] = CATALOG

export function getPlantProfile(
  id: string,
  profiles: readonly PlantProfile[] = PLANT_CATALOG,
): PlantProfile | undefined {
  return profiles.find((profile) => profile.id === id)
}

export function requirePlantProfile(
  id: string,
  profiles: readonly PlantProfile[] = PLANT_CATALOG,
): PlantProfile {
  const profile = getPlantProfile(id, profiles)
  if (!profile) throw new Error(`Unknown plant profile "${id}"`)
  return profile
}

export function plantingTotals(
  design: PlantingDesign,
  profiles: readonly PlantProfile[] = PLANT_CATALOG,
): PlantingTotals {
  const byStratum: Record<PlantStratum, number> = {
    'ground-cover': 0,
    shrub: 0,
    'small-tree': 0,
    'medium-tree': 0,
    'large-tree': 0,
  }
  const byFoliage: Record<FoliageSize, number> = { small: 0, medium: 0, large: 0 }
  let totalPlants = 0
  let canopyAreaM2 = 0

  for (const item of design.items) {
    const profile = getPlantProfile(item.profileId, profiles)
    if (!profile || item.quantity <= 0) continue
    byStratum[profile.stratum] += item.quantity
    byFoliage[profile.foliageSize] += item.quantity
    totalPlants += item.quantity
    canopyAreaM2 += item.quantity * Math.PI * (profile.spreadM / 2) ** 2
  }

  return {
    totalPlants,
    byStratum,
    byFoliage,
    canopyAreaM2: Math.round(canopyAreaM2 * 10) / 10,
  }
}

export function auditLandscapePalette(
  design: PlantingDesign,
  profiles: readonly PlantProfile[] = PLANT_CATALOG,
  options: LandscapeAuditOptions = {},
): PaletteAudit {
  const issues: string[] = []
  const warnings: string[] = []
  const totals = plantingTotals(design, profiles)

  for (const item of design.items) {
    if (!getPlantProfile(item.profileId, profiles)) {
      issues.push(`Unknown plant profile "${item.profileId}" in ${design.name}`)
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      issues.push(`Invalid quantity for ${item.profileId}`)
    }
  }

  const strata = Object.fromEntries(
    REQUIRED_STRATA.map((stratum) => [stratum, totals.byStratum[stratum] > 0]),
  ) as Record<PlantStratum, boolean>
  const foliage = Object.fromEntries(
    REQUIRED_FOLIAGE.map((size) => [size, totals.byFoliage[size] > 0]),
  ) as Record<FoliageSize, boolean>

  for (const stratum of REQUIRED_STRATA) {
    if (!strata[stratum]) issues.push(`${design.name}: missing ${stratum} stratum`)
  }
  for (const size of REQUIRED_FOLIAGE) {
    if (!foliage[size]) issues.push(`${design.name}: missing ${size} foliage`)
  }

  let nativePlants = 0
  let evergreenPlants = 0
  let windSensitive = 0
  for (const item of design.items) {
    const profile = getPlantProfile(item.profileId, profiles)
    if (!profile) continue
    if (profile.nativeStatus === 'native' || profile.nativeStatus === 'mediterranean') {
      nativePlants += item.quantity
    }
    if (profile.persistence === 'evergreen' || profile.persistence === 'semi-evergreen') {
      evergreenPlants += item.quantity
    }
    if (profile.acoustic.windNoiseSensitivity > 0.7) windSensitive += item.quantity
  }

  const nativeRatio = totals.totalPlants > 0 ? nativePlants / totals.totalPlants : 0
  const evergreenRatio = totals.totalPlants > 0 ? evergreenPlants / totals.totalPlants : 0
  const minNative = options.minNativeRatio ?? 0.35
  const minEvergreen = options.minEvergreenRatio ?? 0.2
  const maxOverlap = options.maxCanopyOverlap ?? 2.5

  if (nativeRatio < minNative) {
    warnings.push(
      `${design.name}: native/Mediterranean share ${(nativeRatio * 100).toFixed(0)}% is below ${(minNative * 100).toFixed(0)}%`,
    )
  }
  if (evergreenRatio < minEvergreen) {
    warnings.push(
      `${design.name}: evergreen share ${(evergreenRatio * 100).toFixed(0)}% is below ${(minEvergreen * 100).toFixed(0)}%`,
    )
  }
  if ((options.exposure ?? 'outdoor') === 'outdoor' && windSensitive > 0) {
    warnings.push(
      `${design.name}: ${windSensitive} wind-sensitive plants may mask low-level sound in exposed zones`,
    )
  }
  if (design.areaM2 > 0 && totals.canopyAreaM2 > design.areaM2 * maxOverlap) {
    warnings.push(
      `${design.name}: canopy projection ${totals.canopyAreaM2.toFixed(1)} m² exceeds ${maxOverlap}× the planting area`,
    )
  }

  return {
    issues,
    warnings,
    totals,
    coverage: { strata, foliage, nativeRatio, evergreenRatio },
  }
}

export function vegetationAttenuationDb(
  profile: PlantProfile,
  beltDepthM: number,
  frequencyHz: number,
): number {
  return bandValueAt(profile.acoustic.canopyAttenuationDbPerM, frequencyHz) * Math.max(0, beltDepthM)
}

export function paletteAcousticSummary(
  design: PlantingDesign,
  profiles: readonly PlantProfile[] = PLANT_CATALOG,
): {
  absorption: BandSeries
  scattering: BandSeries
  canopyAttenuationDbPerM: BandSeries
} {
  const entries = design.items
    .map((item) => ({ profile: getPlantProfile(item.profileId, profiles), quantity: item.quantity }))
    .filter((entry): entry is { profile: PlantProfile; quantity: number } => entry.profile !== undefined)
  const total = Math.max(1, entries.reduce((sum, entry) => sum + entry.quantity, 0))

  return {
    absorption: weightedSeries(entries, total, (profile) => profile.acoustic.absorption),
    scattering: weightedSeries(entries, total, (profile) => profile.acoustic.scattering),
    canopyAttenuationDbPerM: weightedSeries(
      entries,
      total,
      (profile) => profile.acoustic.canopyAttenuationDbPerM,
    ),
  }
}

function weightedSeries(
  entries: readonly { profile: PlantProfile; quantity: number }[],
  total: number,
  pick: (profile: PlantProfile) => BandSeries,
): BandSeries {
  const values = BANDS.map((_, index) => {
    let sum = 0
    for (const entry of entries) {
      sum += (pick(entry.profile).values[index] ?? 0) * entry.quantity
    }
    return round3(sum / total)
  })
  return series(values)
}

function plant(input: {
  id: string
  commonName: string
  botanicalName: string
  family: string
  stratum: PlantStratum
  foliageSize: FoliageSize
  persistence: LeafPersistence
  heightM: number
  spreadM: number
  densityPerM2: number
  waterNeed: WaterNeed
  nativeStatus: NativeStatus
  climate: string[]
  soil: string[]
  wind: number
  notes: string
}): PlantProfile {
  const { wind, ...profile } = input
  return {
    ...profile,
    acoustic: makeAcoustics(input.stratum, input.foliageSize, wind),
    provenance: { ...PROVENANCE },
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function validatePlantProfile(profile: PlantProfile): string[] {
  const issues: string[] = []
  if (!profile.id) issues.push('id is required')
  if (!profile.botanicalName) issues.push('botanicalName is required')
  if (!REQUIRED_STRATA.includes(profile.stratum)) issues.push('stratum is not in the landscape ontology')
  if (!REQUIRED_FOLIAGE.includes(profile.foliageSize)) issues.push('foliageSize is not in the ontology')
  if (profile.heightM <= 0) issues.push('heightM must be positive')
  if (profile.spreadM <= 0) issues.push('spreadM must be positive')
  if (profile.densityPerM2 <= 0) issues.push('densityPerM2 must be positive')
  for (const [name, series] of Object.entries({
    absorption: profile.acoustic.absorption,
    scattering: profile.acoustic.scattering,
    attenuation: profile.acoustic.canopyAttenuationDbPerM,
  })) {
    if (series.frequenciesHz.length !== BANDS.length || series.values.length !== BANDS.length) {
      issues.push(`${name}: expected ${BANDS.length} octave bands`)
    }
    if (series.values.some((value) => !Number.isFinite(value) || value < 0)) {
      issues.push(`${name}: values must be finite and non-negative`)
    }
  }
  if (profile.acoustic.absorption.values.some((value) => value > 1)) {
    issues.push('absorption must be ≤ 1')
  }
  if (profile.acoustic.scattering.values.some((value) => value > 1)) {
    issues.push('scattering must be ≤ 1')
  }
  if (profile.acoustic.windNoiseSensitivity < 0 || profile.acoustic.windNoiseSensitivity > 1) {
    issues.push('windNoiseSensitivity must be 0–1')
  }
  return issues
}
