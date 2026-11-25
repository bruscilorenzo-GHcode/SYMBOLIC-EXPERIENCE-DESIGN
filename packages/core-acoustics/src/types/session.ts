import type { BandSeries, IsoDateTime, SchemaVersion, Vec3 } from './common'
import type { SpeakerPlacement } from './speaker'

export type SpatializationMode = 'object' | 'hoa' | 'vbap' | 'dbap' | 'wfs' | 'binaural'
export type OutputProtocol = 'analog' | 'dante' | 'aes67' | 'ravenna' | 'avb' | 'usb' | 'virtual'

export interface TrajectoryKeyframe {
  /** Seconds from session origin. */
  tSec: number
  positionM: Vec3
  orientationDeg?: Vec3
  gainDb?: number
  spreadDeg?: number
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step'
  label?: string
}

export interface SpatialSource {
  id: string
  name: string
  kind: 'audio-file' | 'live-input' | 'generator' | 'ai-agent' | 'sensor-sonification' | 'field-recording'
  positionM: Vec3
  orientationDeg: Vec3
  spatialization: SpatializationMode
  busId: string
  gainDb: number
  spreadDeg: number
  distanceModel: 'inverse' | 'linear' | 'exponential' | 'none'
  refDistanceM: number
  maxDistanceM: number
  rolloffFactor: number
  dopplerFactor: number
  mute: boolean
  solo: boolean
  priority: number
  trajectory: {
    enabled: boolean
    loop: boolean
    keyframes: TrajectoryKeyframe[]
  }
  directivity?: {
    kind: 'omni' | 'cardioid' | 'shotgun' | 'custom'
    polar?: BandSeries
  }
  color: string
  metadata?: Record<string, unknown>
}

export interface OutputChannel {
  id: string
  index: number
  label: string
  busId: string
  speakerPlacementId?: string
  protocol: OutputProtocol
  deviceId: string
  deviceChannel: number
  gainDb: number
  delayMs: number
  polarity: 0 | 1
  muted: boolean
  /** Optional Dante/AES67 flow identity. */
  flowId?: string
  multicastAddress?: string
}

export interface RendererConfig {
  primary: SpatializationMode
  hoaOrder: 1 | 2 | 3 | 4 | 5 | 6 | 7
  sampleRateHz: number
  blockSize: number
  speakerLayout: 'custom' | 'stereo' | 'quad' | '5.1' | '7.1.4' | 'cube' | 'dome' | 'wavefield-grid'
  normalization: 'sn3d' | 'n3d' | 'fuma'
  distanceEncoding: 'basic' | 'max-rE' | 'custom'
  vbap: {
    dimensionality: 2 | 3
    spreadDeg: number
    imaginarySpeakerRing: boolean
  }
  dbap: {
    rolloffDbPerDoubling: number
    blurExponent: number
    referenceDistanceM: number
  }
  wfs: {
    drivingFunction: 'nfc-hoa' | 'wfs-delay' | 'wfs-2.5d'
    secondarySourceSpacingM: number
    maxFrequencyHz: number
  }
  binaural: {
    hrtfId: string
    crossfeed: number
    externalization: number
  }
}

export interface AiGenerativeNode {
  id: string
  name: string
  role: 'foley' | 'ambient-bed' | 'spectral-drone' | 'reactive-texture' | 'narrator' | 'co-composer'
  provider: {
    kind: 'local' | 'cloud' | 'hybrid'
    modelId: string
    endpoint?: string
  }
  prompt: string
  negativePrompt?: string
  seed?: number
  temperature: number
  parameters: Record<string, number | string | boolean>
  bindings: {
    audioBusId: string
    sourceId?: string
    sensorIds: string[]
    spatialization: SpatializationMode
  }
  guardrails: {
    maxSplDb: number
    maxDurationS: number
    contentPolicy: string
    humanApprovalRequired: boolean
  }
  enabled: boolean
}

export interface LivePerformerStream {
  id: string
  performer: {
    name: string
    role: 'musician' | 'vocalist' | 'dancer' | 'field-agent' | 'audience'
    remote: boolean
  }
  transport: 'webrtc' | 'sip' | 'rtmp' | 'local'
  endpoint?: string
  codec: 'opus' | 'pcm' | 'aac'
  sampleRateHz: number
  channels: number
  latencyTargetMs: number
  jitterBufferMs: number
  spatialSourceId?: string
  monitoring: 'none' | 'direct' | 'spatial'
  enabled: boolean
}

export interface EnvironmentalSensor {
  id: string
  name: string
  kind: 'weather' | 'occupancy' | 'light' | 'humidity' | 'temperature' | 'wind' | 'air-quality' | 'custom'
  protocol: 'mqtt' | 'http' | 'osc' | 'websocket' | 'modbus'
  endpoint: string
  pollRateHz: number
  mapping: {
    target: 'ai-parameter' | 'renderer-parameter' | 'source-position' | 'gain' | 'filter' | 'visual'
    targetId: string
    inputMin: number
    inputMax: number
    outputMin: number
    outputMax: number
    curve: 'linear' | 'log' | 'exp' | 'step'
  }[]
  enabled: boolean
}

export interface OscTarget {
  id: string
  host: string
  port: number
  transport: 'udp' | 'websocket'
  enabled: boolean
  /** Maximum packet rate for this target. Bundles are emitted at this cadence. */
  updateRateHz: number
  /** Optional address prefix override, default `/aura/v1`. */
  namespace?: string
  bundleTimetags: boolean
  label?: string
}

export interface OscSessionConfig {
  enabled: boolean
  namespace: string
  targets: OscTarget[]
  clock: {
    enabled: boolean
    rateHz: number
    ppqn: number
  }
  sendSpeakerDrive: boolean
  sendRendererState: boolean
  sendSensorValues: boolean
}

export interface TransportState {
  playing: boolean
  bpm: number
  timeSignature: [number, number]
  positionBeats: number
  positionSeconds: number
  loop: {
    enabled: boolean
    startBeat: number
    endBeat: number
  }
}

export interface CollaborationMeta {
  documentId: string
  provider: 'yjs' | 'automerge' | 'local'
  websocketUrl?: string
  awareness: {
    enabled: boolean
    displayName: string
    color: string
  }
  permissions: {
    ownerId: string
    editors: string[]
    viewers: string[]
  }
}

export interface SpatialAudioSession {
  schemaVersion: SchemaVersion
  id: string
  projectId: string
  environmentId: string
  name: string
  speakerPlacements: SpeakerPlacement[]
  outputs: OutputChannel[]
  sources: SpatialSource[]
  renderer: RendererConfig
  aiNodes: AiGenerativeNode[]
  liveStreams: LivePerformerStream[]
  sensors: EnvironmentalSensor[]
  osc: OscSessionConfig
  transport: TransportState
  collaboration: CollaborationMeta
  conditions: {
    temperatureC: number
    humidityPct: number
    pressureKPa: number
    windSpeedMs: number
    windDirectionDeg: number
  }
  metadata: {
    createdAt: IsoDateTime
    updatedAt: IsoDateTime
    author: string
    tags: string[]
    notes?: string
  }
}

export interface AuraProjectDocument {
  schemaVersion: SchemaVersion
  id: string
  name: string
  environment: import('./environment').ArchitecturalEnvironment
  session: SpatialAudioSession
  speakerProfiles: import('./speaker').AcousticSpeakerProfile[]
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  /** SHA-256 of the canonical JSON payload, computed by the collaboration service. */
  contentHash?: string
}
