import { describe, expect, it } from 'vitest'
import {
  REFERENCE_PROFILES,
  queryProfiles,
  requireProfile,
  validateSpeakerProfile,
} from '../src'

describe('speaker catalogue', () => {
  it('validates every seed profile', () => {
    for (const profile of REFERENCE_PROFILES) {
      const validation = validateSpeakerProfile(profile)
      expect(validation.valid, JSON.stringify(validation.issues)).toBe(true)
    }
  })

  it('flags illustrative data as a warning, not an error', () => {
    const validation = validateSpeakerProfile(REFERENCE_PROFILES[0]!)
    expect(validation.valid).toBe(true)
    expect(validation.issues.some((issue) => issue.path === 'provenance.verification')).toBe(true)
  })

  it('queries by manufacturer, kind and search', () => {
    expect(queryProfiles({ manufacturerId: 'k-array' })).toHaveLength(2)
    expect(queryProfiles({ kind: 'line-array' })).toHaveLength(1)
    expect(queryProfiles({ search: 'lens' })).toHaveLength(1)
    expect(requireProfile('as-reference-omni-01').model.code).toBe('AS-OMNI-REF-01')
  })
})
