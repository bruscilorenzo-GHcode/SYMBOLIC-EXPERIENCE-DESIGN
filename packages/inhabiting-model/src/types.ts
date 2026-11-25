/**
 * TIER 1 / TIER 2 ontology.
 *
 * Tier 1 — Inhabiting Playground: habitat archetypes and sound-object personae.
 * Tier 2 — Acoustic Spec Lab: physical transducers, polar data, BOM, routing.
 *
 * The bridge between the tiers is the persona ↔ transducer binding: a creative
 * sound object in the playground always resolves to exactly one physical
 * transducer specification, and every physical placement can be read back as a
 * persona with a voice.
 */

export type HabitatDomain = 'indoor' | 'outdoor'

export type IndoorTypology =
  | 'domus-living'
  | 'gallery-vault'
  | 'intimate-alcove'
  | 'hyperresonant-hall'
  | 'transitional-corridor'

export type OutdoorTypology =
  | 'mediterranean-garden'
  | 'woodland-canopy'
  | 'mineral-zen-clearing'
  | 'water-basin-courtyard'
  | 'open-lawn-perimeter'

export type HabitatTypology = IndoorTypology | OutdoorTypology

/** The seven cross-domain play parameters used by the Tier 1 engine. */
export interface HabitatParameterBias {
  canopy: number
  water: number
  stone: number
  light: number
  guests: number
  season: number
  wind: number
}

export interface HabitatAcousticPreset {
  /** Sabine-style target reverberation time in seconds. */
  targetT60S: number
  /** 0 = absorbent/dead, 1 = reflective/live. */
  absorptionBias: number
  /** 0 = flat, 1 = strongly diffusing boundaries. */
  scatteringBias: number
  noiseFloorDb: number
  /** Direct-to-reverberant bias in dB at the reference listening distance. */
  intimacyDb: number
  baseTempoBpm: number
  register: 'low' | 'mid' | 'high'
  density: number
  brightness: number
  roughness: number
}

export interface HabitatLandscapePreset {
  /** 0–1 canopy cover of the plan area. */
  canopyCover: number
  /** 0–1 presence of water surfaces. */
  waterPresence: number
  /** 0–1 mineral/stone presence. */
  stonePresence: number
  /** 0–1 evergreen share of the planting. */
  evergreenShare: number
  /** Default object catalogue mode. */
  objectMode: 'landscape' | 'indoor'
}

export interface HabitatVisualPreset {
  skyTop: string
  skyHorizon: string
  ground: string
  fog: string
  light: string
  /** 0 = enclosed interior, 1 = open sky. */
  openness: number
}

export interface HabitatArchetype {
  id: string
  name: string
  italian: string
  domain: HabitatDomain
  typology: HabitatTypology
  description: string
  site: {
    widthM: number
    depthM: number
    ceilingHeightM: number
  }
  acoustic: HabitatAcousticPreset
  landscape: HabitatLandscapePreset
  visual: HabitatVisualPreset
  parameterBias: HabitatParameterBias
  recommendedPersonaKinds: PersonaKind[]
  /** Short dramaturgical line used in the Tier 1 habitat selector. */
  invocation: string
}

export type PersonaKind =
  | 'omni-cloud'
  | 'directional-voice'
  | 'asymmetric-lens'
  | 'sub-sculpture'
  | 'architectural-line'

export type VoiceGenerator =
  | 'ambient-bed'
  | 'harmonic-pad'
  | 'procedural-foley'
  | 'pulse'
  | 'spectral-drone'

export interface PersonaVoice {
  generator: VoiceGenerator
  density: number
  brightness: number
  roughness: number
  spreadDeg: number
  gainDb: number
  spatialization: 'object' | 'hoa' | 'vbap' | 'dbap'
}

export interface PersonaVisual {
  color: string
  shape: 'sphere' | 'column' | 'blade' | 'lens' | 'ground-plate'
  /** Relative scene scale multiplier. */
  scale: number
}

/**
 * The creative identity of a placed sound object. It is the dramatis persona
 * of the playground: placing it instantiates a voice in the generative
 * soundscape, and it always resolves to one physical transducer.
 */
export interface SoundObjectPersona {
  id: PersonaKind
  name: string
  italian: string
  role: string
  description: string
  /** Catalogue profile id from `@aura-spec/catalog`. */
  transducerProfileId: string
  voice: PersonaVoice
  visual: PersonaVisual
  recommendedHabitatIds: string[]
  invocation: string
}

export type TransducerClass =
  | 'omnidirectional'
  | 'directional'
  | 'lens'
  | 'subwoofer'
  | 'line-array'

export interface AcousticTransducerSpec {
  id: string
  personaKinds: PersonaKind[]
  manufacturer: string
  model: string
  /** Catalogue profile id; polar/BOM data resolve through the catalogue. */
  speakerProfileId: string
  transducerClass: TransducerClass
  sensitivityDbSpl1W1m: number
  maxSplDb: number
  powerHandlingW: number
  nominalImpedanceOhm: number
  dispersionDeg: { horizontal: number; vertical: number }
  ipRating: string
  polarSource: 'illustrative' | 'gll' | 'clf' | 'measured'
  mounting: string
  notes: string
}

/* ------------------------------------------------------------------ */
/* Two-tier state machine                                              */
/* ------------------------------------------------------------------ */

export type TierId = 'inhabiting' | 'spec-lab'
export type SpecLabSection = 'blueprint' | 'geometry' | 'materials' | 'bom'
export type TierTransition = 'idle' | 'to-spec' | 'to-play'

export interface TierState {
  tier: TierId
  specSection: SpecLabSection
  transition: TierTransition
  /** Bumped on every Tier 1 creative edit. */
  creativeRevision: number
  /** Bumped on every Tier 2 technical edit. */
  technicalRevision: number
  /** Last revision at which the two tiers were reconciled. */
  lastSyncedRevision: number | null
}

export function createTierState(): TierState {
  return {
    tier: 'inhabiting',
    specSection: 'blueprint',
    transition: 'idle',
    creativeRevision: 0,
    technicalRevision: 0,
    lastSyncedRevision: null,
  }
}

export function openSpecLab(state: TierState, section: SpecLabSection = 'blueprint'): TierState {
  return {
    ...state,
    tier: 'spec-lab',
    specSection: section,
    transition: 'to-spec',
    creativeRevision: state.creativeRevision + 1,
  }
}

export function returnToInhabiting(state: TierState): TierState {
  return {
    ...state,
    tier: 'inhabiting',
    transition: 'to-play',
    technicalRevision: state.technicalRevision + 1,
  }
}

export function settleTierTransition(state: TierState): TierState {
  return { ...state, transition: 'idle' }
}

export function markCreativeEdited(state: TierState): TierState {
  return { ...state, creativeRevision: state.creativeRevision + 1 }
}

export function markTechnicalEdited(state: TierState): TierState {
  return { ...state, technicalRevision: state.technicalRevision + 1 }
}

export function markTiersSynced(state: TierState): TierState {
  return {
    ...state,
    lastSyncedRevision: Math.max(state.creativeRevision, state.technicalRevision),
  }
}

export function creativeIsDirty(state: TierState): boolean {
  return state.lastSyncedRevision === null || state.creativeRevision > state.lastSyncedRevision
}

export function technicalIsDirty(state: TierState): boolean {
  return state.lastSyncedRevision === null || state.technicalRevision > state.lastSyncedRevision
}

/* ------------------------------------------------------------------ */
/* Persona ↔ transducer bridge                                         */
/* ------------------------------------------------------------------ */

export interface PersonaPlacement {
  id: string
  personaId: PersonaKind
  xM: number
  yM: number
  zM: number
  yawDeg: number
  zoneId?: string
}

export interface PersonaSpeakerBinding {
  placement: PersonaPlacement
  persona: SoundObjectPersona
  transducer: AcousticTransducerSpec
}

/** Generic speaker intent shape, structurally compatible with design-bridge. */
export interface PersonaSpeakerIntent {
  id: string
  profileId: string
  label: string
  xM: number
  yM: number
  zM: number
  yawDeg: number
  gainDb: number
  delayMs: number
  zoneId: string
}

/**
 * Resolve a placed persona to a physical speaker intent. This is the one
 * bridge every Tier 1 → Tier 2 transition must use.
 */
export function personaToSpeakerIntent(
  placement: PersonaPlacement,
  personas: readonly SoundObjectPersona[],
  fallbackZoneId = 'zone-core',
): PersonaSpeakerIntent {
  const persona = personas.find((candidate) => candidate.id === placement.personaId)
  if (!persona) throw new Error(`Unknown sound-object persona "${placement.personaId}"`)
  return {
    id: `speaker-${placement.id}`,
    profileId: persona.transducerProfileId,
    label: persona.italian,
    xM: placement.xM,
    yM: placement.yM,
    zM: placement.zM,
    yawDeg: placement.yawDeg,
    gainDb: persona.voice.gainDb,
    delayMs: 0,
    zoneId: placement.zoneId ?? fallbackZoneId,
  }
}

export function personaSpeakerBindings(
  placements: readonly PersonaPlacement[],
  personas: readonly SoundObjectPersona[],
  transducers: readonly AcousticTransducerSpec[],
): PersonaSpeakerBinding[] {
  return placements.map((placement) => {
    const persona = personas.find((candidate) => candidate.id === placement.personaId)
    if (!persona) throw new Error(`Unknown sound-object persona "${placement.personaId}"`)
    const transducer = transducers.find(
      (candidate) => candidate.speakerProfileId === persona.transducerProfileId,
    )
    if (!transducer) {
      throw new Error(`No transducer spec bound to persona "${persona.id}"`)
    }
    return { placement, persona, transducer }
  })
}
