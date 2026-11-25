import type { PersonaKind } from '@aura-spec/inhabiting-model'

/**
 * The three diffusion fields shown in the site's 2D spatial diagram. The
 * diagram is bound to the first speaker persona, so the field is not a second
 * source of truth: it is a readable projection of that persona.
 */
export type SpatialFieldProfile = 'omni' | 'line' | 'lens'

export interface SpatialFieldDefinition {
  id: SpatialFieldProfile
  personaId: PersonaKind
  labelIt: string
  labelEn: string
  descriptionIt: string
  descriptionEn: string
}

export const SPATIAL_FIELD_ORDER: readonly SpatialFieldProfile[] = ['omni', 'line', 'lens']

export const SPATIAL_FIELDS: readonly SpatialFieldDefinition[] = [
  {
    id: 'omni',
    personaId: 'omni-cloud',
    labelIt: 'Omni 360°',
    labelEn: 'Omni 360°',
    descriptionIt: 'Radiazione diffusa, campo avvolgente.',
    descriptionEn: 'Diffuse radiation, enveloping field.',
  },
  {
    id: 'line',
    personaId: 'architectural-line',
    labelIt: 'Linea 90°',
    labelEn: 'Line 90°',
    descriptionIt: 'Continuità frontale e controllo verticale.',
    descriptionEn: 'Frontal continuity and vertical control.',
  },
  {
    id: 'lens',
    personaId: 'asymmetric-lens',
    labelIt: 'Lente 30°',
    labelEn: 'Lens 30°',
    descriptionIt: 'Focalizzazione direzionale e soglie di ascolto.',
    descriptionEn: 'Directional focus and listening thresholds.',
  },
]

export function getSpatialField(id: string | null | undefined): SpatialFieldDefinition | undefined {
  return SPATIAL_FIELDS.find((field) => field.id === id)
}

/**
 * Project a persona onto the diagram. Directional voice and asymmetric lens
 * both read as a focused lens; everything else reads as the diffuse omni field.
 */
export function spatialFieldFromPersona(personaId: string | null | undefined): SpatialFieldProfile {
  if (personaId === 'architectural-line') return 'line'
  if (personaId === 'directional-voice' || personaId === 'asymmetric-lens') return 'lens'
  return 'omni'
}

/** The persona written back to the first speaker when a field is chosen. */
export function personaForSpatialField(id: SpatialFieldProfile): PersonaKind {
  return getSpatialField(id)?.personaId ?? 'omni-cloud'
}

export function adjacentSpatialField(
  current: SpatialFieldProfile,
  direction: 1 | -1 = 1,
): SpatialFieldProfile {
  const index = SPATIAL_FIELD_ORDER.indexOf(current)
  const length = SPATIAL_FIELD_ORDER.length
  const next = (index + direction + length) % length
  return SPATIAL_FIELD_ORDER[next] ?? 'omni'
}

export function spatialFieldLabel(id: SpatialFieldProfile, lang: 'it' | 'en' = 'it'): string {
  const field = getSpatialField(id)
  if (!field) return id
  return lang === 'it' ? field.labelIt : field.labelEn
}

export function spatialFieldDescription(id: SpatialFieldProfile, lang: 'it' | 'en' = 'it'): string {
  const field = getSpatialField(id)
  if (!field) return ''
  return lang === 'it' ? field.descriptionIt : field.descriptionEn
}
