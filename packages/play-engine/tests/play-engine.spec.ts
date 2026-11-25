import { describe, expect, it } from 'vitest'
import { DEFAULT_SITE_CONTEXT } from '@aura-spec/design-bridge'
import { PLANT_CATALOG } from '@aura-spec/landscape-culture'
import {
  DEFAULT_PLAY_PARAMETERS,
  MAS_MANIFESTO,
  MAS_PROCESS,
  MAS_PROCESS_EN,
  PLAY_GESTURES,
  PLAY_MISSIONS,
  PLAY_PARAMETERS,
  PLAY_RENDER_MODES,
  PLAY_SPECIES,
  applyGesture,
  buildArchitectureIntentFromPlay,
  buildSeedBriefText,
  buildSeedSummary,
  composePlay,
  composeTick,
  createInitialPlayProgress,
  defaultPlayObjects,
  evaluateAllMissions,
  evaluateMission,
  getPlayProgression,
  placePlayObject,
  removePlayObject,
  nudgePlayWithGesture,
  parsePlayProgress,
  recordMissionPass,
  resetPlayProgress,
  serializePlayProgress,
  setPlayObjectMode,
  updatePlayObject,
  defaultSeedBrief,
  updatePlayParameter,
  type PlayParameters,
} from '../src'

const parameterCandidates: Record<string, PlayParameters> = {
  river: { canopy: 0.5, water: 0.7, stone: 0.3, light: 0.65, guests: 0.2, season: 0.4, wind: 0.2 },
  three: { canopy: 0.5, water: 0.5, stone: 0.3, light: 0.7, guests: 0.7, season: 0.4, wind: 0.2 },
  veiled: { canopy: 0.75, water: 0.3, stone: 0.8, light: 0.3, guests: 0.25, season: 0.85, wind: 0.1 },
  refuge: { canopy: 0.72, water: 0.75, stone: 0.55, light: 0.9, guests: 0.2, season: 0.5, wind: 0.2 },
  autumn: { canopy: 0.6, water: 0.5, stone: 0.4, light: 0.5, guests: 0.25, season: 0.76, wind: 0.55 },
  stoneWater: { canopy: 0.35, water: 0.55, stone: 0.7, light: 0.6, guests: 0.2, season: 0.4, wind: 0.15 },
  night: { canopy: 0.65, water: 0.65, stone: 0.45, light: 0.15, guests: 0.4, season: 0.5, wind: 0.2 },
  shared: { canopy: 0.7, water: 0.5, stone: 0.4, light: 0.55, guests: 0.8, season: 0.45, wind: 0.2 },
}

function composeAt(overrides: Partial<PlayParameters>) {
  return composePlay({ ...DEFAULT_PLAY_PARAMETERS, ...overrides })
}

describe('AURA PLAY parameter ontology', () => {
  it('exposes seven independent poetic parameters', () => {
    expect(PLAY_PARAMETERS).toHaveLength(7)
    expect(PLAY_PARAMETERS.map((parameter) => parameter.id)).toEqual([
      'canopy',
      'water',
      'stone',
      'light',
      'guests',
      'season',
      'wind',
    ])
    for (const parameter of PLAY_PARAMETERS) {
      expect(parameter.italian.length).toBeGreaterThan(0)
      expect(parameter.english.length).toBeGreaterThan(0)
      expect(parameter.min).toBe(0)
      expect(parameter.max).toBe(1)
    }
  })

  it('never leaves the unit range, even after gestures and invalid input', () => {
    const base = { ...DEFAULT_PLAY_PARAMETERS, water: 9, wind: -4 }
    const composition = composePlay(base)
    for (const value of Object.values(composition.parameters)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
    const dew = applyGesture({ ...DEFAULT_PLAY_PARAMETERS, water: 0.98 }, 'rugiada')
    expect(dew.water).toBeLessThanOrEqual(1)
  })
})

describe('cross-domain consequences', () => {
  it('is deterministic for the same parameters and options', () => {
    const a = composePlay(parameterCandidates.refuge!)
    const b = composePlay(parameterCandidates.refuge!)
    expect(a).toEqual(b)
    expect(a.acoustics.absorptionBands).toHaveLength(9)
    expect(a.environmental.readings.length).toBeGreaterThanOrEqual(10)
  })

  it('canopy changes geometry, absorption, planting and musical density together', () => {
    const open = composeAt({ canopy: 0.08 })
    const sheltered = composeAt({ canopy: 0.92 })
    expect(sheltered.geometry.canopyCoverage).toBeGreaterThan(open.geometry.canopyCoverage)
    expect(sheltered.geometry.canopyRadiusM).toBeGreaterThan(open.geometry.canopyRadiusM)
    expect(sheltered.acoustics.meanAbsorption).toBeGreaterThan(open.acoustics.meanAbsorption)
    expect(sheltered.vegetation.strata.shrub).not.toBe(open.vegetation.strata.shrub)
    expect(sheltered.music.descriptor.density).toBeLessThanOrEqual(open.music.descriptor.density + 0.06)
  })

  it('water changes the physical pond, humidity, spectral brightness and visitor audibility', () => {
    const dry = composeAt({ water: 0.05 })
    const river = composeAt({ water: 0.95 })
    expect(river.geometry.waterAreaM2).toBeGreaterThan(dry.geometry.waterAreaM2)
    expect(river.environmental.humidityPct).toBeGreaterThan(dry.environmental.humidityPct)
    expect(river.music.descriptor.brightness).toBeGreaterThan(dry.music.descriptor.brightness)
    expect(river.social.waterAudibility).toBeGreaterThan(dry.social.waterAudibility)
  })

  it('stone changes materiality, T60, air data and harmonic roughness', () => {
    const soft = composeAt({ stone: 0.05, wind: 0.9 })
    const mineral = composeAt({ stone: 0.95, wind: 0.05 })
    expect(mineral.geometry.stoneCount).toBeGreaterThan(soft.geometry.stoneCount)
    expect(mineral.materials.hardRatio).toBeGreaterThan(soft.materials.hardRatio)
    expect(mineral.acoustics.t60S).toBeGreaterThan(soft.acoustics.t60S)
    expect(mineral.environmental.pollutionIndex).toBeGreaterThan(soft.environmental.pollutionIndex)
    expect(mineral.music.descriptor.roughness).toBeGreaterThan(soft.music.descriptor.roughness)
  })

  it('light changes palette-side light, descriptor brightness and lantern count', () => {
    const night = composeAt({ light: 0.05 })
    const noon = composeAt({ light: 0.98 })
    expect(noon.geometry.lanternCount).toBeGreaterThan(night.geometry.lanternCount)
    expect(noon.music.descriptor.brightness).toBeGreaterThan(night.music.descriptor.brightness)
    expect(noon.environmental.lightLevel).toBeGreaterThan(night.environmental.lightLevel)
  })

  it('guests change the visitor layer, coexistence, crowding and spatial masking', () => {
    const solo = composeAt({ guests: 0.02 })
    const chorus = composeAt({ guests: 0.95 })
    expect(chorus.social.visitorCount).toBeGreaterThan(solo.social.visitorCount)
    expect(chorus.social.visitorInputs.length).toBeGreaterThan(solo.social.visitorInputs.length)
    expect(chorus.social.crowding).toBeGreaterThan(solo.social.crowding)
    expect(chorus.acoustics.crowdMasking).toBeGreaterThan(solo.acoustics.crowdMasking)
  })

  it('season changes foliage metabolism, temperature and musical time', () => {
    const spring = composeAt({ season: 0.1 })
    const winter = composeAt({ season: 0.96 })
    expect(spring.season.phase).toBe('risveglio')
    expect(winter.season.phase).toBe('riposo')
    expect(spring.season.leafFactor).toBeGreaterThan(winter.season.leafFactor)
    expect(spring.environmental.temperatureC).toBeGreaterThan(winter.environmental.temperatureC)
    expect(spring.music.descriptor.tempoBpm).not.toBe(winter.music.descriptor.tempoBpm)
  })

  it('wind changes visible sway, masking and environmental flow', () => {
    const calm = composeAt({ wind: 0.04 })
    const gale = composeAt({ wind: 0.96 })
    expect(gale.geometry.windSway).toBeGreaterThan(calm.geometry.windSway)
    expect(gale.acoustics.windMasking).toBeGreaterThan(calm.acoustics.windMasking)
    expect(gale.environmental.readings.find((reading) => reading.metric === 'flow.rate')?.value).toBeGreaterThan(
      calm.environmental.readings.find((reading) => reading.metric === 'flow.rate')?.value ?? 0,
    )
  })
})

describe('missions, scoring and progression', () => {
  it('defines eight compositional missions with measurable requirements', () => {
    expect(PLAY_MISSIONS.length).toBeGreaterThanOrEqual(6)
    for (const mission of PLAY_MISSIONS) {
      expect(mission.requirements.length).toBeGreaterThanOrEqual(3)
      const evaluation = evaluateMission(mission, composePlay(DEFAULT_PLAY_PARAMETERS))
      expect(evaluation.requirements).toHaveLength(mission.requirements.length)
      expect(typeof evaluation.passed).toBe('boolean')
    }
  })

  it('has at least one deterministic parameter world that satisfies every mission', () => {
    for (const mission of PLAY_MISSIONS) {
      const candidateName = (
        {
          'river-in-grove': 'refuge',
          'three-voices': 'three',
          'veiled-air': 'veiled',
          'refuge-register': 'refuge',
          'autumn-wind': 'autumn',
          'stone-water': 'stoneWater',
          'night-garden': 'night',
          'shared-threshold': 'shared',
        } as Record<string, keyof typeof parameterCandidates>
      )[mission.id]
      expect(candidateName).toBeTruthy()
      const composition = composePlay(parameterCandidates[candidateName]!)
      expect(evaluateMission(mission, composition).passed).toBe(true)
    }
  })

  it('returns all five independent score dimensions in range', () => {
    const composition = composePlay(parameterCandidates.refuge!)
    for (const value of Object.values(composition.scores)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
    const other = composePlay(parameterCandidates.veiled!)
    expect(other.scores.novelty).not.toBe(composition.scores.novelty)
    expect(other.scores.musicalCoherence).not.toBe(composition.scores.musicalCoherence)
  })

  it('unlocks species, materials, render modes and gestures through completed missions', () => {
    const start = getPlayProgression([])
    expect(start.completedCount).toBe(0)
    expect(start.unlockedSpeciesIds).toEqual(PLAY_SPECIES.filter((species) => species.requiresCompletions === 0).map((species) => species.id))
    expect(start.unlockedRenderModeIds).toEqual(['diurno'])
    expect(start.unlockedGestureIds).toEqual(['rugiada', 'potatura'])

    const mature = getPlayProgression(['a', 'b', 'c', 'd', 'e'])
    expect(mature.completedCount).toBe(5)
    expect(mature.stage).toBeGreaterThan(start.stage)
    expect(mature.unlockedSpeciesIds.length).toBeGreaterThan(start.unlockedSpeciesIds.length)
    expect(mature.unlockedMaterialIds.length).toBeGreaterThan(start.unlockedMaterialIds.length)
    expect(mature.unlockedRenderModeIds.length).toBeGreaterThan(start.unlockedRenderModeIds.length)
    expect(mature.unlockedGestureIds.length).toBeGreaterThan(start.unlockedGestureIds.length)
    expect(mature.unlockedGestureIds).not.toContain('fioritura')

    const constellation = getPlayProgression(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(constellation.unlockedGestureIds).toContain('fioritura')
    expect(constellation.unlockedRenderModeIds).toContain('sciame')
  })

  it('advances the active mission without losing the completed set', () => {
    const progress = {
      ...createInitialPlayProgress(),
      parameters: parameterCandidates.three!,
    }
    const composition = composePlay(progress.parameters)
    expect(evaluateMission(PLAY_MISSIONS[1]!, composition).passed).toBe(true)
    const next = recordMissionPass(progress, 'three-voices', composition)
    expect(next.completedMissionIds).toEqual(['three-voices'])
    expect(next.activeMissionId).toBe('river-in-grove')
    expect(composeTick(next).progression.completedCount).toBe(1)
  })
})

describe('spatial object game', () => {
  it('starts with a landscape catalog and editable placed objects', () => {
    const progress = createInitialPlayProgress()
    expect(progress.objectMode).toBe('landscape')
    expect(progress.objects.length).toBeGreaterThanOrEqual(10)
    expect(progress.objects.some((object) => object.kind === 'speaker')).toBe(true)
    const added = placePlayObject(progress, 'bench', 2.4, -1.2)
    expect(added.objects.length).toBe(progress.objects.length + 1)
    const updated = updatePlayObject(added, added.objects[0]!.id, { widthM: 99, rotationDeg: 37 })
    expect(updated.objects[0]!.widthM).toBeGreaterThan(0)
    expect(updated.objects[0]!.rotationDeg).toBe(37)
    expect(removePlayObject(updated, added.objects[0]!.id).objects.length).toBe(added.objects.length - 1)
  })

  it('switches between landscape and indoor catalogs deterministically', () => {
    const indoor = setPlayObjectMode(createInitialPlayProgress(), 'indoor')
    expect(indoor.objectMode).toBe('indoor')
    expect(indoor.objects.some((object) => object.kind === 'table')).toBe(true)
    expect(indoor.objects.some((object) => object.kind === 'panel')).toBe(true)
    expect(setPlayObjectMode(indoor, 'landscape')).toEqual(createInitialPlayProgress())
    expect(defaultPlayObjects('indoor')).toEqual(defaultPlayObjects('indoor'))
  })

  it('turns placed objects and speakers into real bridge items and speaker intents', () => {
    const progress = { ...createInitialPlayProgress(), parameters: parameterCandidates.refuge! }
    const withObject = placePlayObject(progress, 'tree-large', 4, -4)
    const composition = composePlay(withObject.parameters)
    const intent = buildArchitectureIntentFromPlay(composition, DEFAULT_SITE_CONTEXT, withObject.objects)
    expect(intent.items.some((item) => item.id.startsWith('play-object-tree-large-'))).toBe(true)
    expect(intent.speakers.some((speaker) => speaker.id.startsWith('play-speaker-speaker-'))).toBe(true)
    expect(intent.rationale.some((line) => line.includes('placed objects'))).toBe(true)
  })
})

describe('MAS spatial seed and conversion', () => {
  it('produces a deterministic, poetic seed from the composition', () => {
    const progression = getPlayProgression([])
    const garden = buildSeedSummary(composePlay(parameterCandidates.refuge!), progression, 'landscape')
    const room = buildSeedSummary(composePlay(parameterCandidates.refuge!), progression, 'indoor')
    expect(garden.title).toContain('Seme spaziale')
    expect(garden.archetype).not.toBe(room.archetype)
    expect(garden.manifesto).toBe(MAS_MANIFESTO)
    expect(garden.process).toEqual([...MAS_PROCESS])
    expect(garden.projectArchetypes.length).toBeGreaterThanOrEqual(3)
    expect(garden.technicalSummary).toContain('T60')
    expect(buildSeedSummary(composePlay(parameterCandidates.refuge!), progression, 'landscape')).toEqual(garden)
    const english = buildSeedSummary(composePlay(parameterCandidates.refuge!), progression, 'landscape', 'en')
    expect(english.title).toContain('Spatial seed')
    expect(english.process).toEqual([...MAS_PROCESS_EN])
    expect(buildSeedBriefText(english, { ...defaultSeedBrief(), name: 'Lo' }, composePlay(parameterCandidates.refuge!), 'en')).toContain('Project request')
  })

  it('creates a human-readable MAS brief with generated atmosphere and technical summary', () => {
    const progression = getPlayProgression([])
    const composition = composePlay(parameterCandidates.refuge!)
    const seed = buildSeedSummary(composition, progression, 'landscape')
    const text = buildSeedBriefText(seed, { ...defaultSeedBrief(), name: 'Lo', email: 'lo@example.com' }, composition)
    expect(text).toContain('MED.IA ARCHITECTURE STUDIO')
    expect(text).toContain('lo@example.com')
    expect(text).toContain('MAS progetta lo spazio reale')
    expect(text).toContain('Specifica tecnica interna')
  })
})

describe('state, persistence and integration', () => {
  it('resets to exactly the same initial state', () => {
    let progress = createInitialPlayProgress()
    progress = updatePlayParameter(progress, 'water', 0.9)
    progress = recordMissionPass(progress, 'three-voices', composePlay(parameterCandidates.three!))
    expect(resetPlayProgress()).toEqual(createInitialPlayProgress())
    expect(progress.parameters.water).toBe(0.9)
  })

  it('persists and parses deterministic progress, ignoring locked modes and unknown missions', () => {
    const progress = {
      ...createInitialPlayProgress(),
      parameters: parameterCandidates.refuge!,
      renderMode: 'sciame' as const,
      completedMissionIds: ['missing-mission', 'three-voices'],
      activeMissionId: 'missing-mission',
      applied: true,
    }
    const parsed = parsePlayProgress(serializePlayProgress(progress))
    expect(parsed.completedMissionIds).toEqual(['three-voices'])
    expect(parsed.renderMode).toBe('diurno')
    expect(parsed.activeMissionId).toBe('river-in-grove')
    expect(parsePlayProgress('{not json')).toEqual(createInitialPlayProgress())
  })

  it('only applies unlocked gestures through the state helper', () => {
    const progress = createInitialPlayProgress()
    const locked = nudgePlayWithGesture(progress, 'fioritura')
    expect(locked).toEqual(progress)
    const advanced = { ...progress, completedMissionIds: ['a', 'b', 'c', 'd', 'e', 'f'] }
    expect(PLAY_GESTURES.find((gesture) => gesture.id === 'fioritura')!.requiresCompletions).toBe(6)
    const unlocked = nudgePlayWithGesture(advanced, 'fioritura')
    expect(unlocked.parameters).not.toEqual(advanced.parameters)
    expect(unlocked.lastGesture).toBe('fioritura')
    const viaState = composeTick(advanced)
    expect(viaState.progression.unlockedGestureIds).toContain('fioritura')
  })

  it('maps a composition into the existing design bridge without unknown species', () => {
    const composition = composePlay(parameterCandidates.river!)
    const intent = buildArchitectureIntentFromPlay(composition, DEFAULT_SITE_CONTEXT)
    expect(intent.items.some((item) => item.kind === 'water')).toBe(true)
    expect(intent.items.some((item) => item.kind === 'canopy')).toBe(true)
    expect(intent.planting).toHaveLength(5)
    expect(intent.rationale.some((line) => line.startsWith('PLAY'))).toBe(true)
    expect(intent.footprint.widthM).toBe(24)
    expect(intent.speakers.length).toBeGreaterThan(0)

    for (const design of composition.vegetation.designs) {
      for (const item of design.items) {
        expect(PLANT_CATALOG.some((profile) => profile.id === item.profileId)).toBe(true)
      }
    }
  })

  it('uses unlocked species in the visible planting plan', () => {
    const progress = { ...createInitialPlayProgress(), completedMissionIds: ['a', 'b'] }
    const tick = composeTick(progress)
    expect(tick.progression.unlockedSpeciesIds).toContain('magnolia-grandiflora')
    expect(tick.composition.vegetation.speciesIds).toEqual(expect.any(Array))
    const all = evaluateAllMissions(tick.composition)
    expect(all).toHaveLength(PLAY_MISSIONS.length)
    expect(PLAY_RENDER_MODES.length).toBeGreaterThanOrEqual(4)
  })
})
