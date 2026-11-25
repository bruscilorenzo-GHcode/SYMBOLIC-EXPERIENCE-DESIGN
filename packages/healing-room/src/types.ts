export type HealingZoneId = 'vestibule' | 'observation' | 'focus'

export type MindStateId = 'everyday' | 'observing' | 'focused' | 'empty'

export type HealingLayoutId = 'linear' | 'concentrated'

export type StationKind = 'kiosk-4' | 'capsule-16' | 'event-255'

/**
 * The four registers of the Healing Room communication brief:
 * with Self, with the Digital Twin (doppelgänger), with Others, with Artefacts.
 */
export type CommunicationChannel = 'self' | 'twin' | 'others' | 'artefacts'

export interface CommunicationChannelDefinition {
  id: CommunicationChannel
  label: string
  labelIt: string
  summary: string
  summaryIt: string
}

export interface DiagnosticSample {
  id: string
  channel: CommunicationChannel
  /** Normalised intensity in 0..1 as reported or measured for the channel. */
  value: number
  /** Caller-supplied epoch milliseconds; the engine stays clock-free. */
  at: number
}

export interface DoppelgangerTrait {
  channel: CommunicationChannel
  weight: number
}

export interface DoppelgangerSpec {
  /** Deterministic hue in 0..360 derived from the sample set. */
  hue: number
  /** Resting breath pulse in Hz (≈ 0.08–0.32, i.e. 5–19 breaths per minute). */
  breathHz: number
  /** Orbit radius in metres of the circulating satellite elements. */
  orbitRadiusM: number
  /** 0..1 structural complexity of the entity. */
  complexity: number
  /** 0..1 body luminance: quieter samples render brighter bodies. */
  luminance: number
  /** Number of circulating satellite elements, 3..12. */
  satellites: number
  /** Communication channel that dominates the current sample set. */
  dominantChannel: CommunicationChannel
  traits: DoppelgangerTrait[]
  descriptorLabel: string
  descriptorLabelIt: string
}

export type HealingArtifactForm = 'lotus' | 'monolith' | 'orb' | 'lattice'

export interface HealingArtifactSpec {
  form: HealingArtifactForm
  heightM: number
  radiusM: number
  hue: number
  /** Slow rotation speed in Hz for the materialised goal. */
  rotationHz: number
}

export interface HealingGoalSpec {
  id: string
  title: string
  titleIt: string
  mantra: string
  mantraIt: string
  /** 0..1 progress of the materialisation: 0 hidden, 1 fully present. */
  materialisation: number
  artifact: HealingArtifactSpec
}

export interface HealingZoneSpec {
  id: HealingZoneId
  name: string
  nameIt: string
  purpose: string
  purposeIt: string
  /** Measured area in m² from the brief, or null when the brief leaves it open. */
  areaSqm: number | null
}

export interface ZoneFootprint {
  id: HealingZoneId
  xM: number
  zM: number
  widthM: number
  depthM: number
}

export interface HealingLayoutSpec {
  id: HealingLayoutId
  label: string
  labelIt: string
  description: string
  descriptionIt: string
  footprints: ZoneFootprint[]
}

export interface StationSpec {
  kind: StationKind
  label: string
  labelIt: string
  areaSqm: number
  sphericalDisplay: boolean
  soundShower: boolean
  isolation: boolean
  description: string
  descriptionIt: string
}

export interface MindStateDefinition {
  id: MindStateId
  label: string
  labelIt: string
  /** Inclusive lower focus threshold of the state. */
  threshold: number
  guidance: string
  guidanceIt: string
}

export interface HealingSoundbed {
  droneHz: number
  tempoBpm: number
  density: number
  brightness: number
  /** Breath cycle length in seconds that paces the soundbed. */
  breathSeconds: number
}

export interface HealingSessionState {
  zone: HealingZoneId
  layout: HealingLayoutId
  station: StationKind
  /** Concentration depth in 0..1: everyday → observing → focused → empty. */
  focus: number
  samples: DiagnosticSample[]
  doppelganger: DoppelgangerSpec | null
  goal: HealingGoalSpec | null
}

export type FocusGateReason = 'data' | 'focus'

export interface FocusGate {
  ok: boolean
  reason: FocusGateReason | null
  /** Minimum number of diagnostic samples required for the focus area. */
  requiredSamples: number
  /** Minimum focus depth required for the focus area. */
  requiredFocus: number
}
