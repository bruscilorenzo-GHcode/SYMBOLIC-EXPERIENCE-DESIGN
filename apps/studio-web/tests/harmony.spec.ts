import { describe, expect, it } from 'vitest'
import {
  globalStemTranspose,
  groupSongs,
  parseStemName,
  pitchClassesFromScale,
  snapMidiToPitchClasses,
} from '../src/play/audio/harmony'

describe('stem name parsing', () => {
  it('reads the authored song number and variant', () => {
    expect(parseStemName('Cinematic/pad/Cinematic_pad_012_A.mid')).toMatchObject({
      index: '012',
      variant: 'A',
    })
    expect(parseStemName('HighPop-Long/bass/HighPop_bass_005.mid')).toMatchObject({
      index: '005',
      variant: '',
    })
    expect(parseStemName('Classics/lead/Classical_violin1_003.mid')).toMatchObject({
      index: '003',
      variant: '',
    })
    expect(parseStemName('not-a-stem.mid')).toBeNull()
  })
})

describe('song grouping', () => {
  it('groups all parts of the same index into one song', () => {
    const songs = groupSongs({
      bass: ['Classics/bass/Classical_cello_002.mid'],
      pad: ['Classics/pad/Classical_viola_001.mid', 'Classics/pad/Classical_viola_002.mid'],
      lead: ['Classics/lead/Classical_violin1_001.mid', 'Classics/lead/Classical_violin1_002.mid'],
    })
    expect(songs.map((song) => song.id)).toEqual(['001', '002'])
    expect(songs[0]!.files.pad).toContain('Classical_viola_001')
    expect(songs[1]!.files.lead).toContain('Classical_violin1_002')
  })

  it('splits A/B variants and lends drums to the sibling section', () => {
    const songs = groupSongs({
      drums: ['Cinematic/drums/Cinematic_drums_001_B.mid'],
      bass: ['Cinematic/bass/Cinematic_bass_001_A.mid', 'Cinematic/bass/Cinematic_bass_001_B.mid'],
      pad: ['Cinematic/pad/Cinematic_pad_001_A.mid', 'Cinematic/pad/Cinematic_pad_001_B.mid'],
      lead: ['Cinematic/lead/Cinematic_lead_001_A.mid'],
    })
    expect(songs.map((song) => song.id).sort()).toEqual(['001-A', '001-B'])
    const a = songs.find((song) => song.id === '001-A')!
    const b = songs.find((song) => song.id === '001-B')!
    expect(a.files.bass).toContain('_A.mid')
    expect(b.files.bass).toContain('_B.mid')
    expect(a.files.drums).toContain('Cinematic_drums_001_B')
    expect(b.files.drums).toContain('Cinematic_drums_001_B')
  })

  it('drops groups with no harmonic part', () => {
    const songs = groupSongs({ drums: ['HighPop-Long/drums/HighPop_drums_001.mid'] })
    expect(songs).toHaveLength(0)
  })

  it('keeps songs ordered by index', () => {
    const songs = groupSongs({
      pad: [
        'HighPop-Long/pad/HighPop_pad_010.mid',
        'HighPop-Long/pad/HighPop_pad_002.mid',
      ],
    })
    expect(songs.map((song) => song.index)).toEqual(['002', '010'])
  })
})

describe('harmonic helpers', () => {
  it('derives pitch classes from a scale in cents', () => {
    expect(pitchClassesFromScale(0, [0, 200, 400, 500, 700, 900, 1100])).toEqual([0, 2, 4, 5, 7, 9, 11])
    expect(pitchClassesFromScale(3, [0, 200, 400, 500, 700, 900, 1100])).toEqual([0, 2, 3, 5, 7, 8, 10])
  })

  it('snaps only nearby notes onto the chord, otherwise leaves them', () => {
    expect(snapMidiToPitchClasses(61, [0, 4, 7])).toBe(60)
    expect(snapMidiToPitchClasses(66, [0, 4, 7])).toBe(67)
    expect(snapMidiToPitchClasses(63, [0, 4, 7])).toBe(64)
    expect(snapMidiToPitchClasses(64, [0, 4, 7])).toBe(64)
  })

  it('transposes the whole harmonic group by the same bounded interval', () => {
    expect(globalStemTranspose(0.5, 0.5)).toBe(0)
    expect(globalStemTranspose(1, 1)).toBe(2)
    expect(globalStemTranspose(0, 0)).toBe(-2)
    for (let i = 0; i <= 10; i++) {
      const value = globalStemTranspose(i / 10, i / 10)
      expect(value).toBeGreaterThanOrEqual(-2)
      expect(value).toBeLessThanOrEqual(2)
    }
  })
})
