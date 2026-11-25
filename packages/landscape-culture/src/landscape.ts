import type { LandscapeZone } from './landscape-types'
import type { CoexistencePolicy, VisitorMusicalInput } from './orchestration'
import type { EnvironmentalReading, ZoneSonification } from './data-to-music'
import type { PlantingDesign, PlantProfile } from './planting'
import type { TextualVisitorInput, MetaCompositionDraft } from './textual'
import type { WiringPlan, WiringRequest } from './wiring'
import { PLANT_CATALOG, auditLandscapePalette, type PaletteAudit } from './planting'
import { chooseWiringPlan } from './wiring'
import { composeCoexistence, type CoexistenceResult } from './orchestration'
import { MUSICO_CROSS_ONTOLOGY, sonifyZones } from './data-to-music'
import {
  buildMetaCompositionRequest,
  ruleBasedMetaComposer,
  validateMetaCompositionDraft,
} from './textual'

export interface LandscapeCultureScenario {
  id: string
  name: string
  zones: LandscapeZone[]
  planting: PlantingDesign[]
  wiringRequests: WiringRequest[]
  visitorInputs: VisitorMusicalInput[]
  textualInputs: TextualVisitorInput[]
  environmentalReadings: EnvironmentalReading[]
  policy: CoexistencePolicy
}

export interface LandscapeCultureAudit {
  scenarioId: string
  palette: Record<string, PaletteAudit>
  wiring: WiringPlan[]
  coexistence: CoexistenceResult
  dataToMusic: ZoneSonification[]
  textual: {
    draft: MetaCompositionDraft
    issues: string[]
  }
  issues: string[]
  warnings: string[]
}

/**
 * One deterministic audit for a landscape-culture scenario. This is the
 * "test of cultural completeness" for a Giardino Sonoro: the planting palette
 * must have vertical strata and foliage variety, the wiring must fit the zone,
 * the visitors' musical claims must coexist, and the environmental data must
 * have a coherent DATA→MUSIC reading in every zone.
 */
export function auditLandscapeCulture(
  scenario: LandscapeCultureScenario,
  profiles: readonly PlantProfile[] = PLANT_CATALOG,
): LandscapeCultureAudit {
  const issues: string[] = []
  const warnings: string[] = []
  const zoneIds = new Set(scenario.zones.map((zone) => zone.id))

  const sortedZones = [...scenario.zones].sort((a, b) => a.channelStart - b.channelStart)
  for (let index = 0; index < sortedZones.length; index += 1) {
    const zone = sortedZones[index]!
    if (zone.channelStart < 0 || zone.channelCount <= 0) {
      issues.push(`${zone.id}: invalid channel span`)
    }
    if (zone.channelStart + zone.channelCount > scenario.policy.channelCount) {
      issues.push(`${zone.id}: channel span exceeds ${scenario.policy.channelCount} channels`)
    }
    const previous = sortedZones[index - 1]
    if (previous && previous.channelStart + previous.channelCount > zone.channelStart) {
      issues.push(`${previous.id} and ${zone.id}: overlapping channel spans`)
    }
  }

  const palette: Record<string, PaletteAudit> = {}
  for (const design of scenario.planting) {
    if (!zoneIds.has(design.zoneId)) issues.push(`Planting design "${design.id}" references unknown zone "${design.zoneId}"`)
    for (const item of design.items) {
      if (!zoneIds.has(item.zoneId)) issues.push(`Planting item "${item.profileId}" references unknown zone "${item.zoneId}"`)
      if (item.zoneId !== design.zoneId) {
        warnings.push(`Planting item "${item.profileId}" is assigned to ${item.zoneId} but lives in ${design.id}`)
      }
    }
    const zone = scenario.zones.find((item) => item.id === design.zoneId)
    const audit = auditLandscapePalette(design, profiles, { exposure: zone?.exposure ?? 'outdoor' })
    palette[design.id] = audit
    issues.push(...audit.issues)
    warnings.push(...audit.warnings)
  }

  const wiring = scenario.wiringRequests.map((request) => {
    if (!zoneIds.has(request.zoneId)) issues.push(`Wiring request references unknown zone "${request.zoneId}"`)
    return chooseWiringPlan(request)
  })
  for (const plan of wiring) {
    warnings.push(...plan.warnings.map((warning) => `${plan.zoneId}: ${warning}`))
  }

  for (const input of scenario.visitorInputs) {
    if (!zoneIds.has(input.zoneId)) issues.push(`Visitor input "${input.id}" references unknown zone "${input.zoneId}"`)
  }
  for (const input of scenario.textualInputs) {
    if (!zoneIds.has(input.zoneId)) issues.push(`Textual input "${input.id}" references unknown zone "${input.zoneId}"`)
  }
  for (const reading of scenario.environmentalReadings) {
    if (!zoneIds.has(reading.zoneId)) warnings.push(`Environmental reading "${reading.id}" references unknown zone "${reading.zoneId}"`)
  }

  const coexistence = composeCoexistence(scenario.visitorInputs, scenario.policy)
  warnings.push(...coexistence.warnings)

  const dataToMusic = sonifyZones(
    scenario.environmentalReadings,
    scenario.zones,
    MUSICO_CROSS_ONTOLOGY,
  )
  for (const zone of dataToMusic) {
    warnings.push(...zone.result.warnings.map((warning) => `${zone.zoneId}: ${warning}`))
  }

  const request = buildMetaCompositionRequest(
    scenario.textualInputs,
    scenario.zones,
    scenario.policy,
    {
      palette: [...new Set(scenario.planting.flatMap((design) => design.items.map((item) => item.profileId)))],
      dataOntologyId: MUSICO_CROSS_ONTOLOGY.id,
      dataOntologyNote: MUSICO_CROSS_ONTOLOGY.note,
    },
  )
  const draft = ruleBasedMetaComposer(request)
  const textualIssues = validateMetaCompositionDraft(draft, request)
  issues.push(...textualIssues)

  return {
    scenarioId: scenario.id,
    palette,
    wiring,
    coexistence,
    dataToMusic,
    textual: { draft, issues: textualIssues },
    issues: [...new Set(issues)],
    warnings: [...new Set(warnings)],
  }
}

const ZONES: LandscapeZone[] = [
  {
    id: 'zone-grove',
    name: 'Holm-oak grove',
    kind: 'grove',
    channelStart: 0,
    channelCount: 4,
    exposure: 'outdoor',
    areaM2: 420,
  },
  {
    id: 'zone-river',
    name: 'River terrace',
    kind: 'river',
    channelStart: 4,
    channelCount: 4,
    exposure: 'outdoor',
    areaM2: 260,
  },
  {
    id: 'zone-clearing',
    name: 'Sheltered clearing',
    kind: 'clearing',
    channelStart: 8,
    channelCount: 2,
    exposure: 'sheltered',
    areaM2: 120,
  },
]

export const GIARDINO_SONORO_DEMO: LandscapeCultureScenario = {
  id: 'giardino-sonoro-demo',
  name: 'Giardino Sonoro · landscape culture reference',
  zones: ZONES,
  planting: [
    {
      id: 'planting-grove',
      name: 'Grove understory and canopy',
      zoneId: 'zone-grove',
      areaM2: 420,
      items: [
        { profileId: 'pachysandra-terminalis', quantity: 80, zoneId: 'zone-grove' },
        { profileId: 'viburnum-tinus', quantity: 12, zoneId: 'zone-grove' },
        { profileId: 'acer-palmatum', quantity: 4, zoneId: 'zone-grove' },
        { profileId: 'magnolia-grandiflora', quantity: 2, zoneId: 'zone-grove' },
        { profileId: 'quercus-ilex', quantity: 2, zoneId: 'zone-grove' },
      ],
    },
    {
      id: 'planting-river',
      name: 'River terrace edge',
      zoneId: 'zone-river',
      areaM2: 260,
      items: [
        { profileId: 'thymus-serpyllum', quantity: 50, zoneId: 'zone-river' },
        { profileId: 'laurus-nobilis', quantity: 10, zoneId: 'zone-river' },
        { profileId: 'hydrangea-macrophylla', quantity: 4, zoneId: 'zone-river' },
        { profileId: 'cercis-siliquastrum', quantity: 3, zoneId: 'zone-river' },
        { profileId: 'olea-europaea', quantity: 2, zoneId: 'zone-river' },
        { profileId: 'tilia-cordata', quantity: 1, zoneId: 'zone-river' },
      ],
    },
    {
      id: 'planting-clearing',
      name: 'Sheltered clearing',
      zoneId: 'zone-clearing',
      areaM2: 120,
      items: [
        { profileId: 'thymus-serpyllum', quantity: 40, zoneId: 'zone-clearing' },
        { profileId: 'laurus-nobilis', quantity: 6, zoneId: 'zone-clearing' },
        { profileId: 'acer-palmatum', quantity: 2, zoneId: 'zone-clearing' },
        { profileId: 'magnolia-grandiflora', quantity: 1, zoneId: 'zone-clearing' },
        { profileId: 'platanus-acerifolia', quantity: 1, zoneId: 'zone-clearing' },
      ],
    },
  ],
  wiringRequests: [
    {
      zoneId: 'zone-grove',
      channelCount: 4,
      maxRunM: 60,
      latencyTargetMs: 20,
      sampleSynchronous: true,
      exposure: 'outdoor',
      budget: 'medium',
    },
    {
      zoneId: 'zone-river',
      channelCount: 4,
      maxRunM: 80,
      latencyTargetMs: 20,
      sampleSynchronous: true,
      exposure: 'outdoor',
      budget: 'medium',
    },
    {
      zoneId: 'zone-clearing',
      channelCount: 2,
      maxRunM: 15,
      latencyTargetMs: 200,
      sampleSynchronous: false,
      exposure: 'sheltered',
      budget: 'low',
      heritageConstraint: true,
    },
  ],
  visitorInputs: [
    {
      id: 'visitor-1',
      visitorId: 'v1',
      zoneId: 'zone-grove',
      descriptor: {
        tonicPc: 0,
        mode: 'dorian',
        tempoBpm: 72,
        meter: [4, 4],
        register: 'mid',
        density: 0.55,
        brightness: 0.5,
        roughness: 0.3,
        timbre: 'woody',
      },
      durationS: 24,
      priority: 1.3,
    },
    {
      id: 'visitor-2',
      visitorId: 'v2',
      zoneId: 'zone-river',
      descriptor: {
        tonicPc: 9,
        mode: 'aeolian',
        tempoBpm: 84,
        meter: [4, 4],
        register: 'mid',
        density: 0.6,
        brightness: 0.6,
        roughness: 0.25,
        timbre: 'fluid',
      },
      durationS: 18,
      priority: 1,
    },
    {
      id: 'visitor-3',
      visitorId: 'v3',
      zoneId: 'zone-grove',
      descriptor: {
        tonicPc: 5,
        mode: 'ionian',
        tempoBpm: 76,
        meter: [4, 4],
        register: 'high',
        density: 0.4,
        brightness: 0.65,
        roughness: 0.2,
        timbre: 'airy',
      },
      durationS: 16,
      priority: 0.8,
    },
    {
      id: 'visitor-4',
      visitorId: 'v4',
      zoneId: 'zone-clearing',
      descriptor: {
        tonicPc: 2,
        mode: 'dorian',
        tempoBpm: 60,
        meter: [4, 4],
        register: 'low',
        density: 0.22,
        brightness: 0.35,
        roughness: 0.45,
        timbre: 'stone',
      },
      durationS: 30,
      priority: 0.7,
    },
  ],
  textualInputs: [
    {
      id: 'text-1',
      visitorId: 'v1',
      zoneId: 'zone-grove',
      text: 'I hear the holm oaks, the wind moving through small leaves, and a distant stone wall.',
      language: 'en',
      priority: 1.2,
    },
    {
      id: 'text-2',
      visitorId: 'v2',
      zoneId: 'zone-river',
      text: 'The river is dark and carries stones; the water is slow, almost a bell under the surface.',
      language: 'en',
      priority: 1,
    },
  ],
  environmentalReadings: [
    {
      id: 'river-pollution',
      metric: 'water.pollutionIndex',
      value: 0.62,
      unit: 'index 0–1',
      min: 0,
      max: 1,
      zoneId: 'zone-river',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'modelled',
    },
    {
      id: 'river-oxygen',
      metric: 'water.dissolvedOxygen',
      value: 5.5,
      unit: 'mg/L',
      min: 0,
      max: 14,
      zoneId: 'zone-river',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'measured',
    },
    {
      id: 'river-turbidity',
      metric: 'water.turbidity',
      value: 35,
      unit: 'NTU',
      min: 0,
      max: 100,
      zoneId: 'zone-river',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'measured',
    },
    {
      id: 'river-ph',
      metric: 'water.ph',
      value: 7.4,
      unit: 'pH',
      min: 4,
      max: 10,
      zoneId: 'zone-river',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'measured',
    },
    {
      id: 'river-flow',
      metric: 'flow.rate',
      value: 2.1,
      unit: 'm³/s',
      min: 0,
      max: 10,
      zoneId: 'zone-river',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'modelled',
    },
    {
      id: 'grove-pm25',
      metric: 'air.pm25',
      value: 18,
      unit: 'µg/m³',
      min: 0,
      max: 100,
      zoneId: 'zone-grove',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'measured',
    },
    {
      id: 'grove-no2',
      metric: 'air.no2',
      value: 35,
      unit: 'µg/m³',
      min: 0,
      max: 200,
      zoneId: 'zone-grove',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'modelled',
    },
    {
      id: 'grove-temperature',
      metric: 'weather.temperature',
      value: 24,
      unit: '°C',
      min: -10,
      max: 40,
      zoneId: 'zone-grove',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'measured',
    },
    {
      id: 'grove-light',
      metric: 'light.par',
      value: 900,
      unit: 'µmol/m²/s',
      min: 0,
      max: 2000,
      zoneId: 'zone-grove',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'measured',
    },
    {
      id: 'clearing-temperature',
      metric: 'weather.temperature',
      value: 21,
      unit: '°C',
      min: -10,
      max: 40,
      zoneId: 'zone-clearing',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'measured',
    },
    {
      id: 'clearing-noise',
      metric: 'noise.laeq',
      value: 48,
      unit: 'dB(A)',
      min: 30,
      max: 90,
      zoneId: 'zone-clearing',
      timestamp: '2026-10-22T00:00:00.000Z',
      quality: 'measured',
    },
  ],
  policy: {
    maxDensity: 1,
    maxTempoDriftPct: 6,
    maxTranspositionSemitones: 6,
    channelCount: 10,
  },
}
