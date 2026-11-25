import type { SiteContext } from '@aura-spec/design-bridge'
import { DEFAULT_SITE_CONTEXT } from '@aura-spec/design-bridge'
import type { PersonaKind } from '@aura-spec/inhabiting-model'
import { DEFAULT_HABITAT_ID, getHabitatArchetype, habitatArchetypes } from '@aura-spec/inhabiting-model'
import type { PlayProgress } from './types'

export { habitatArchetypes, DEFAULT_HABITAT_ID }

/**
 * Applying a habitat archetype is the Tier 1 "choose your biome" gesture: it
 * retunes the seven cross-domain parameters, switches the object catalogue and
 * records the archetype id for the Tier 2 bridge.
 */
export function applyHabitatArchetype(progress: PlayProgress, habitatId: string): PlayProgress {
  const archetype = getHabitatArchetype(habitatId)
  if (!archetype) return progress
  return {
    ...progress,
    habitatId: archetype.id,
    objectMode: archetype.landscape.objectMode,
    parameters: {
      canopy: archetype.parameterBias.canopy,
      water: archetype.parameterBias.water,
      stone: archetype.parameterBias.stone,
      light: archetype.parameterBias.light,
      guests: archetype.parameterBias.guests,
      season: archetype.parameterBias.season,
      wind: archetype.parameterBias.wind,
    },
    lastGesture: null,
    applied: false,
  }
}

export function personaIdsForHabitat(habitatId: string): PersonaKind[] {
  return getHabitatArchetype(habitatId)?.recommendedPersonaKinds ?? []
}

/** Site context implied by a habitat archetype, for the design bridge. */
export function defaultSiteFromHabitat(habitatId: string): SiteContext {
  const archetype = getHabitatArchetype(habitatId)
  if (!archetype) return { ...DEFAULT_SITE_CONTEXT }
  return {
    ...DEFAULT_SITE_CONTEXT,
    siteKind: archetype.domain === 'indoor' ? 'indoor' : 'outdoor',
    widthM: archetype.site.widthM,
    depthM: archetype.site.depthM,
    ceilingHeightM: archetype.site.ceilingHeightM,
    daylight: archetype.visual.openness,
  }
}
