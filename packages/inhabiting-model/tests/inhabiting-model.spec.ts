import { describe, expect, it } from 'vitest'
import {
  ACOUSTIC_TRANSDUCER_SPECS,
  DEFAULT_HABITAT_ID,
  DEFAULT_SPEAKER_PERSONA_ID,
  HABITAT_ARCHETYPES,
  SOUND_OBJECT_PERSONAS,
  SPEAKER_PERSONA_ORDER,
  creativeIsDirty,
  createTierState,
  getPersona,
  habitatArchetypes,
  markCreativeEdited,
  markTechnicalEdited,
  markTiersSynced,
  openSpecLab,
  personaSpeakerBindings,
  personaToSpeakerIntent,
  requireHabitatArchetype,
  requireTransducerForPersona,
  returnToInhabiting,
  technicalIsDirty,
} from '../src'

describe('inhabiting two-tier ontology', () => {
  it('defines exactly five indoor and five outdoor archetypes', () => {
    expect(habitatArchetypes('indoor')).toHaveLength(5)
    expect(habitatArchetypes('outdoor')).toHaveLength(5)
    expect(HABITAT_ARCHETYPES.map((archetype) => archetype.id)).toEqual([
      ...new Set(HABITAT_ARCHETYPES.map((archetype) => archetype.id)),
    ])
  })

  it('covers every typology named in the mandate', () => {
    const typologies = HABITAT_ARCHETYPES.map((archetype) => archetype.typology).sort()
    expect(typologies).toEqual(
      [
        'domus-living',
        'gallery-vault',
        'intimate-alcove',
        'hyperresonant-hall',
        'mediterranean-garden',
        'mineral-zen-clearing',
        'open-lawn-perimeter',
        'transitional-corridor',
        'water-basin-courtyard',
        'woodland-canopy',
      ].sort(),
    )
  })

  it('gives every archetype a complete preset and at least one persona', () => {
    for (const archetype of HABITAT_ARCHETYPES) {
      expect(archetype.acoustic.targetT60S).toBeGreaterThan(0)
      expect(archetype.parameterBias.canopy).toBeGreaterThanOrEqual(0)
      expect(archetype.recommendedPersonaKinds.length).toBeGreaterThan(0)
      expect(archetype.recommendedPersonaKinds.every((kind) => getPersona(kind))).toBe(true)
      expect(archetype.invocation.length).toBeGreaterThan(0)
      expect(archetype.landscape.objectMode).toBe(archetype.domain === 'indoor' ? 'indoor' : 'landscape')
    }
  })

  it('binds every persona to a real transducer spec', () => {
    expect(SOUND_OBJECT_PERSONAS.map((persona) => persona.id)).toEqual(SPEAKER_PERSONA_ORDER)
    for (const persona of SOUND_OBJECT_PERSONAS) {
      const spec = requireTransducerForPersona(persona.id)
      expect(spec.speakerProfileId).toBe(persona.transducerProfileId)
      expect(spec.personaKinds).toContain(persona.id)
    }
  })

  it('maps a placed persona to a physical speaker intent', () => {
    const intent = personaToSpeakerIntent(
      { id: 'obj-1', personaId: 'architectural-line', xM: 6, yM: 3.2, zM: 4, yawDeg: -30, zoneId: 'zone-core' },
      SOUND_OBJECT_PERSONAS,
    )
    expect(intent.profileId).toBe('karray-reference-line-8')
    expect(intent.zoneId).toBe('zone-core')
    expect(intent.gainDb).toBe(-5)

    const bindings = personaSpeakerBindings(
      [
        { id: 'obj-1', personaId: 'omni-cloud', xM: -4, yM: 2, zM: 2, yawDeg: 0 },
        { id: 'obj-2', personaId: 'sub-sculpture', xM: 0, yM: 0.4, zM: -3, yawDeg: 0 },
      ],
      SOUND_OBJECT_PERSONAS,
      ACOUSTIC_TRANSDUCER_SPECS,
    )
    expect(bindings).toHaveLength(2)
    expect(bindings[0]!.transducer.transducerClass).toBe('omnidirectional')
    expect(bindings[1]!.transducer.transducerClass).toBe('subwoofer')
  })

  it('rejects unbound personas', () => {
    expect(() =>
      personaToSpeakerIntent(
        { id: 'x', personaId: 'ghost' as never, xM: 0, yM: 0, zM: 0, yawDeg: 0 },
        SOUND_OBJECT_PERSONAS,
      ),
    ).toThrow()
  })

  it('drives the two-tier state machine with dirty tracking', () => {
    let state = createTierState()
    expect(state.tier).toBe('inhabiting')
    expect(creativeIsDirty(state)).toBe(true)

    state = markTiersSynced(state)
    expect(creativeIsDirty(state)).toBe(false)
    expect(technicalIsDirty(state)).toBe(false)

    state = markCreativeEdited(state)
    expect(creativeIsDirty(state)).toBe(true)
    expect(technicalIsDirty(state)).toBe(false)

    state = openSpecLab(state, 'bom')
    expect(state.tier).toBe('spec-lab')
    expect(state.specSection).toBe('bom')
    expect(state.transition).toBe('to-spec')

    state = markTechnicalEdited(state)
    expect(technicalIsDirty(state)).toBe(true)

    state = returnToInhabiting(state)
    expect(state.tier).toBe('inhabiting')
    expect(state.transition).toBe('to-play')

    state = markTiersSynced(state)
    expect(creativeIsDirty(state)).toBe(false)
    expect(technicalIsDirty(state)).toBe(false)
  })

  it('defaults to the Mediterranean garden and the omni persona', () => {
    const archetype = requireHabitatArchetype(DEFAULT_HABITAT_ID)
    expect(archetype.domain).toBe('outdoor')
    expect(archetype.typology).toBe('mediterranean-garden')
    expect(SOUND_OBJECT_PERSONAS.some((persona) => persona.id === DEFAULT_SPEAKER_PERSONA_ID)).toBe(true)
  })
})
