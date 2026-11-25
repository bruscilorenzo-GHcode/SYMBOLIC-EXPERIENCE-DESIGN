import { describe, expect, it } from 'vitest'
import {
  IDIOM_DEFINITIONS,
  buildIdiomScore,
  composeFromProgress,
  createInitialPlayProgress,
  setPlayIdiom,
} from '../src'

const context = {
  tonicPc: 0,
  tempoBpm: 78,
  density: 0.52,
  brightness: 0.56,
  roughness: 0.38,
  register: 'mid' as const,
  seconds: 0,
  seed: 42,
}

describe('four generative musical worlds', () => {
  it('defines Soundscape, Cinematic, High Pop and Classics', () => {
    expect(IDIOM_DEFINITIONS.map((idiom) => idiom.id)).toEqual([
      'soundscape',
      'cinematic',
      'high-pop',
      'classics',
    ])
    for (const idiom of IDIOM_DEFINITIONS) {
      expect(idiom.scales.length).toBeGreaterThan(0)
      expect(idiom.rhythm.beats).toBeGreaterThan(0)
      expect(idiom.rhythm.pattern.length).toBe(idiom.rhythm.beats)
      expect(idiom.harmony.droneCents.length).toBeGreaterThan(0)
      expect(idiom.instruments.harmonic.id).toBeTruthy()
      expect(idiom.instruments.melodic.id).toBeTruthy()
    }
  })

  it('assigns the requested instruments and Maestro to Classics', () => {
    const cinematic = IDIOM_DEFINITIONS.find((idiom) => idiom.id === 'cinematic')!
    expect(cinematic.instruments.harmonic.id).toBe('strings')
    expect(cinematic.instruments.melodic.id).toBe('brass')

    const pop = IDIOM_DEFINITIONS.find((idiom) => idiom.id === 'high-pop')!
    expect(pop.instruments.harmonic.id).toBe('synth')
    expect(pop.instruments.melodic.id).toBe('electric-guitar')

    const classics = IDIOM_DEFINITIONS.find((idiom) => idiom.id === 'classics')!
    expect(classics.instruments.harmonic.id).toBe('piano')
    expect(classics.instruments.melodic.id).toBe('cello')
    expect(classics.soundfont).toBe('maestro')

    const soundscape = IDIOM_DEFINITIONS.find((idiom) => idiom.id === 'soundscape')!
    expect(soundscape.instruments.harmonic.id).toBe('spectral-pad')
    expect(soundscape.instruments.melodic.id).toBe('air-texture')
  })

  it('generates a complete phrase in every idiom', () => {
    for (const idiom of IDIOM_DEFINITIONS) {
      const score = buildIdiomScore(context, idiom.id)
      expect(score.idiomId).toBe(idiom.id)
      expect(score.scaleCents.length).toBeGreaterThan(2)
      expect(score.events.length).toBeGreaterThan(4)
      expect(score.events.some((event) => event.role === 'drone')).toBe(true)
      expect(score.events.some((event) => event.role === 'melody')).toBe(true)
      expect(score.events.some((event) => event.role === 'percussion')).toBe(true)
      expect(score.events.every((event) => Number.isFinite(event.midi) && Number.isFinite(event.beat))).toBe(true)
      expect(score.tension).toBeGreaterThanOrEqual(0)
      expect(score.tension).toBeLessThanOrEqual(1)
      expect(score.cycleBeats % idiom.rhythm.beats).toBe(0)
      expect(score.instruments.harmonic.id).toBe(idiom.instruments.harmonic.id)
    }
  })

  it('uses the instrument ids in the generated events', () => {
    const classics = buildIdiomScore(context, 'classics')
    expect(classics.events.some((event) => event.timbre === 'piano')).toBe(true)
    expect(classics.events.some((event) => event.timbre === 'cello')).toBe(true)

    const pop = buildIdiomScore(context, 'high-pop')
    expect(pop.events.some((event) => event.timbre === 'synth')).toBe(true)
    expect(pop.events.some((event) => event.timbre === 'electric-guitar')).toBe(true)

    const cinematic = buildIdiomScore(context, 'cinematic')
    expect(cinematic.events.some((event) => event.timbre === 'strings')).toBe(true)
    expect(cinematic.events.some((event) => event.timbre === 'brass')).toBe(true)
  })

  it('is deterministic and changes smoothly across phrases', () => {
    const first = buildIdiomScore(context, 'cinematic')
    expect(buildIdiomScore(context, 'cinematic')).toEqual(first)

    const later = buildIdiomScore({ ...context, seconds: 45 }, 'cinematic')
    expect(later.phraseIndex).toBeGreaterThan(first.phraseIndex)
    expect(Math.abs(later.tension - first.tension)).toBeLessThan(0.25)
    expect(later.scaleName).toBe(first.scaleName)
    expect(later.tempoBpm).toBe(first.tempoBpm)
    expect(later.events.length).toBeGreaterThan(0)
  })

  it('switches the idiom in the play composition', () => {
    const initial = createInitialPlayProgress()
    expect(initial.idiomId).toBe('soundscape')
    const classics = setPlayIdiom(initial, 'classics')
    expect(classics.idiomId).toBe('classics')
    expect(composeFromProgress(classics).music.idiomId).toBe('classics')
    expect(composeFromProgress(classics).music.idiom.instruments.harmonic.id).toBe('piano')
  })
})
