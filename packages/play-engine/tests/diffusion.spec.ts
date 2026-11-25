import { describe, expect, it } from 'vitest'
import { SPEAKER_PERSONA_ORDER, requirePersona } from '@aura-spec/inhabiting-model'
import {
  SPATIAL_FIELDS,
  adjacentSpatialField,
  personaForSpatialField,
  spatialFieldDescription,
  spatialFieldFromPersona,
  spatialFieldLabel,
} from '../src'

describe('spatial diffusion fields', () => {
  it('exposes exactly omni, line and lens in cycle order', () => {
    expect(SPATIAL_FIELDS.map((field) => field.id)).toEqual(['omni', 'line', 'lens'])
    expect(new Set(SPATIAL_FIELDS.map((field) => field.personaId)).size).toBe(3)
    for (const field of SPATIAL_FIELDS) expect(requirePersona(field.personaId).id).toBe(field.personaId)
  })

  it('projects every speaker persona onto a diagram field', () => {
    expect(spatialFieldFromPersona(undefined)).toBe('omni')
    expect(spatialFieldFromPersona('architectural-line')).toBe('line')
    expect(spatialFieldFromPersona('directional-voice')).toBe('lens')
    expect(spatialFieldFromPersona('asymmetric-lens')).toBe('lens')
    for (const persona of SPEAKER_PERSONA_ORDER) {
      expect(['omni', 'line', 'lens']).toContain(spatialFieldFromPersona(persona))
    }
  })

  it('round-trips a chosen field through the first-speaker persona', () => {
    for (const id of ['omni', 'line', 'lens'] as const) {
      const persona = personaForSpatialField(id)
      expect(spatialFieldFromPersona(persona)).toBe(id)
    }
  })

  it('cycles forward and backward with wrap-around', () => {
    expect(adjacentSpatialField('omni')).toBe('line')
    expect(adjacentSpatialField('line')).toBe('lens')
    expect(adjacentSpatialField('lens')).toBe('omni')
    expect(adjacentSpatialField('omni', -1)).toBe('lens')
    expect(adjacentSpatialField('lens', -1)).toBe('line')
  })

  it('localises labels and descriptions', () => {
    expect(spatialFieldLabel('line', 'it')).toBe('Linea 90°')
    expect(spatialFieldLabel('line', 'en')).toBe('Line 90°')
    expect(spatialFieldDescription('lens', 'it')).toContain('Focalizzazione')
    expect(spatialFieldDescription('lens', 'en')).toContain('Directional')
  })
})
