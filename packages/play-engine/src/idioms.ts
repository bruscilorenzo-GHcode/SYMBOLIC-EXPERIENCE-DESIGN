import type { Register } from '@aura-spec/landscape-culture'
import type {
  IdiomEvent,
  IdiomScale,
  IdiomScore,
  MusicalIdiomDefinition,
  MusicalIdiomId,
} from './types'

/**
 * Four generative musical worlds. They are not playlists: each profile defines
 * a tuning, a scale grammar, a harmonic strategy, a rhythmic cycle, an
 * ornament language and a spatial behaviour. The audition and the technical
 * score both read from the same generated phrase.
 */
export const IDIOM_DEFINITIONS: MusicalIdiomDefinition[] = [
  {
    id: 'soundscape',
    label: 'Soundscape',
    italian: 'Paesaggio sonoro',
    inspiration: 'Field recording, spectralism, acousmatic listening',
    description:
      'Spectral pad and air texture over a sub drone and field noise. Harmony is a field, melody is a texture, rhythm is breath.',
    tuning: '12-tet',
    tempoHint: 70,
    soundfont: 'default',
    scales: [
      {
        id: 'spectral-open',
        name: 'Open spectrum',
        italian: 'Spettro aperto',
        cents: [0, 200, 500, 700, 900, 1200, 1400, 1600, 1900, 2400],
        character: 'Harmonic series, open fifths, shimmering partials.',
      },
      {
        id: 'spectral-dark',
        name: 'Dark spectrum',
        italian: 'Spettro scuro',
        cents: [0, 100, 300, 500, 700, 1000, 1200, 1500, 1700, 2400],
        character: 'Dense low partials and veiled upper air.',
      },
    ],
    harmony: {
      strategy: 'drone',
      progression: [[0, 2, 4], [0, 3, 5], [0, 2, 6], [0, 3, 7]],
      droneCents: [0, 700],
      label: 'Spectral drone field',
    },
    melody: { phraseBeats: 16, contour: 'free', ornament: 'none', density: 0.22 },
    rhythm: { cycle: 'breath', italian: 'Respiro', english: 'Breath', beats: 8, pattern: [1, 0, 0, 0, 1, 0, 0, 0] },
    timbre: { palette: ['pad', 'air', 'noise'], brightness: 0.5, roughness: 0.35 },
    spatial: { spreadDeg: 160, motion: 0.25 },
    instruments: {
      harmonic: { id: 'spectral-pad', label: 'Spectral pad', italian: 'Pad spettrale', synthesis: 'pad', role: 'harmonic' },
      melodic: { id: 'air-texture', label: 'Air texture', italian: 'Tessitura d’aria', synthesis: 'air', role: 'melodic' },
      drone: { id: 'sub-drone', label: 'Sub drone', italian: 'Sub drone', synthesis: 'drone', role: 'drone' },
      ambient: { id: 'field-noise', label: 'Field noise', italian: 'Rumore di campo', synthesis: 'noise', role: 'ambient' },
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    italian: 'Cinematico',
    inspiration: 'Film score, orchestral dramaturgy, long tension and release',
    description:
      'Strings and brass over a cinematic drone and field noise. Long harmonic arcs, metric pulses and dramatic swells.',
    tuning: '12-tet',
    tempoHint: 100,
    soundfont: 'default',
    scales: [
      {
        id: 'cinematic-minor',
        name: 'Cinematic minor',
        italian: 'Minore cinematografico',
        cents: [0, 200, 300, 500, 700, 800, 1000, 1200],
        character: 'Weighted, wide, dramatic.',
      },
      {
        id: 'cinematic-dorian',
        name: 'Cinematic dorian',
        italian: 'Dorico cinematografico',
        cents: [0, 200, 300, 500, 700, 900, 1000, 1200],
        character: 'Suspended, modal, forward-moving.',
      },
      {
        id: 'cinematic-lydian',
        name: 'Cinematic lydian',
        italian: 'Lidio cinematografico',
        cents: [0, 200, 400, 600, 700, 900, 1100, 1200],
        character: 'Open, luminous, expansive.',
      },
    ],
    harmony: {
      strategy: 'functional',
      progression: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
      droneCents: [0, 700, 1200],
      label: 'i–VI–III–VII',
    },
    melody: { phraseBeats: 16, contour: 'arch', ornament: 'grace', density: 0.48 },
    rhythm: { cycle: 'cinematic-pulse', italian: 'Polso cinematografico', english: 'Cinematic pulse', beats: 8, pattern: [1, 0, 0, 1, 0, 1, 0, 0] },
    timbre: { palette: ['strings', 'brass', 'drone'], brightness: 0.56, roughness: 0.3 },
    spatial: { spreadDeg: 140, motion: 0.4 },
    instruments: {
      harmonic: { id: 'strings', label: 'Strings', italian: 'Archi', synthesis: 'strings', role: 'harmonic' },
      melodic: { id: 'brass', label: 'Brass', italian: 'Ottoni', synthesis: 'brass', role: 'melodic' },
      drone: { id: 'cinema-drone', label: 'Cinema drone', italian: 'Bordone cinematografico', synthesis: 'drone', role: 'drone' },
      ambient: { id: 'field-noise', label: 'Field noise', italian: 'Rumore di campo', synthesis: 'noise', role: 'ambient' },
    },
  },
  {
    id: 'high-pop',
    label: 'High Pop',
    italian: 'High Pop',
    inspiration: 'Modern pop production, hooks, groove, high-energy arrangement',
    description:
      'Synth and electric guitar over a sub-bass and crowd noise. Hook-led melody, functional pop harmony and a clear backbeat.',
    tuning: '12-tet',
    tempoHint: 112,
    soundfont: 'default',
    scales: [
      {
        id: 'pop-major',
        name: 'Pop major',
        italian: 'Maggiore pop',
        cents: [0, 200, 400, 500, 700, 900, 1100, 1200],
        character: 'Bright, open, hook-friendly.',
      },
      {
        id: 'pop-minor',
        name: 'Pop minor',
        italian: 'Minore pop',
        cents: [0, 200, 300, 500, 700, 800, 1000, 1200],
        character: 'Driving, emotional, radio-facing.',
      },
      {
        id: 'pop-mixolydian',
        name: 'Pop mixolydian',
        italian: 'Misolidio pop',
        cents: [0, 200, 400, 500, 700, 900, 1000, 1200],
        character: 'Lifted, anthemic, unresolved.',
      },
    ],
    harmony: {
      strategy: 'functional',
      progression: [[0, 2, 4], [4, 6, 8], [5, 7, 9], [3, 5, 7]],
      droneCents: [0, 700],
      label: 'I–V–vi–IV',
    },
    melody: { phraseBeats: 16, contour: 'wave', ornament: 'grace', density: 0.62 },
    rhythm: { cycle: 'backbeat', italian: 'Backbeat', english: 'Backbeat', beats: 8, pattern: [1, 0, 1, 0, 1, 0, 1, 0] },
    timbre: { palette: ['synth', 'electric-guitar', 'sub-bass'], brightness: 0.68, roughness: 0.32 },
    spatial: { spreadDeg: 100, motion: 0.5 },
    instruments: {
      harmonic: { id: 'synth', label: 'Synth', italian: 'Synth', synthesis: 'synth', role: 'harmonic' },
      melodic: { id: 'electric-guitar', label: 'Electric guitar', italian: 'Chitarra elettrica', synthesis: 'electric-guitar', role: 'melodic' },
      drone: { id: 'sub-bass', label: 'Sub bass', italian: 'Sub bass', synthesis: 'drone', role: 'drone' },
      ambient: { id: 'crowd-noise', label: 'Crowd noise', italian: 'Rumore di folla', synthesis: 'noise', role: 'ambient' },
    },
  },
  {
    id: 'classics',
    label: 'Classics',
    italian: 'Classici',
    inspiration: 'Common-practice tonality, Maestro soundfont, piano and cello',
    description:
      'Piano and cello over a string drone and air noise, voiced with the Maestro soundfont. Functional harmony, periodic meter and a developing motif.',
    tuning: '12-tet',
    tempoHint: 108,
    soundfont: 'maestro',
    scales: [
      {
        id: 'classic-major',
        name: 'Major',
        italian: 'Maggiore',
        cents: [0, 200, 400, 500, 700, 900, 1100, 1200],
        character: 'Open, consonant, cadential.',
      },
      {
        id: 'classic-minor',
        name: 'Minor',
        italian: 'Minore',
        cents: [0, 200, 300, 500, 700, 800, 1000, 1200],
        character: 'Introspective, weighted, expressive.',
      },
      {
        id: 'classic-dorian',
        name: 'Dorian',
        italian: 'Dorico',
        cents: [0, 200, 300, 500, 700, 900, 1000, 1200],
        character: 'Modal colour with a raised sixth.',
      },
    ],
    harmony: {
      strategy: 'functional',
      progression: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [0, 2, 4]],
      droneCents: [0, 700],
      label: 'I–IV–V–I',
    },
    melody: { phraseBeats: 16, contour: 'arch', ornament: 'grace', density: 0.5 },
    rhythm: { cycle: 'common-time', italian: 'Tempo comune', english: 'Common time', beats: 4, pattern: [1, 0, 1, 0] },
    timbre: { palette: ['piano', 'cello', 'strings'], brightness: 0.6, roughness: 0.2 },
    spatial: { spreadDeg: 90, motion: 0.35 },
    instruments: {
      harmonic: { id: 'piano', label: 'Piano', italian: 'Pianoforte', synthesis: 'piano', role: 'harmonic' },
      melodic: { id: 'cello', label: 'Cello', italian: 'Violoncello', synthesis: 'cello', role: 'melodic' },
      drone: { id: 'string-drone', label: 'String drone', italian: 'Bordone d’archi', synthesis: 'drone', role: 'drone' },
      ambient: { id: 'air-noise', label: 'Air noise', italian: 'Rumore d’aria', synthesis: 'noise', role: 'ambient' },
    },
  },
]

export const DEFAULT_IDIOM_ID: MusicalIdiomId = 'soundscape'

export function getIdiom(id: MusicalIdiomId): MusicalIdiomDefinition {
  return IDIOM_DEFINITIONS.find((idiom) => idiom.id === id) ?? IDIOM_DEFINITIONS[0]!
}

export function idiomLabel(id: MusicalIdiomId, lang: 'it' | 'en' = 'en'): string {
  const idiom = getIdiom(id)
  return lang === 'it' ? idiom.italian : idiom.label
}

export interface IdiomContext {
  tonicPc: number
  tempoBpm: number
  density: number
  brightness: number
  roughness: number
  register: Register
  seconds?: number
  seed?: number
}

/**
 * Generates a short, loopable phrase. The same function is used by the static
 * composition and by the audio audition (with an advancing `seconds` value),
 * so the visible score and the audible phrase stay coherent.
 */
export function buildIdiomScore(
  context: IdiomContext,
  idiomId: MusicalIdiomId = DEFAULT_IDIOM_ID,
  options: { phraseIndex?: number } = {},
): IdiomScore {
  const idiom = getIdiom(idiomId)
  const seconds = context.seconds ?? 0
  const cycleBeats = Math.max(idiom.rhythm.beats, idiom.melody.phraseBeats)
  const beatDuration = 60 / Math.max(30, context.tempoBpm)
  const computedPhrase = Math.floor(seconds / (cycleBeats * beatDuration))
  const phraseIndex = options.phraseIndex ?? computedPhrase
  const scale = chooseScale(idiom, context, phraseIndex)
  const tension = clamp01(
    0.3 +
      context.density * 0.3 +
      context.roughness * 0.22 +
      Math.sin(seconds / 17 + phraseIndex * 0.7) * 0.08,
  )
  const seed = (context.seed ?? hashString(`${idiom.id}:${phraseIndex}:${scale.id}`)) >>> 0
  const rng = mulberry32(seed)
  const events: IdiomEvent[] = []
  const baseMidi = 48 + context.tonicPc + (context.register === 'low' ? 0 : context.register === 'mid' ? 12 : 24)

  const add = (
    beat: number,
    durationBeats: number,
    midi: number,
    velocity: number,
    role: IdiomEvent['role'],
    timbre: string,
    pan: number,
  ): void => {
    events.push({
      id: `${idiom.id}-${phraseIndex}-${events.length}`,
      beat: round(beat, 3),
      durationBeats: round(durationBeats, 3),
      midi: round(midi, 3),
      velocity: round(clamp(velocity, 0.05, 1), 3),
      role,
      timbre,
      pan: round(clamp(pan, -1, 1), 3),
    })
  }

  // Drone / harmonic field
  for (const cents of idiom.harmony.droneCents) {
    add(0, cycleBeats, baseMidi + cents / 100, 0.38, 'drone', idiom.instruments.drone.id, 0)
  }

  // Functional harmony for Cinematic, High Pop and Classics. Soundscape is
  // drone-led; its harmonic field is already represented by the drone events.
  if (idiom.harmony.strategy === 'functional') {
    const bars = Math.max(1, Math.floor(cycleBeats / 4))
    for (let bar = 0; bar < bars; bar += 1) {
      const chord = idiom.harmony.progression[bar % idiom.harmony.progression.length] ?? [0]
      for (const degree of chord) {
        add(bar * 4, 3.7, baseMidi + (scale.cents[degree % scale.cents.length] ?? 0) / 100, 0.3, 'bass', idiom.instruments.harmonic.id, -0.1)
      }
    }
  }

  // Rhythmic cycle
  for (let beat = 0; beat < cycleBeats; beat += 1) {
    if (idiom.rhythm.pattern[beat % idiom.rhythm.pattern.length]) {
      add(beat, 0.4, baseMidi - 12, 0.22 + (beat % 4 === 0 ? 0.12 : 0), 'percussion', idiom.id === 'cinematic' ? 'cinema-perc' : idiom.id === 'high-pop' ? 'pop-kit' : 'pulse', beat % 2 === 0 ? -0.2 : 0.2)
    }
  }

  // Melody / ornaments
  const scaleLength = scale.cents.length
  const phraseLength = Math.max(cycleBeats, idiom.melody.phraseBeats)
  const step = idiom.id === 'soundscape' ? 2 : 1
  const motif = buildMotif(seed, scaleLength, tension)
  let previousDegree = 0
  for (let beat = 0; beat < phraseLength; beat += step) {
    const density = clamp01(idiom.melody.density + context.density * 0.2 - tension * 0.08)
    if (rng() > density * 0.85) continue
    const motifIndex = (Math.floor(beat / step) + phraseIndex) % motif.length
    let degree = (motif[motifIndex] ?? 0) + (rng() > 0.82 ? (rng() > 0.5 ? 1 : -1) : 0)
    degree = Math.max(0, Math.min(scaleLength - 1, degree))
    if (idiom.melody.contour === 'arch') {
      const arch = Math.sin((beat / phraseLength) * Math.PI) * 2
      degree = Math.min(scaleLength - 1, degree + Math.round(arch * tension))
    }
    if (idiom.melody.contour === 'descending') degree = Math.max(0, degree - Math.floor(beat / 4))
    const cents = scale.cents[degree] ?? 0
    const midi = baseMidi + cents / 100
    const pan = (rng() * 2 - 1) * (idiom.spatial.spreadDeg / 180)
    const velocity = 0.28 + tension * 0.22 + rng() * 0.12
    add(beat, Math.max(0.4, (step * 0.9)), midi, velocity, 'melody', idiom.instruments.melodic.id, pan)

    if (idiom.melody.ornament !== 'none' && rng() > 0.45) {
      const ornamentCents =
        idiom.melody.ornament === 'meend'
          ? cents + (rng() > 0.5 ? 80 : -80)
          : idiom.melody.ornament === 'gamak'
            ? cents + (rng() > 0.5 ? 120 : -120)
            : cents + (rng() > 0.5 ? 50 : -50)
      add(
        beat + 0.18,
        0.22,
        baseMidi + ornamentCents / 100,
        velocity * 0.55,
        'ornament',
        idiom.instruments.melodic.id,
        pan * 0.8,
      )
    }
    previousDegree = degree
  }
  void previousDegree

  return {
    idiomId: idiom.id,
    idiomLabel: idiom.label,
    scaleName: scale.name,
    scaleNameIt: scale.italian,
    scaleCents: [...scale.cents],
    tonicPc: context.tonicPc,
    tempoBpm: Math.round(context.tempoBpm * 10) / 10,
    cycleBeats,
    cycleName: idiom.rhythm.italian,
    harmonyLabel: idiom.harmony.label,
    rhythmLabel: `${idiom.rhythm.italian} · ${cycleBeats}/4`,
    rhythmLabelEn: `${idiom.rhythm.english} · ${cycleBeats}/4`,
    phraseIndex,
    tension: round(tension, 3),
    events: events.sort((a, b) => a.beat - b.beat || a.role.localeCompare(b.role)),
    instruments: idiom.instruments,
  }
}

function chooseScale(
  idiom: MusicalIdiomDefinition,
  context: IdiomContext,
  phraseIndex: number,
): IdiomScale {
  if (idiom.id === 'soundscape') {
    return context.brightness > 0.52 ? idiom.scales[0]! : idiom.scales[1]!
  }
  if (idiom.id === 'cinematic') {
    if (context.roughness > 0.55) return idiom.scales[0]!
    if (context.brightness > 0.6) return idiom.scales[2]!
    return idiom.scales[1]!
  }
  if (idiom.id === 'high-pop') {
    if (context.roughness > 0.5) return idiom.scales[1]!
    if (context.brightness > 0.62) return idiom.scales[2]!
    return idiom.scales[0]!
  }
  if (context.roughness > 0.55 || context.brightness < 0.4) return idiom.scales[1]!
  if (context.density > 0.62) return idiom.scales[2]!
  return idiom.scales[0]!
}

function buildMotif(seed: number, scaleLength: number, tension: number): number[] {
  const rng = mulberry32(seed ^ 0x9e3779b9)
  const center = Math.floor(scaleLength / 2)
  const span = Math.max(1, Math.round(1 + tension * (scaleLength - 2)))
  return Array.from({ length: 8 }, (_, index) => {
    const wave = Math.round(Math.sin((index / 8) * Math.PI * 2) * span)
    const jitter = rng() > 0.7 ? (rng() > 0.5 ? 1 : -1) : 0
    return Math.max(0, Math.min(scaleLength - 1, center + wave + jitter))
  })
}


function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
