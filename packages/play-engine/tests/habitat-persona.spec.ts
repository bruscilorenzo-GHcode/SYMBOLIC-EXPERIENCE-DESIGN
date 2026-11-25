import { describe, expect, it } from 'vitest'
import { HABITAT_ARCHETYPES, SPEAKER_PERSONA_ORDER } from '@aura-spec/inhabiting-model'
import {
  applyHabitatArchetype,
  buildArchitectureIntentFromPlay,
  composeFromProgress,
  createInitialPlayProgress,
  defaultSiteFromHabitat,
  parsePlayProgress,
  placePlayObject,
  serializePlayProgress,
  setPlayObjectPersona,
} from '../src'

describe('habitat archetypes in the play engine', () => {
  it('applies a habitat preset to parameters and object mode', () => {
    const progress = applyHabitatArchetype(createInitialPlayProgress(), 'indoor-hyperresonant-hall')
    expect(progress.habitatId).toBe('indoor-hyperresonant-hall')
    expect(progress.objectMode).toBe('indoor')
    expect(progress.parameters.stone).toBeCloseTo(0.85, 5)
    expect(progress.parameters.canopy).toBeCloseTo(0.04, 5)
    expect(progress.applied).toBe(false)
  })

  it('ignores unknown habitats', () => {
    const progress = createInitialPlayProgress()
    expect(applyHabitatArchetype(progress, 'no-such-habitat')).toBe(progress)
  })

  it('covers all ten mandate typologies through the engine', () => {
    for (const archetype of HABITAT_ARCHETYPES) {
      const progress = applyHabitatArchetype(createInitialPlayProgress(), archetype.id)
      expect(progress.habitatId).toBe(archetype.id)
      expect(progress.objectMode).toBe(archetype.landscape.objectMode)
    }
  })

  it('round-trips habitat and persona through storage', () => {
    let progress = applyHabitatArchetype(createInitialPlayProgress(), 'indoor-gallery-vault')
    progress = placePlayObject(progress, 'speaker', 2, 2)
    const speakerId = progress.objects.find((object) => object.kind === 'speaker')!.id
    progress = setPlayObjectPersona(progress, speakerId, 'architectural-line')
    const parsed = parsePlayProgress(serializePlayProgress(progress))
    expect(parsed.habitatId).toBe('indoor-gallery-vault')
    expect(parsed.objects.find((object) => object.id === speakerId)?.personaId).toBe('architectural-line')
  })

  it('defaults missing persona and habitat on legacy storage', () => {
    const legacy = {
      schemaVersion: 1,
      parameters: { canopy: 0.5, water: 0.5, stone: 0.3, light: 0.6, guests: 0.4, season: 0.4, wind: 0.2 },
      activeMissionId: 'mission-1',
      completedMissionIds: [],
      renderMode: 'diurno',
      lastGesture: null,
      applied: false,
      objectMode: 'landscape',
      objects: [
        {
          id: 'speaker-1',
          kind: 'speaker',
          label: 'Altoparlante',
          xM: 0,
          zM: 0,
          widthM: 0.42,
          depthM: 0.42,
          heightM: 2.2,
          baseHeightM: 0,
          rotationDeg: 0,
          materialId: 'design-concrete',
          color: '#8ad7c1',
        },
      ],
    }
    const parsed = parsePlayProgress(JSON.stringify(legacy))
    expect(parsed.habitatId).toBeTruthy()
    expect(parsed.objects[0]?.personaId).toBe(SPEAKER_PERSONA_ORDER[0])
  })

  it('maps placed personas to distinct transducer profiles', () => {
    let progress = createInitialPlayProgress()
    progress = placePlayObject(progress, 'speaker', -5, -3)
    progress = placePlayObject(progress, 'speaker', 5, 3)
    const first = progress.objects.find((object) => object.id.endsWith('-1'))!
    const second = progress.objects.find((object) => object.id.endsWith('-2'))!
    const withLine = setPlayObjectPersona(progress, second.id, 'architectural-line')
    const intent = buildArchitectureIntentFromPlay(
      composeFromProgress(withLine),
      defaultSiteFromHabitat(withLine.habitatId),
      withLine.objects,
    )
    const profiles = intent.speakers.map((speaker) => speaker.profileId)
    expect(profiles).toContain('as-reference-omni-01')
    expect(profiles).toContain('karray-reference-line-8')
    expect(new Set(profiles).size).toBe(2)
    void first
  })
})

