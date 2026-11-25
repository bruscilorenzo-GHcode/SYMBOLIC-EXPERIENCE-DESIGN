import {
  directToReverberantDb,
  estimateSti,
  meanAbsorption as areaWeightedMean,
  roomConstantM2,
  sabineT60,
} from '@aura-spec/core-acoustics'
import {
  MUSICO_CROSS_ONTOLOGY,
  PLANT_CATALOG,
  auditLandscapePalette,
  clamp,
  clamp01,
  composeCoexistence,
  descriptorLabel,
  mapReadingsToMusicalDescriptor,
  type EnvironmentalMetric,
  type EnvironmentalReading,
  type Mode,
  type MusicalDescriptor,
  type PaletteAudit,
  type Register,
  type Timbre,
  type VisitorMusicalInput,
} from '@aura-spec/landscape-culture'
import { DEFAULT_PLAY_PARAMETERS, clampUnit, normalizePlayParameters, seasonFromValue } from './parameters'
import { PLAY_SPECIES } from './progression'
import { buildIdiomScore, getIdiom } from './idioms'
import { scoreWorld } from './scoring'
import type {
  MusicalIdiomId,
  PlayAcoustics,
  PlayComposition,
  PlayEnvironmental,
  PlayGeometry,
  PlayMaterials,
  PlayMusic,
  PlayParameters,
  PlaySeason,
  PlaySocial,
  PlayVegetation,
  PlayWorld,
} from './types'

const GROUND_WIDTH_M = 24
const GROUND_DEPTH_M = 16
const GROUND_AREA_M2 = GROUND_WIDTH_M * GROUND_DEPTH_M
const BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
const FIXED_TIMESTAMP = '2026-10-23T00:00:00.000Z'
const ZONE_IDS = ['zone-grove', 'zone-river', 'zone-clearing'] as const

export interface ComposeOptions {
  /** Species unlocked by progression. Defaults to the complete base palette. */
  speciesIds?: readonly string[]
  /** Material ids unlocked by progression. */
  materialIds?: readonly string[]
  /** Generative musical world. */
  idiomId?: MusicalIdiomId
}

const BASE_SPECIES = PLAY_SPECIES.filter((species) => species.requiresCompletions === 0).map(
  (species) => species.id,
)

const BASE_MATERIAL_IDS = ['terra', 'acqua', 'pietra', 'legno', 'foglia'] as const

export function deriveGeometry(parameters: PlayParameters, season?: PlaySeason): PlayGeometry {
  const { canopy, water, stone, light, guests, wind } = parameters
  const currentSeason = season ?? seasonFromValue(parameters.season)
  const canopyRadiusM = 2.8 + canopy * 6.2
  const canopyHeightM = 3.8 + canopy * 7 + stone * 0.8
  const canopyAreaM2 = Math.PI * canopyRadiusM ** 2
  const canopyCoverage = clamp01((canopyAreaM2 / GROUND_AREA_M2) * 1.22)
  const waterRadiusM = 0.6 + water * 5.8
  const waterAreaM2 = Math.PI * waterRadiusM ** 2
  const treeCount = Math.round(3 + canopy * 22)
  const shrubCount = Math.round(8 + canopy * 24 + water * 5)
  const groundCoverCount = Math.round(38 + canopy * 74 + water * 18)
  const stoneCount = Math.round(stone * 26)
  const lanternCount = Math.round(2 + light * 10)
  const visitorOrbs = 1 + Math.floor(guests * 4)

  return {
    groundWidthM: GROUND_WIDTH_M,
    groundDepthM: GROUND_DEPTH_M,
    canopyHeightM: round(canopyHeightM, 2),
    canopyRadiusM: round(canopyRadiusM, 2),
    canopyCoverage: round(canopyCoverage, 3),
    treeCount,
    shrubCount,
    groundCoverCount,
    waterRadiusM: round(waterRadiusM, 2),
    waterAreaM2: round(waterAreaM2, 1),
    waterLevelM: round(0.035 + water * 0.03, 3),
    stoneCount,
    stoneHeightM: round(0.25 + stone * 2.6, 2),
    pathCount: Math.round(1 + stone * 7),
    lanternCount,
    visitorOrbs,
    verticality: round(clamp01(0.16 + canopy * 0.76 + stone * 0.08), 3),
    windSway: round(clamp01(0.08 + wind * 0.92 - currentSeason.leafFactor * 0.04), 3),
  }
}

export function deriveMaterials(
  parameters: PlayParameters,
  season: PlaySeason,
  materialIds: readonly string[] = BASE_MATERIAL_IDS,
): PlayMaterials {
  const { canopy, water, stone, light, guests } = parameters
  const available = new Set(materialIds)
  const candidateIds: PlayMaterials['usedMaterialIds'] = [
    'terra',
    'acqua',
    'pietra',
    'legno',
    'foglia',
    'ferro',
    'vetro',
    'specchio',
  ].filter((id) => available.has(id)) as PlayMaterials['usedMaterialIds']

  return {
    stoneRatio: round(clamp01(0.12 + stone * 0.78), 3),
    waterRatio: round(clamp01(water * 0.82), 3),
    canopyRatio: round(clamp01(canopy * 0.88), 3),
    softRatio: round(clamp01(canopy * 0.54 + water * 0.14 + season.leafFactor * 0.16), 3),
    hardRatio: round(clamp01(stone * 0.62 + light * 0.16 + guests * 0.08), 3),
    reflectivity: round(clamp01(water * 0.46 + stone * 0.22 + light * 0.2), 3),
    bloom: round(clamp01(season.bloom * (0.55 + light * 0.45)), 3),
    usedMaterialIds: candidateIds,
  }
}

export function deriveAcoustics(
  parameters: PlayParameters,
  geometry: PlayGeometry,
  season: PlaySeason,
): PlayAcoustics {
  const { canopy, water, stone, light, guests, wind } = parameters
  const canopyArea = geometry.canopyCoverage * GROUND_AREA_M2
  const waterArea = geometry.waterAreaM2
  const stoneArea = geometry.stoneCount * 1.7
  const pathArea = geometry.pathCount * 5.5
  const perimeterArea = 2 * (GROUND_WIDTH_M + GROUND_DEPTH_M) * (2.2 + canopy * 1.8)
  const airArea = 110 + (1 - canopy) * 90
  const areas = [GROUND_AREA_M2, canopyArea, waterArea, stoneArea, pathArea, perimeterArea, airArea]

  const absorptionBands = BANDS.map((_, index) => {
    const highBand = index / (BANDS.length - 1)
    const groundAbsorption = 0.17 + canopy * 0.13 + season.leafFactor * 0.018 + highBand * 0.032
    const canopyAbsorption = 0.2 + canopy * 0.34 + season.leafFactor * 0.08 + highBand * 0.04
    const waterAbsorption = 0.025 + water * 0.025 + highBand * 0.012
    const stoneAbsorption = 0.025 + stone * 0.018 + highBand * 0.006
    const pathAbsorption = 0.04 + stone * 0.035 + highBand * 0.012
    const perimeterAbsorption = 0.1 + wind * 0.04 + highBand * 0.03
    const airAbsorption = 0.012 + wind * 0.02 + highBand * 0.028
    return areaWeightedMean(
      areas.map((area, areaIndex) => ({
        areaM2: area,
        absorption: [
          groundAbsorption,
          canopyAbsorption,
          waterAbsorption,
          stoneAbsorption,
          pathAbsorption,
          perimeterAbsorption,
          airAbsorption,
        ][areaIndex]!,
      })),
    )
  })

  const scatteringBands = BANDS.map((_, index) => {
    const highBand = index / (BANDS.length - 1)
    return clamp(
      0.12 +
        canopy * 0.42 +
        stone * 0.13 +
        water * 0.08 +
        wind * 0.06 +
        season.leafFactor * 0.05 +
        highBand * 0.16,
      0,
      0.98,
    )
  })

  const meanAbs = absorptionBands[4] ?? 0.15
  const meanScattering = scatteringBands[4] ?? 0.25
  const volumeM3 = GROUND_AREA_M2 * (1.85 + canopy * 3.9 + stone * 0.18)
  const totalSurfaceArea = Math.max(1, areas.reduce((sum, area) => sum + area, 0))
  const t60 = clamp(sabineT60(volumeM3, totalSurfaceArea, meanAbs), 0.12, 8)
  const roomConstant = roomConstantM2(totalSurfaceArea, meanAbs)
  const directDistanceM = 7.5
  const directDb = directToReverberantDb(1, directDistanceM, roomConstant)
  const snrDb = 22 - wind * 4.6 - guests * 4.2 - water * 2.4 + canopy * 3.1 - stone * 2.1
  const sti = estimateSti({ t60S: t60, snrDb }).sti
  const crowdMasking = clamp01(guests * 0.4 + (geometry.visitorOrbs / 6) * 0.18)
  const windMasking = clamp01(wind * (0.52 - canopy * 0.16) + (1 - canopy) * 0.08)
  const waterMasking = clamp01(
    0.04 + wind * 0.2 + guests * 0.23 + (1 - canopy) * 0.12 + stone * 0.06 - water * 0.16,
  )
  const directScore = clamp01((directDb + 15) / 30)
  const clarity = clamp01(
    0.18 +
      directScore * 0.35 +
      (1 - windMasking) * 0.12 +
      (1 - crowdMasking) * 0.11 +
      canopy * 0.08 -
      waterMasking * 0.18 +
      light * 0.04,
  )
  const spatialClarity = clamp01(
    clarity * 0.58 +
      sti * 0.25 +
      directScore * 0.15 -
      crowdMasking * 0.05 -
      windMasking * 0.04,
  )
  const noiseFloorDb = 27 + guests * 31 + wind * 12 + water * 4 - canopy * 3

  return {
    volumeM3: round(volumeM3, 1),
    surfaceAreaM2: round(totalSurfaceArea, 1),
    meanAbsorption: round(meanAbs, 3),
    meanScattering: round(meanScattering, 3),
    t60S: round(t60, 2),
    roomConstantM2: round(roomConstant, 1),
    directToReverberantDb: round(directDb, 2),
    clarity: round(clarity, 3),
    sti: round(sti, 3),
    intelligibility: round(sti, 3),
    spatialClarity: round(spatialClarity, 3),
    waterMasking: round(waterMasking, 3),
    windMasking: round(windMasking, 3),
    crowdMasking: round(crowdMasking, 3),
    noiseFloorDb: round(noiseFloorDb, 1),
    absorptionBands: absorptionBands.map((value) => round(value, 3)),
    scatteringBands: scatteringBands.map((value) => round(value, 3)),
    method: 'sabine-estimate',
  }
}

export function deriveEnvironmental(
  parameters: PlayParameters,
  season: PlaySeason,
  geometry: PlayGeometry,
): PlayEnvironmental {
  const { canopy, water, stone, light, guests, wind } = parameters
  const dust = clamp01(
    stone * 0.58 +
      (1 - wind) * 0.24 +
      (1 - water) * 0.1 +
      (season.phase === 'riposo' ? 0.12 : 0.03) +
      0.02,
  )
  const pollutionIndex = clamp01(dust * 0.84 + guests * 0.09)
  const airQuality = clamp01(1 - pollutionIndex)
  const waterPollution = clamp01(
    0.04 + stone * 0.36 + (1 - wind) * 0.16 + guests * 0.12 - water * 0.08,
  )
  const waterQuality = clamp01(1 - waterPollution)
  const pm25 = round(7 + dust * 74, 1)
  const no2 = round(8 + dust * 118 + guests * 16, 1)
  const turbidity = round(2 + stone * 42 + (1 - wind) * 18 + guests * 7, 1)
  const oxygen = round(clamp(10.5 - waterPollution * 8.4 + water * 2.1, 0.5, 14), 2)
  const ph = round(6.2 + water * 1.4 + stone * 0.15, 2)
  const temperatureC = round(season.temperatureC + light * 2.8 - canopy * 1.5, 1)
  const humidity = round(clamp(32 + water * 42 + (1 - light) * 13 + canopy * 7, 0, 100), 1)
  const par = round(clamp(80 + light * 1800 * (1 - canopy * 0.42) * (0.75 + season.leafFactor * 0.25), 0, 2200), 0)
  const noise = round(clamp(27 + guests * 39 + wind * 11 + stone * 4, 25, 92), 1)
  const flow = round(water * 5.8 + wind * 2.2, 2)

  const readings: EnvironmentalReading[] = [
    reading('air-pm25', 'air.pm25', pm25, 'µg/m³', 0, 100, 'zone-grove'),
    reading('air-no2', 'air.no2', no2, 'µg/m³', 0, 200, 'zone-river'),
    reading('air-index', 'air.pollutionIndex', pollutionIndex, 'index 0–1', 0, 1, 'zone-grove'),
    reading('water-pollution', 'water.pollutionIndex', waterPollution, 'index 0–1', 0, 1, 'zone-river'),
    reading('water-oxygen', 'water.dissolvedOxygen', oxygen, 'mg/L', 0, 14, 'zone-river'),
    reading('water-turbidity', 'water.turbidity', turbidity, 'NTU', 0, 100, 'zone-river'),
    reading('water-ph', 'water.ph', ph, 'pH', 4, 10, 'zone-river'),
    reading('weather-temperature', 'weather.temperature', temperatureC, '°C', -10, 40, 'zone-clearing'),
    reading('weather-humidity', 'weather.humidity', humidity, '%', 0, 100, 'zone-clearing'),
    reading('light-par', 'light.par', par, 'µmol/m²/s', 0, 2000, 'zone-grove'),
    reading('flow-rate', 'flow.rate', flow, 'm³/s', 0, 10, 'zone-river'),
    reading('noise-laeq', 'noise.laeq', noise, 'dB(A)', 30, 90, 'zone-clearing'),
  ]

  const dataToMusic = mapReadingsToMusicalDescriptor(readings, MUSICO_CROSS_ONTOLOGY)
  const controls = Object.entries(dataToMusic.controls)
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => Math.abs((b[1] as number) - 0.5) - Math.abs((a[1] as number) - 0.5))
  const dominantMetric =
    controls.length > 0
      ? `${controls[0]![0]} ${(controls[0]![1] as number).toFixed(2)}`
      : 'nessun segnale dominante'

  return {
    readings,
    dataToMusic,
    pollutionIndex: round(pollutionIndex, 3),
    airQuality: round(airQuality, 3),
    waterQuality: round(waterQuality, 3),
    lightLevel: round(clamp01(par / 2000), 3),
    temperatureC,
    humidityPct: humidity,
    dominantMetric,
  }
}

export function deriveMusic(
  parameters: PlayParameters,
  environmental: PlayEnvironmental,
  acoustics: PlayAcoustics,
  idiomId: MusicalIdiomId = 'soundscape',
): PlayMusic {
  const { canopy, water, stone, light, guests, season, wind } = parameters
  const dataDescriptor = environmental.dataToMusic.descriptor
  const mode = chooseMode(parameters, environmental)
  const register = chooseRegister(parameters)
  const timbre = chooseTimbre(parameters)
  const idiom = getIdiom(idiomId)
  const baseTempo = clamp(
    dataDescriptor.tempoBpm * 0.42 + 43 + season * 21 + guests * 9 - canopy * 6 + wind * 5,
    38,
    138,
  )
  const tempo = Math.min(
    120,
    idiom.id === 'soundscape'
      ? baseTempo
      : clamp(idiom.tempoHint + (baseTempo - 80) * 0.22, 40, 120),
  )
  const density = clamp01(
    dataDescriptor.density * 0.48 + guests * 0.3 + water * 0.18 + light * 0.12 - canopy * 0.12,
  )
  const nightLift = water * (1 - light) * 0.22
  const brightness = clamp01(
    dataDescriptor.brightness * 0.42 +
      light * 0.32 +
      water * 0.24 +
      stone * 0.09 -
      canopy * 0.15 -
      environmental.pollutionIndex * 0.1 +
      nightLift,
  )
  const roughness = clamp01(
    dataDescriptor.roughness * 0.48 +
      stone * 0.18 +
      wind * 0.18 +
      environmental.pollutionIndex * 0.28 -
      water * 0.1,
  )
  const pulse = clamp01(0.16 + guests * 0.5 + wind * 0.26 + (1 - canopy) * 0.16)
  const spread = Math.round(52 + canopy * 92 + guests * 28)
  const descriptor: MusicalDescriptor = {
    ...dataDescriptor,
    tonicPc: dataDescriptor.tonicPc,
    mode,
    tempoBpm: Math.round(tempo * 10) / 10,
    meter: [4, 4],
    register,
    density: round(density, 2),
    brightness: round(brightness, 2),
    roughness: round(roughness, 2),
    timbre,
  }
  const dataWeight = clamp01(
    0.22 +
      (environmental.dataToMusic.usedReadings.length /
        Math.max(1, environmental.readings.length)) *
        0.55 +
      (1 - environmental.pollutionIndex) * 0.1,
  )

  const idiomScore = buildIdiomScore(
    {
      tonicPc: descriptor.tonicPc,
      tempoBpm: descriptor.tempoBpm,
      density: descriptor.density,
      brightness: descriptor.brightness,
      roughness: descriptor.roughness,
      register: descriptor.register,
      seed: Math.round(descriptor.tonicPc * 131 + descriptor.tempoBpm * 17 + parameters.canopy * 1000),
    },
    idiomId,
  )

  return {
    descriptor,
    register,
    mode,
    timbre,
    pulse: round(pulse, 3),
    spread,
    dataWeight: round(dataWeight, 3),
    descriptorLabel: descriptorLabel(descriptor),
    idiomId,
    idiom,
    idiomScore,
  }
}

export function deriveSocial(
  parameters: PlayParameters,
  music: PlayMusic,
  acoustics: PlayAcoustics,
  environmental: PlayEnvironmental,
): PlaySocial {
  const { canopy, water, stone, guests, light, season } = parameters
  const visitorCount = 1 + Math.floor(guests * 4)
  const offsets = [0, 5, 9, 2, 7]
  const modes: Mode[] = ['dorian', 'aeolian', 'lydian', 'phrygian', 'mixolydian']
  const registers: Register[] = ['mid', 'low', 'high', 'mid', 'high']
  const timbres: Timbre[] = ['woody', 'fluid', 'airy', 'stone', 'vocal']
  const visitorInputs: VisitorMusicalInput[] = Array.from({ length: visitorCount }, (_, index) => {
    const descriptor: MusicalDescriptor = {
      ...music.descriptor,
      tonicPc: (music.descriptor.tonicPc + offsets[index % offsets.length]!) % 12,
      mode: modes[(index + Math.floor(season * 2)) % modes.length]!,
      tempoBpm: clamp(
        Math.round(music.descriptor.tempoBpm + (index - 2) * 4 + (index % 2 === 0 ? 2 : -2)),
        38,
        160,
      ),
      register: registers[index % registers.length]!,
      density: round(clamp01(music.descriptor.density * (0.82 + index * 0.08) + guests * 0.1), 2),
      brightness: round(clamp01(music.descriptor.brightness + index * 0.02 - 0.02), 2),
      roughness: round(clamp01(music.descriptor.roughness + (index % 3) * 0.025), 2),
      timbre: timbres[index % timbres.length]!,
    }
    return {
      id: `visitor-${index + 1}`,
      visitorId: `ospite-${index + 1}`,
      zoneId: ZONE_IDS[index % ZONE_IDS.length]!,
      descriptor,
      durationS: 18 + index * 4,
      priority: round(1.25 - index * 0.12, 2),
    }
  })

  const coexistence = composeCoexistence(visitorInputs, {
    maxDensity: 1,
    maxTempoDriftPct: 7,
    maxTranspositionSemitones: 6,
    channelCount: 12,
  })
  const distinctKeys = new Set(visitorInputs.map((input) => input.descriptor.tonicPc)).size
  const roles = [...new Set(coexistence.zoneMixes.map((mix) => mix.role))]
  const warningPenalty = Math.min(0.28, coexistence.warnings.length * 0.045)
  const keyDiversity = distinctKeys / Math.max(1, visitorCount)
  const roleDiversity = roles.length / 4
  const inclusion = clamp01(
    0.16 +
      keyDiversity * 0.28 +
      roleDiversity * 0.22 +
      Math.min(visitorCount / 4, 1) * 0.22 +
      guests * 0.1 -
      warningPenalty,
  )
  const noiseLevel = environmental.readings.find((item) => item.metric === 'noise.laeq')?.value ?? 30
  const crowding = clamp01(
    guests * 0.55 +
      noiseLevel / 200 -
      canopy * 0.1 -
      water * 0.08 -
      stone * 0.02,
  )
  const refuge = clamp01(canopy * 0.48 + (1 - light) * 0.24 + (1 - guests) * 0.16 + (1 - water) * 0.04)
  const waterAudibility = clamp01(water * (0.88 + canopy * 0.16) - acoustics.windMasking * 0.12 - acoustics.crowdMasking * 0.08)

  return {
    visitorCount,
    visitorInputs,
    coexistence,
    distinctKeys,
    roles,
    inclusion: round(inclusion, 3),
    crowding: round(crowding, 3),
    refuge: round(refuge, 3),
    waterAudibility: round(waterAudibility, 3),
  }
}

export function deriveVegetation(
  parameters: PlayParameters,
  season: PlaySeason,
  speciesIds: readonly string[] = BASE_SPECIES,
): PlayVegetation {
  const available = new Set(speciesIds.filter((id) => PLAY_SPECIES.some((species) => species.id === id)))
  if (available.size === 0) for (const id of BASE_SPECIES) available.add(id)
  const pick = (...ids: string[]): string => ids.find((id) => available.has(id)) ?? BASE_SPECIES[0]!
  const { canopy, water, stone, light } = parameters
  const leaf = 0.72 + season.leafFactor * 0.28

  const grove: PlayVegetation['designs'][number] = {
    id: 'planting-grove',
    name: 'Bosco delle ombre lunghe',
    zoneId: 'zone-grove',
    areaM2: 420,
    items: [
      {
        profileId: pick('pachysandra-terminalis', 'thymus-serpyllum', 'liriope-muscari'),
        quantity: Math.max(12, Math.round((46 + canopy * 82 + water * 12) * leaf)),
        zoneId: 'zone-grove',
      },
      {
        profileId: pick('viburnum-tinus', 'laurus-nobilis'),
        quantity: Math.max(4, Math.round((6 + canopy * 11 + stone * 2) * leaf)),
        zoneId: 'zone-grove',
      },
      {
        profileId: pick('acer-palmatum', 'cercis-siliquastrum'),
        quantity: Math.max(1, Math.round(2 + canopy * 4)),
        zoneId: 'zone-grove',
      },
      {
        profileId: pick('olea-europaea', 'magnolia-grandiflora'),
        quantity: Math.max(1, Math.round(1 + canopy * 3 + stone * 2)),
        zoneId: 'zone-grove',
      },
      {
        profileId: pick('quercus-ilex', 'tilia-cordata', 'platanus-acerifolia'),
        quantity: Math.max(1, Math.round(1 + canopy * 2)),
        zoneId: 'zone-grove',
      },
    ],
  }

  const river: PlayVegetation['designs'][number] = {
    id: 'planting-river',
    name: 'Riva che ascolta',
    zoneId: 'zone-river',
    areaM2: 260,
    items: [
      {
        profileId: pick('liriope-muscari', 'thymus-serpyllum'),
        quantity: Math.max(8, Math.round(30 + water * 44 + light * 12)),
        zoneId: 'zone-river',
      },
      {
        profileId: pick('hydrangea-macrophylla', 'laurus-nobilis'),
        quantity: Math.max(1, Math.round(2 + water * 5 + season.bloom * 3)),
        zoneId: 'zone-river',
      },
      {
        profileId: pick('cercis-siliquastrum', 'acer-palmatum'),
        quantity: Math.max(1, Math.round(1 + water * 3)),
        zoneId: 'zone-river',
      },
      {
        profileId: pick('magnolia-grandiflora', 'olea-europaea'),
        quantity: Math.max(1, Math.round(1 + water * 2 + canopy * 2)),
        zoneId: 'zone-river',
      },
      {
        profileId: pick('tilia-cordata', 'platanus-acerifolia', 'quercus-ilex'),
        quantity: Math.max(1, Math.round(1 + water * 2)),
        zoneId: 'zone-river',
      },
    ],
  }

  const clearing: PlayVegetation['designs'][number] = {
    id: 'planting-clearing',
    name: 'Radura dei cori',
    zoneId: 'zone-clearing',
    areaM2: 120,
    items: [
      {
        profileId: pick('thymus-serpyllum', 'pachysandra-terminalis'),
        quantity: Math.max(8, Math.round(22 + light * 35 + canopy * 10)),
        zoneId: 'zone-clearing',
      },
      {
        profileId: pick('laurus-nobilis', 'viburnum-tinus', 'hydrangea-macrophylla'),
        quantity: Math.max(2, Math.round(3 + light * 4)),
        zoneId: 'zone-clearing',
      },
      {
        profileId: pick('acer-palmatum', 'cercis-siliquastrum'),
        quantity: Math.max(1, Math.round(1 + light * 2)),
        zoneId: 'zone-clearing',
      },
      {
        profileId: pick('magnolia-grandiflora', 'olea-europaea'),
        quantity: 1,
        zoneId: 'zone-clearing',
      },
      {
        profileId: pick('quercus-ilex', 'tilia-cordata', 'platanus-acerifolia'),
        quantity: Math.max(1, Math.round(1 + canopy * 2)),
        zoneId: 'zone-clearing',
      },
    ],
  }

  const designs = [grove, river, clearing]
  const audits: Record<string, PaletteAudit> = {}
  for (const design of designs) {
    audits[design.id] = auditLandscapePalette(design, PLANT_CATALOG, {
      exposure: design.zoneId === 'zone-clearing' ? 'sheltered' : 'outdoor',
    })
  }

  const strata: PlayVegetation['strata'] = {
    'ground-cover': 0,
    shrub: 0,
    'small-tree': 0,
    'medium-tree': 0,
    'large-tree': 0,
  }
  const foliage: PlayVegetation['foliage'] = { small: 0, medium: 0, large: 0 }
  let totalPlants = 0
  let nativePlants = 0
  let evergreenPlants = 0
  let canopyProjectionM2 = 0

  for (const design of designs) {
    const audit = audits[design.id]!
    for (const stratum of Object.keys(strata) as Array<keyof typeof strata>) {
      strata[stratum] += audit.totals.byStratum[stratum]
    }
    for (const size of Object.keys(foliage) as Array<keyof typeof foliage>) {
      foliage[size] += audit.totals.byFoliage[size]
    }
    totalPlants += audit.totals.totalPlants
    nativePlants += audit.coverage.nativeRatio * audit.totals.totalPlants
    evergreenPlants += audit.coverage.evergreenRatio * audit.totals.totalPlants
    canopyProjectionM2 += audit.totals.canopyAreaM2
  }

  const strataCovered = Object.values(strata).filter((value) => value > 0).length / 5
  const foliageCovered = Object.values(foliage).filter((value) => value > 0).length / 3
  const nativeRatio = totalPlants > 0 ? nativePlants / totalPlants : 0
  const evergreenRatio = totalPlants > 0 ? evergreenPlants / totalPlants : 0
  const issuePenalty = designs.reduce((sum, design) => sum + audits[design.id]!.issues.length, 0) * 0.08
  const waterBalance = 1 - Math.abs(water - 0.52) * 0.62
  const ecologicalBalance = clamp01(
    0.1 +
      strataCovered * 0.25 +
      foliageCovered * 0.14 +
      nativeRatio * 0.18 +
      evergreenRatio * 0.14 +
      waterBalance * 0.1 +
      (season.leafFactor * 0.08) -
      issuePenalty,
  )
  const speciesUsed = [...new Set(designs.flatMap((design) => design.items.map((item) => item.profileId)))]

  return {
    designs,
    audits,
    strata,
    foliage,
    speciesIds: speciesUsed,
    nativeRatio: round(nativeRatio, 3),
    evergreenRatio: round(evergreenRatio, 3),
    canopyProjectionM2: round(canopyProjectionM2, 1),
    ecologicalBalance: round(ecologicalBalance, 3),
  }
}

export function composeWorld(parameters: PlayParameters, options: ComposeOptions = {}): PlayWorld {
  const normalized = normalizePlayParameters(parameters)
  const season = seasonFromValue(normalized.season)
  const geometry = deriveGeometry(normalized, season)
  const materials = deriveMaterials(
    normalized,
    season,
    options.materialIds ?? BASE_MATERIAL_IDS,
  )
  const acoustics = deriveAcoustics(normalized, geometry, season)
  const environmental = deriveEnvironmental(normalized, season, geometry)
  const music = deriveMusic(normalized, environmental, acoustics, options.idiomId)
  const social = deriveSocial(normalized, music, acoustics, environmental)
  const vegetation = deriveVegetation(normalized, season, options.speciesIds ?? BASE_SPECIES)

  return {
    parameters: normalized,
    season,
    geometry,
    materials,
    acoustics,
    music,
    environmental,
    social,
    vegetation,
  }
}

export function composePlay(parameters: PlayParameters, options: ComposeOptions = {}): PlayComposition {
  const world = composeWorld(parameters, options)
  return { ...world, scores: scoreWorld(world) }
}

export function composeDefaultPlay(): PlayComposition {
  return composePlay(DEFAULT_PLAY_PARAMETERS)
}

function chooseMode(parameters: PlayParameters, environmental: PlayEnvironmental): Mode {
  const { canopy, water, stone, light, guests, wind } = parameters
  if (environmental.pollutionIndex > 0.58) return 'phrygian'
  if (light > 0.78 && water > 0.45) return 'lydian'
  if (canopy > 0.68) return 'aeolian'
  if (water > 0.65) return 'ionian'
  if (guests > 0.62) return 'mixolydian'
  if (stone > 0.58) return 'dorian'
  if (wind > 0.6) return 'mixolydian'
  return 'dorian'
}

function chooseRegister(parameters: PlayParameters): Register {
  const { canopy, stone, light, water } = parameters
  if (canopy > 0.6 || stone > 0.62) return 'low'
  if (canopy < 0.32 && light > 0.64) return 'high'
  if (water > 0.7 && canopy < 0.45) return 'high'
  return 'mid'
}

function chooseTimbre(parameters: PlayParameters): Timbre {
  const { canopy, water, stone, light, guests, wind } = parameters
  if (water > 0.62) return 'fluid'
  if (stone > 0.6) return 'stone'
  if (guests > 0.62) return 'vocal'
  if (wind > 0.62) return 'granular'
  if (light > 0.72) return 'airy'
  if (canopy > 0.58) return 'woody'
  return 'hybrid'
}

function reading(
  id: string,
  metric: EnvironmentalMetric,
  value: number,
  unit: string,
  min: number,
  max: number,
  zoneId: string,
): EnvironmentalReading {
  return {
    id,
    metric,
    value: round(value, 2),
    unit,
    min,
    max,
    zoneId,
    timestamp: FIXED_TIMESTAMP,
    quality: id === 'air-no2' || id === 'water-pollution' ? 'modelled' : 'measured',
  }
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
