# Data Model

The TypeScript contracts live in `packages/core-acoustics/src/types/` and are exported from `@aura-spec/core-acoustics`. This document explains the intent, invariants and serialisation rules; the code is the executable schema.

```
types/common.ts       units, transforms, provenance, band series
types/speaker.ts      profiles, polar data, placements, catalog metadata
types/environment.ts  geometry, materials, zones, listener planes, imports
types/session.ts      sources, renderer, outputs, AI, live streams, OSC, project
```

---

## 1. Primitive conventions

```ts
type Vec2 = readonly [number, number]
type Vec3 = readonly [number, number, number]

interface BandSeries {
  frequenciesHz: number[]
  values: number[]
  unit?: string
}

interface Provenance {
  source: string
  sourceUrl?: string
  retrievedAt: string       // ISO-8601
  license: string
  verification: 'manufacturer' | 'distributor' | 'measured' | 'estimated' | 'illustrative'
  checksumSha256?: string
  notes?: string
}
```

- All geometry is **metres**, **right-handed**, **Y up**.
- `Vec2` polygons are `[x, z]` plan coordinates.
- `Vec3` orientation is `[yaw, pitch, roll]` degrees, intrinsic Y-X-Z.
- `BandSeries.frequenciesHz` and `.values` must have equal length; frequencies must ascend.
- `BandSeries` is used for sensitivity, impedance, max SPL, absorption and scattering.
- `Provenance` is mandatory on every speaker profile. It is not optional metadata.

---

## 2. `AcousticSpeakerProfile`

Defined in `types/speaker.ts`. The important nested types:

```ts
type SpeakerKind =
  | 'point-source'
  | 'line-array'
  | 'column'
  | 'subwoofer'
  | 'omnidirectional'
  | 'acoustic-lens'
  | 'surface-transducer'
  | 'coaxial'
  | 'horn'

interface PolarGrid {
  frequenciesHz: number[]
  azimuthsDeg: number[]
  elevationsDeg: number[]
  valuesDb: number[][][]   // [band][elevation][azimuth]
  normalization: 'on-axis-0db' | 'max-0db' | 'absolute'
  referenceDistanceM: number
}

type ParametricDirectivity =
  | { model: 'omnidirectional' }
  | { model: 'cardioid'; rearAttenuationDb?: number }
  | { model: 'supercardioid'; rearAttenuationDb?: number }
  | { model: 'line-array'; lengthM: number; elementCount: number; elementSpacingM: number; steerDeg?: number; verticalWindowDeg?: number }
  | { model: 'lens'; horizontalBeamwidthDeg: number; verticalBeamwidthDeg: number; rearAttenuationDb?: number }

interface PolarDataSet {
  kind: 'grid' | 'sh' | 'parametric'
  normalization: 'on-axis-0db' | 'max-0db' | 'absolute'
  referenceDistanceM: number
  grid?: PolarGrid
  sh?: SphericalHarmonicSet
  parametric?: ParametricDirectivity
  sourceFormat?: 'aura-polar-csv-v1' | 'gll' | 'clf' | 'ease' | 'measurement' | 'synthetic'
}
```

### 2.1 Design decisions

- **Grid-first**: the measured/imported balloon is the source of truth. SH coefficients and GPU atlases are derived artefacts.
- **Normalisation is explicit**: a grid of absolute SPL values must say `absolute`; otherwise the sampler assumes relative dB.
- **Reference distance is explicit**: some manufacturers normalise to 1 m, some to 10 m. Never infer it from the filename.
- **Parametric models are labelled synthetic**: they are useful for early-stage design and tests, not for specification.

### 2.2 Profile fields

| Group | Fields | Notes |
|---|---|---|
| Identity | `id`, `manufacturer`, `model`, `kind`, `tags` | IDs are stable UUIDs/slugs, never reused |
| Acoustics | bands, sensitivity, max SPL, impedance, power, directivity, DI/Q, dispersion, line-array/lens specs | Band series lengths must match |
| Electrical | low-Z / 70 V / 100 V / self-powered / PoE / Dante-powered, taps, connectors, amplifier recommendation, Dante/AES67/AVB | Tap wattage is per unit |
| Physical | dimensions, weight, materials, IP, temperature range, mounting points, colours | IP is checked against zone exposure |
| Accessories | mounts, brackets, cables, weather shields | `included` distinguishes base scope from options |
| Files | GLL, CLF, EASE, datasheet, measurement archive, IRs | Store content hashes in the catalog service |
| Provenance | source, licence, verification, checksum | Required |
| Extensions | `Record<string, unknown>` | Vendor-specific data that does not belong in the core |

### 2.3 Speaker placement

`SpeakerPlacement` is the project-specific instance:

```ts
interface SpeakerPlacement {
  id: string
  profileId: string
  label: string
  positionM: Vec3
  orientationDeg: Vec3       // [yaw, pitch, roll]
  gainDb: number
  delayMs: number
  polarity: 0 | 1
  amplifierChannelId?: string
  outputChannelId?: string
  zoneId?: string
  groupIds: string[]
  locked: boolean
}
```

The placement does **not** duplicate the profile's acoustics. It references a profile revision pinned by the project.

---

## 3. `ArchitecturalEnvironment`

Defined in `types/environment.ts`.

```ts
interface ArchitecturalEnvironment {
  schemaVersion: '1.0.0'
  id: string
  name: string
  coordinateSystem: { handedness: 'right'; upAxis: 'Y'; units: 'm'; trueNorthDeg?: number }
  geo?: GeoReference
  layers: EnvironmentLayer[]
  materials: SurfaceMaterial[]
  surfaces: BoundarySurface[]
  zones: AcousticZone[]
  listenerPlanes: ListenerPlane[]
  imports: { cad: CadImportReference[]; raster: RasterImportReference[] }
  defaultConditions: { temperatureC: number; humidityPct: number; pressureKPa: number; windSpeedMs: number; windDirectionDeg: number }
  metadata: { createdAt: string; updatedAt: string; author: string; tags: string[] }
}
```

### 3.1 Materials

`SurfaceMaterial` carries octave-band:

- `absorption` (`0..1`),
- `scattering` (`0..1`),
- optional `transmissionLossDb`.

A surface may override the material's absorption/scattering/transmission for a specific construction. Overrides are explicit and reviewable.

### 3.2 Geometry

`BoundaryGeometry` supports:

- `mesh` — positions/indices/normals/uvs for imported 3D,
- `polygon-extrusion` — footprint + height,
- `plane` — width/depth + transform,
- `box` — size + transform.

M0 uses simple extrusions and boxes. A CAD/BIM kernel is a later concern; the schema is already mesh-ready.

### 3.3 Zones

Zones carry:

- `kind`: room, open-air, transition, listener, service,
- `exposure`: indoor, sheltered, outdoor, submerged,
- acoustic overrides (T60, temperature, humidity, wind),
- occupancy capacity,
- tags for BOM and AI rules.

### 3.4 Listener planes

A listener plane is a polygon at a height with a sampling resolution and optional design targets:

```ts
interface ListenerPlane {
  id: string
  name: string
  heightM: number
  footprint: Vec2[]
  resolutionM: number
  targets?: {
    minSplDb?: number
    maxSplDb?: number
    uniformityDb?: number
    minSti?: number
    minDirectToReverberantDb?: number
  }
  tags: string[]
}
```

Targets are **design intent**, not measured results. Reports must show both.

### 3.5 Imports and calibration

`CadImportReference` and `RasterImportReference` store:

- source file name and format,
- scale to metres,
- origin and rotation,
- calibration method and confidence,
- review status.

A raster trace without a calibration method is not admissible for a compliance report.

---

## 4. `SpatialAudioSession`

Defined in `types/session.ts`.

```ts
interface SpatialAudioSession {
  schemaVersion: '1.0.0'
  id: string
  projectId: string
  environmentId: string
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
  conditions: { temperatureC: number; humidityPct: number; pressureKPa: number; windSpeedMs: number; windDirectionDeg: number }
  metadata: { ... }
}
```

### 4.1 Sources

A source is a **compositional object**, not just an audio file:

- identity and kind (`audio-file`, `live-input`, `generator`, `ai-agent`, `sensor-sonification`, `field-recording`),
- position/orientation,
- spatialisation mode (`object`, `hoa`, `vbap`, `dbap`, `wfs`, `binaural`),
- bus, gain, spread, distance model and rolloff,
- trajectory with keyframes and easing,
- directivity,
- colour and metadata.

Trajectory keyframes use session time in seconds. The renderer evaluates them at audio block boundaries with sample-accurate interpolation.

### 4.2 Renderer

`RendererConfig` is intentionally explicit:

```ts
interface RendererConfig {
  primary: SpatializationMode
  hoaOrder: 1 | 2 | 3 | 4 | 5 | 6 | 7
  sampleRateHz: number
  blockSize: number
  speakerLayout: 'custom' | 'stereo' | 'quad' | '5.1' | '7.1.4' | 'cube' | 'dome' | 'wavefield-grid'
  normalization: 'sn3d' | 'n3d' | 'fuma'
  distanceEncoding: 'basic' | 'max-rE' | 'custom'
  vbap: { dimensionality: 2 | 3; spreadDeg: number; imaginarySpeakerRing: boolean }
  dbap: { rolloffDbPerDoubling: number; blurExponent: number; referenceDistanceM: number }
  wfs: { drivingFunction: 'nfc-hoa' | 'wfs-delay' | 'wfs-2.5d'; secondarySourceSpacingM: number; maxFrequencyHz: number }
  binaural: { hrtfId: string; crossfeed: number; externalization: number }
}
```

Normalisation matters: SN3D/N3D/FuMa produce different channel gains. Export it with every render.

### 4.3 Outputs and infrastructure

`OutputChannel` connects a bus to a physical channel:

```ts
interface OutputChannel {
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
  flowId?: string
  multicastAddress?: string
}
```

This is the join point for BOM, Dante flows and commissioning tables.

### 4.4 AI nodes

`AiGenerativeNode` stores:

- role (`foley`, `ambient-bed`, `spectral-drone`, `reactive-texture`, `narrator`, `co-composer`),
- provider (local/cloud/hybrid, model id, endpoint),
- prompt, seed, temperature, parameters,
- bindings to audio bus, source, sensors,
- guardrails (max SPL, max duration, content policy, approval).

The model output is never stored as an opaque blob without a seed and model version.

### 4.5 Live streams and sensors

- `LivePerformerStream` declares transport (WebRTC/SIP/RTMP/local), codec, sample rate, channels, latency target, jitter buffer, monitoring mode.
- `EnvironmentalSensor` declares protocol, poll rate and mappings to AI/renderer/source parameters.

Sensor mappings are explicit ranges and curves; no hidden normalisation.

### 4.6 OSC

`OscSessionConfig` contains:

- namespace (default `/aura/v1`),
- targets with host/port/transport/update rate/bundle timetags,
- clock settings,
- flags for speaker drive, renderer state and sensor values.

The address space is documented in `docs/04-osc-bridge.md`.

---

## 5. `AuraProjectDocument`

The project envelope pins the environment, session and **profile snapshot**:

```ts
interface AuraProjectDocument {
  schemaVersion: '1.0.0'
  id: string
  name: string
  environment: ArchitecturalEnvironment
  session: SpatialAudioSession
  speakerProfiles: AcousticSpeakerProfile[]
  createdAt: string
  updatedAt: string
  contentHash?: string
}
```

A project that references a catalog profile must embed the exact revision used. This prevents a catalog update from silently changing an approved design.

---

## 6. Serialisation and hashing

### 6.1 Canonical JSON

Before hashing or signing:

1. Remove `undefined` values.
2. Sort object keys lexicographically at every level.
3. Reject `NaN` and `±Infinity`.
4. Normalise `-0` to `0`.
5. Use UTF-8 without BOM.
6. Keep array order (it is meaningful for bands, polygons and keyframes).

`contentHash = SHA-256(canonicalJson)`.

### 6.2 Schema versioning

- `schemaVersion` is a literal string (`"1.0.0"`).
- Additive optional fields are allowed within a minor version.
- Breaking changes require a migration function and golden fixtures.
- The catalog service stores the parser version alongside the source file.

### 6.3 Units

The schema uses suffixes (`M`, `Hz`, `Db`, `W`, `S`, `Deg`) to make units visible in code review. Do not add unit-less numeric fields for physical quantities.

---

## 7. Catalog ingestion mapping

| Source | Mapping | Risks |
|---|---|---|
| GLL | Frequency/angle grids, sensitivity, impedance, directivity | Binary format; vendor-specific extensions |
| CLF | Common Loudspeaker Format v1/v2 | Legacy angle conventions; missing phase |
| EASE | Polar/balloon data, material libraries | Proprietary project context |
| CSV/TSV | Parser in `polar/parser.ts` | Irregular grids, missing metadata |
| PDF datasheet | Human-reviewed extraction | Not machine-authoritative |
| Measured balloon | Preferred | Requires calibration and provenance |

Every imported profile must pass `validateSpeakerProfile` and retain the original file hash.

---

## 8. Collaboration document layout

`packages/collab/src/document.ts` creates a Yjs document:

```
meta        Y.Map   sessionId, projectId, schemaVersion
sources     Y.Map<Y.Map>   scalar fields + Y.Array position/orientation
placements  Y.Map<Y.Map>   speaker fields
renderer    Y.Map
transport   Y.Map
```

Rules:

- One Yjs document per project session.
- Awareness carries cursor, selection, display name and colour; it is not persisted as project data.
- The server persists periodic snapshots (`Y.encodeStateAsUpdate`) plus an append-only update log for recovery.
- Structural geometry edits are locked during collaborative sessions until the geometry merge policy lands.

---

## 9. Validation checklist

For every profile:

- [ ] `schemaVersion` is supported.
- [ ] ID and model code are non-empty.
- [ ] Band arrays are equal length and ascending.
- [ ] Sensitivity, max SPL and impedance are finite and physically plausible.
- [ ] Power handling is positive and peak ≥ RMS.
- [ ] Directivity payload matches `kind`.
- [ ] Grid dimensions match the angle axes.
- [ ] SH coefficient count is `(order+1)²`.
- [ ] IP rating matches `/^IP\d{2}$/`.
- [ ] Provenance is present.
- [ ] Illustrative data is flagged.

For every project:

- [ ] Geometry is calibrated and reviewed.
- [ ] Materials are assigned to all relevant surfaces.
- [ ] Listener planes cover the intended audience area.
- [ ] Speaker profiles are pinned.
- [ ] Conditions match the site/season.
- [ ] Export contains renderer normalisation and latency.
