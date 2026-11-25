import { describe, expect, it } from 'vitest'
import { DEFAULT_SITE_CONTEXT, architectureFromMusic, manualMusicFeatures } from '../src'

describe('music-first architectural intent', () => {
  it('generates a complete architectural intent from music features', () => {
    const intent = architectureFromMusic(
      manualMusicFeatures({ tempoBpm: 120, density: 0.7, brightness: 0.7, roughness: 0.55, dynamicRangeDb: 24 }),
      DEFAULT_SITE_CONTEXT,
    )
    expect(intent.footprint.widthM).toBeGreaterThan(6)
    expect(intent.footprint.depthM).toBeGreaterThan(5)
    expect(intent.items.some((item) => item.kind === 'floor')).toBe(true)
    expect(intent.items.some((item) => item.kind === 'glass')).toBe(true)
    expect(intent.items.some((item) => item.kind === 'canopy')).toBe(true)
    expect(intent.items.some((item) => item.kind === 'water')).toBe(true)
    expect(intent.zones.length).toBeGreaterThanOrEqual(3)
    expect(intent.speakers.length).toBeGreaterThanOrEqual(4)
    expect(intent.speakers.length).toBeLessThanOrEqual(10)
    expect(intent.planting).toHaveLength(5)
    expect(intent.planting.every((item) => item.quantity > 0)).toBe(true)
    expect(intent.rationale.length).toBeGreaterThanOrEqual(5)
  })

  it('reacts to a quieter, darker, less dense piece with a smaller footprint', () => {
    const dense = architectureFromMusic(
      manualMusicFeatures({ tempoBpm: 140, density: 0.9, brightness: 0.8, roughness: 0.7, dynamicRangeDb: 30 }),
      DEFAULT_SITE_CONTEXT,
    )
    const sparse = architectureFromMusic(
      manualMusicFeatures({ tempoBpm: 52, density: 0.15, brightness: 0.2, roughness: 0.15, dynamicRangeDb: 8 }),
      DEFAULT_SITE_CONTEXT,
    )
    expect(dense.footprint.widthM).toBeGreaterThan(sparse.footprint.widthM)
    expect(dense.speakers.length).toBeGreaterThanOrEqual(sparse.speakers.length)
    expect(dense.ceilingHeightM).toBeGreaterThanOrEqual(sparse.ceilingHeightM)
    expect(dense.items.some((item) => item.kind === 'water')).toBe(true)
    expect(sparse.items.some((item) => item.kind === 'water')).toBe(false)
  })

  it('handles indoor and phygital sites without outdoor canopies', () => {
    const indoor = architectureFromMusic(manualMusicFeatures({ brightness: 0.3, density: 0.4 }), {
      ...DEFAULT_SITE_CONTEXT,
      siteKind: 'indoor',
      ceilingHeightM: 8,
      widthM: 30,
      depthM: 20,
    })
    expect(indoor.items.some((item) => item.kind === 'canopy')).toBe(false)
    expect(indoor.speakers.every((speaker) => speaker.profileId === 'karray-reference-line-8')).toBe(true)
    expect(indoor.ceilingHeightM).toBeGreaterThanOrEqual(8)
    expect(indoor.zones.every((zone) => zone.exposure !== 'outdoor')).toBe(true)
  })

  it('is deterministic for the same features and site', () => {
    const features = manualMusicFeatures({ tempoBpm: 96, density: 0.5, brightness: 0.4, roughness: 0.4 })
    expect(architectureFromMusic(features, DEFAULT_SITE_CONTEXT)).toEqual(
      architectureFromMusic(features, DEFAULT_SITE_CONTEXT),
    )
  })
})
