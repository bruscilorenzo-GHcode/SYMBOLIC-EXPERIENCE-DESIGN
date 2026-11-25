import type { PersonaKind, PersonaVisual, PersonaVoice, SoundObjectPersona } from './types'

function voice(overrides: Partial<PersonaVoice> = {}): PersonaVoice {
  return {
    generator: 'ambient-bed',
    density: 0.4,
    brightness: 0.5,
    roughness: 0.3,
    spreadDeg: 120,
    gainDb: -6,
    spatialization: 'object',
    ...overrides,
  }
}

function visual(overrides: Partial<PersonaVisual> = {}): PersonaVisual {
  return {
    color: '#8ad7c1',
    shape: 'sphere',
    scale: 1,
    ...overrides,
  }
}

/**
 * The five dramatis personae of the Inhabiting Playground. Each one is a way
 * of being present in the garden/room before it is a product: placing it
 * instantiates a generative voice, and it always resolves to one transducer.
 */
export const SOUND_OBJECT_PERSONAS: SoundObjectPersona[] = [
  {
    id: 'omni-cloud',
    name: 'Omnidirectional cloud',
    italian: 'Nuvola omnidirezionale',
    role: 'Ambient bed / sonic cloud',
    description:
      'A 360° horizontal reflector — natural stone cylinder or sphere — that turns its position into a diffuse field of sound. The garden breathes around it.',
    transducerProfileId: 'as-reference-omni-01',
    voice: voice({ generator: 'ambient-bed', density: 0.5, brightness: 0.45, roughness: 0.25, spreadDeg: 150, gainDb: -8, spatialization: 'object' }),
    visual: visual({ color: '#8ad7c1', shape: 'sphere', scale: 1.1 }),
    recommendedHabitatIds: [
      'outdoor-mediterranean-garden',
      'outdoor-water-basin-courtyard',
      'outdoor-woodland-canopy',
      'indoor-domus-living',
      'indoor-intimate-alcove',
    ],
    invocation: 'Un soffio che riempie la stanza.',
  },
  {
    id: 'directional-voice',
    name: 'Directional voice',
    italian: 'Voce direzionale',
    role: 'Narrative focal point',
    description:
      'A focused acoustic beam: a narrator, a solo instrument, a precise event in space. Where it points, the listener goes.',
    transducerProfileId: 'as-reference-lens-01',
    voice: voice({ generator: 'procedural-foley', density: 0.35, brightness: 0.62, roughness: 0.28, spreadDeg: 45, gainDb: -4, spatialization: 'vbap' }),
    visual: visual({ color: '#ffd166', shape: 'blade', scale: 0.95 }),
    recommendedHabitatIds: [
      'indoor-gallery-vault',
      'indoor-transitional-corridor',
      'outdoor-mineral-zen-clearing',
      'outdoor-open-lawn-perimeter',
    ],
    invocation: 'Una voce che indica una direzione.',
  },
  {
    id: 'asymmetric-lens',
    name: 'Asymmetric acoustic lens',
    italian: 'Lente acustica asimmetrica',
    role: 'Surface projector',
    description:
      'A special directivity profile that spreads along walls, water surfaces or foliage: the boundary itself becomes the loudspeaker.',
    transducerProfileId: 'as-reference-lens-01',
    voice: voice({ generator: 'spectral-drone', density: 0.42, brightness: 0.55, roughness: 0.32, spreadDeg: 90, gainDb: -6, spatialization: 'hoa' }),
    visual: visual({ color: '#d99cff', shape: 'lens', scale: 1 }),
    recommendedHabitatIds: [
      'outdoor-water-basin-courtyard',
      'indoor-gallery-vault',
      'indoor-transitional-corridor',
      'outdoor-woodland-canopy',
    ],
    invocation: 'La parete diventa strumento.',
  },
  {
    id: 'sub-sculpture',
    name: 'Sub-sculpture',
    italian: 'Sub-scultura',
    role: 'Ground-coupled low frequencies',
    description:
      'Ground-coupled low frequency and organic tactile vibration: the earth as a resonator, felt before it is heard.',
    transducerProfileId: 'karray-reference-sub-18',
    voice: voice({ generator: 'harmonic-pad', density: 0.3, brightness: 0.12, roughness: 0.5, spreadDeg: 180, gainDb: -2, spatialization: 'object' }),
    visual: visual({ color: '#e88f6a', shape: 'ground-plate', scale: 1.25 }),
    recommendedHabitatIds: [
      'indoor-hyperresonant-hall',
      'indoor-intimate-alcove',
      'outdoor-mineral-zen-clearing',
      'outdoor-water-basin-courtyard',
      'outdoor-mediterranean-garden',
    ],
    invocation: 'La terra tiene il tempo basso.',
  },
  {
    id: 'architectural-line',
    name: 'Architectural line array',
    italian: 'Linea architetturale',
    role: 'High-throw sculptural integration',
    description:
      'A slim line array with electronic steering: a vertical architectural gesture that carries sound across the whole field.',
    transducerProfileId: 'karray-reference-line-8',
    voice: voice({ generator: 'pulse', density: 0.55, brightness: 0.6, roughness: 0.22, spreadDeg: 50, gainDb: -5, spatialization: 'vbap' }),
    visual: visual({ color: '#7fb3ff', shape: 'column', scale: 1.15 }),
    recommendedHabitatIds: ['outdoor-open-lawn-perimeter', 'indoor-hyperresonant-hall', 'indoor-gallery-vault'],
    invocation: 'Una linea che attraversa il giardino.',
  },
]

export const SPEAKER_PERSONA_ORDER: PersonaKind[] = [
  'omni-cloud',
  'directional-voice',
  'asymmetric-lens',
  'sub-sculpture',
  'architectural-line',
]

export const DEFAULT_SPEAKER_PERSONA_ID: PersonaKind = 'omni-cloud'

export function getPersona(id: string): SoundObjectPersona | undefined {
  return SOUND_OBJECT_PERSONAS.find((persona) => persona.id === id)
}

export function requirePersona(id: string): SoundObjectPersona {
  const persona = getPersona(id)
  if (!persona) throw new Error(`Unknown sound-object persona "${id}"`)
  return persona
}
