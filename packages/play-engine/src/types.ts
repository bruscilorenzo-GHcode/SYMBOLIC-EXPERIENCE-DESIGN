import type { PersonaKind } from '@aura-spec/inhabiting-model'
import type {
  CoexistenceResult,
  DataToMusicResult,
  EnvironmentalReading,
  Mode,
  MusicalDescriptor,
  PaletteAudit,
  PlantStratum,
  PlantingDesign,
  Register,
  Timbre,
  VisitorMusicalInput,
} from '@aura-spec/landscape-culture'

export type MusicalIdiomId = 'soundscape' | 'cinematic' | 'high-pop' | 'classics'

export type IdiomEventRole = 'drone' | 'bass' | 'melody' | 'ornament' | 'percussion'

export type InstrumentSynthesis =
  | 'piano'
  | 'cello'
  | 'guitar'
  | 'flute'
  | 'sitar'
  | 'strings'
  | 'brass'
  | 'synth'
  | 'electric-guitar'
  | 'pad'
  | 'drone'
  | 'air'
  | 'noise'

export interface InstrumentDefinition {
  id: string
  label: string
  italian: string
  synthesis: InstrumentSynthesis
  role: 'harmonic' | 'melodic' | 'drone' | 'ambient'
}

export interface IdiomInstruments {
  harmonic: InstrumentDefinition
  melodic: InstrumentDefinition
  drone: InstrumentDefinition
  ambient: InstrumentDefinition
}

export interface IdiomScale {
  id: string
  name: string
  italian: string
  /** Cents above the tonic, including the octave. */
  cents: number[]
  character: string
}

export interface IdiomEvent {
  id: string
  beat: number
  durationBeats: number
  /** Fractional MIDI note; microtones are represented between semitones. */
  midi: number
  velocity: number
  role: IdiomEventRole
  timbre: string
  pan: number
}

export interface IdiomScore {
  idiomId: MusicalIdiomId
  idiomLabel: string
  scaleName: string
  scaleNameIt: string
  scaleCents: number[]
  tonicPc: number
  tempoBpm: number
  cycleBeats: number
  cycleName: string
  harmonyLabel: string
  rhythmLabel: string
  rhythmLabelEn: string
  phraseIndex: number
  tension: number
  events: IdiomEvent[]
  instruments: IdiomInstruments
}

export interface MusicalIdiomDefinition {
  id: MusicalIdiomId
  label: string
  italian: string
  inspiration: string
  description: string
  tuning: '12-tet' | '24-tet'
  tempoHint: number
  soundfont: 'default' | 'maestro'
  scales: IdiomScale[]
  instruments: IdiomInstruments
  harmony: {
    strategy: 'drone' | 'functional' | 'modal'
    progression: number[][]
    droneCents: number[]
    label: string
  }
  melody: {
    phraseBeats: number
    contour: 'arch' | 'wave' | 'descending' | 'ascending' | 'free'
    ornament: 'none' | 'grace' | 'meend' | 'gamak'
    density: number
  }
  rhythm: {
    cycle: string
    italian: string
    english: string
    beats: number
    pattern: number[]
  }
  timbre: {
    palette: string[]
    brightness: number
    roughness: number
  }
  spatial: {
    spreadDeg: number
    motion: number
  }
}

export type PlayParameterId =
  | 'canopy'
  | 'water'
  | 'stone'
  | 'light'
  | 'guests'
  | 'season'
  | 'wind'

export type PlayParameters = Record<PlayParameterId, number>

export interface PlayParameterDefinition {
  id: PlayParameterId
  label: string
  italian: string
  english: string
  lowLabel: string
  highLabel: string
  hint: string
  min: number
  max: number
  step: number
  hue: number
}

export type PlayGestureId =
  | 'rugiada'
  | 'potatura'
  | 'soglia'
  | 'sospensione'
  | 'risonanza'
  | 'fioritura'

export interface PlayGestureDefinition {
  id: PlayGestureId
  label: string
  italian: string
  description: string
  /** Minimum completed missions before the gesture can be used. */
  requiresCompletions: number
  deltas: Partial<PlayParameters>
}

export type PlayRenderModeId = 'diurno' | 'polline' | 'notturno' | 'aurora' | 'pioggia' | 'sciame'

export interface PlayPalette {
  skyTop: string
  skyHorizon: string
  sun: string
  ground: string
  groundShadow: string
  water: string
  waterGlow: string
  foliage: string
  stone: string
  pollen: string
  visitor: string
  glow: string
  fog: string
}

export interface PlayRenderModeDefinition {
  id: PlayRenderModeId
  label: string
  italian: string
  description: string
  requiresCompletions: number
  palette: PlayPalette
  particleBias: number
  glowBias: number
}

export type PlayMaterialId =
  | 'terra'
  | 'acqua'
  | 'pietra'
  | 'legno'
  | 'foglia'
  | 'ferro'
  | 'vetro'
  | 'specchio'

export interface PlayMaterialDefinition {
  id: PlayMaterialId
  label: string
  italian: string
  requiresCompletions: number
}

export type SeasonPhase = 'risveglio' | 'fioritura' | 'maturita' | 'caduta' | 'riposo'

export interface PlaySeason {
  value: number
  phase: SeasonPhase
  label: string
  temperatureC: number
  leafFactor: number
  bloom: number
  paletteShift: number
}

export interface PlayGeometry {
  groundWidthM: number
  groundDepthM: number
  canopyHeightM: number
  canopyRadiusM: number
  canopyCoverage: number
  treeCount: number
  shrubCount: number
  groundCoverCount: number
  waterRadiusM: number
  waterAreaM2: number
  waterLevelM: number
  stoneCount: number
  stoneHeightM: number
  pathCount: number
  lanternCount: number
  visitorOrbs: number
  verticality: number
  windSway: number
}

export interface PlayMaterials {
  stoneRatio: number
  waterRatio: number
  canopyRatio: number
  softRatio: number
  hardRatio: number
  reflectivity: number
  bloom: number
  usedMaterialIds: PlayMaterialId[]
}

export interface PlayAcoustics {
  volumeM3: number
  surfaceAreaM2: number
  meanAbsorption: number
  meanScattering: number
  t60S: number
  roomConstantM2: number
  directToReverberantDb: number
  clarity: number
  sti: number
  intelligibility: number
  spatialClarity: number
  waterMasking: number
  windMasking: number
  crowdMasking: number
  noiseFloorDb: number
  absorptionBands: number[]
  scatteringBands: number[]
  method: 'sabine-estimate'
}

export interface PlayMusic {
  descriptor: MusicalDescriptor
  register: Register
  mode: Mode
  timbre: Timbre
  pulse: number
  spread: number
  dataWeight: number
  descriptorLabel: string
  idiomId: MusicalIdiomId
  idiom: MusicalIdiomDefinition
  idiomScore: IdiomScore
}

export interface PlayEnvironmental {
  readings: EnvironmentalReading[]
  dataToMusic: DataToMusicResult
  pollutionIndex: number
  airQuality: number
  waterQuality: number
  lightLevel: number
  temperatureC: number
  humidityPct: number
  dominantMetric: string
}

export interface PlaySocial {
  visitorCount: number
  visitorInputs: VisitorMusicalInput[]
  coexistence: CoexistenceResult
  distinctKeys: number
  roles: string[]
  inclusion: number
  crowding: number
  refuge: number
  waterAudibility: number
}

export interface PlayVegetation {
  designs: PlantingDesign[]
  audits: Record<string, PaletteAudit>
  strata: Record<PlantStratum, number>
  foliage: Record<'small' | 'medium' | 'large', number>
  speciesIds: string[]
  nativeRatio: number
  evergreenRatio: number
  canopyProjectionM2: number
  ecologicalBalance: number
}

export interface PlayScore {
  musicalCoherence: number
  ecologicalBalance: number
  inclusion: number
  spatialClarity: number
  novelty: number
}

export interface PlayWorld {
  parameters: PlayParameters
  season: PlaySeason
  geometry: PlayGeometry
  materials: PlayMaterials
  acoustics: PlayAcoustics
  music: PlayMusic
  environmental: PlayEnvironmental
  social: PlaySocial
  vegetation: PlayVegetation
}

export interface PlayComposition extends PlayWorld {
  scores: PlayScore
}

export type MissionRequirementKind =
  | 'parameter'
  | 'descriptor'
  | 'acoustic'
  | 'social'
  | 'ecological'
  | 'score'
  | 'season'

export interface MissionRequirement {
  id: string
  kind: MissionRequirementKind
  label: string
  hint: string
  passed: (composition: PlayComposition) => boolean
}

export interface PlayMission {
  id: string
  index: number
  title: string
  italian: string
  invocation: string
  description: string
  poeticHint: string
  requiresCompletions: number
  requirements: MissionRequirement[]
}

export interface MissionEvaluation {
  missionId: string
  passed: boolean
  requirements: Array<{ id: string; label: string; hint: string; passed: boolean }>
  completedCount: number
}

export type PlayObjectMode = 'landscape' | 'indoor'

export type PlayObjectKind =
  | 'tree-small'
  | 'tree-medium'
  | 'tree-large'
  | 'shrub'
  | 'ground-cover'
  | 'water'
  | 'path'
  | 'canopy'
  | 'bench'
  | 'stone'
  | 'light'
  | 'room-volume'
  | 'table'
  | 'chair'
  | 'sofa'
  | 'window'
  | 'door'
  | 'wall'
  | 'column'
  | 'rug'
  | 'curtain'
  | 'panel'
  | 'speaker'

export interface PlayObjectSpec {
  id: string
  kind: PlayObjectKind
  label: string
  /** For `kind: 'speaker'`: which dramatis persona this voice embodies. */
  personaId?: PersonaKind
  xM: number
  zM: number
  widthM: number
  depthM: number
  heightM: number
  baseHeightM: number
  rotationDeg: number
  materialId: string
  color: string
}

export interface PlayProgression {
  completedCount: number
  stage: number
  title: string
  nextTitle: string | null
  nextThreshold: number | null
  unlockedSpeciesIds: string[]
  unlockedMaterialIds: PlayMaterialId[]
  unlockedRenderModeIds: PlayRenderModeId[]
  unlockedGestureIds: PlayGestureId[]
}

export interface PlayProgress {
  schemaVersion: 1
  /** Tier 1 habitat archetype currently inhabiting the scene. */
  habitatId: string
  /** Generative musical world. */
  idiomId: MusicalIdiomId
  parameters: PlayParameters
  activeMissionId: string
  completedMissionIds: string[]
  renderMode: PlayRenderModeId
  lastGesture: PlayGestureId | null
  applied: boolean
  objectMode: PlayObjectMode
  objects: PlayObjectSpec[]
}

export interface PlayTick {
  composition: PlayComposition
  progression: PlayProgression
  mission: PlayMission
  missionEvaluation: MissionEvaluation
  missions: Array<{ mission: PlayMission; completed: boolean; unlocked: boolean }>
}
