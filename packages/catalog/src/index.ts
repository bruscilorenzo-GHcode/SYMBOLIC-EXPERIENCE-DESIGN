import type { AcousticSpeakerProfile, SpeakerKind } from '@aura-spec/core-acoustics'
import { REFERENCE_PROFILES } from './reference-profiles'

export * from './reference-profiles'
export * from './validate'

export interface CatalogQuery {
  manufacturerId?: string
  kind?: SpeakerKind
  tag?: string
  search?: string
}

export function getProfile(
  id: string,
  profiles: readonly AcousticSpeakerProfile[] = REFERENCE_PROFILES,
): AcousticSpeakerProfile | undefined {
  return profiles.find((profile) => profile.id === id)
}

export function queryProfiles(
  query: CatalogQuery,
  profiles: readonly AcousticSpeakerProfile[] = REFERENCE_PROFILES,
): AcousticSpeakerProfile[] {
  const search = query.search?.toLowerCase().trim()
  return profiles.filter((profile) => {
    if (query.manufacturerId && profile.manufacturer.id !== query.manufacturerId) return false
    if (query.kind && profile.kind !== query.kind) return false
    if (query.tag && !profile.tags.includes(query.tag)) return false
    if (search) {
      const haystack = [
        profile.model.name,
        profile.model.code,
        profile.manufacturer.name,
        profile.model.description ?? '',
        ...profile.tags,
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })
}

export function requireProfile(
  id: string,
  profiles: readonly AcousticSpeakerProfile[] = REFERENCE_PROFILES,
): AcousticSpeakerProfile {
  const profile = getProfile(id, profiles)
  if (!profile) throw new Error(`Unknown speaker profile "${id}"`)
  return profile
}
