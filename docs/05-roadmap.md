# Development Roadmap

The roadmap is organised around a single vertical slice:

```
Import → Place → Polar coverage heatmap → Multichannel OSC export
```

Everything else is sequenced behind a trustworthy version of that slice.

---

## Milestone 0 — Foundation (this scaffold)

**Goal:** make the contracts and the first end-to-end demo real.

### Deliverables

- Monorepo, package boundaries, TypeScript project references.
- `AcousticSpeakerProfile`, `ArchitecturalEnvironment`, `SpatialAudioSession`, `AuraProjectDocument`.
- Deterministic SPL, air absorption, line-array decay, D/R, STI estimate, phase coherence.
- Polar CSV parser, IDW resampling, SH fit, equirectangular atlas, GLSL.
- OSC 1.0 codec, address space, diff publisher, UDP/WebSocket transports.
- Catalog seed + validation, clearly marked illustrative.
- Yjs document schema and minimal relay.
- Three.js studio: courtyard, speakers, polar balloons, heatmap, inspector.
- Tests and typechecks.

### Acceptance criteria

- `npx vitest run --config vitest.config.ts` passes.
- Core packages typecheck with `tsc`.
- A polar CSV can be parsed, normalised, baked to an atlas and rendered as a balloon.
- One listener plane produces a finite heatmap from placed speakers.
- OSC messages round-trip and the diff publisher suppresses unchanged fields.
- The demo runs with `pnpm dev` after `pnpm install`.

### Explicitly out of scope

- Real DWG/DXF/PDF ingestion.
- GLL/CLF binary parsing.
- A sample-accurate audio engine.
- HOA/VBAP/DBAP DSP.
- AI generation.
- Production auth, multi-tenant cloud, billing.

---

## Milestone 1 — Import and placement

**Goal:** replace the synthetic courtyard with a real architectural workflow.

### Deliverables

1. **DXF import**
   - layers, units, blocks, polylines,
   - wall/floor/ceiling classification with a review UI,
   - scale verification.
2. **Vector PDF import**
   - page rasterisation fallback,
   - two-point scale calibration,
   - line/arc extraction with confidence.
3. **Raster import**
   - PNG/JPG upload,
   - two-point calibration,
   - manual polyline tracing + assisted boundary suggestions,
   - confidence and review state.
4. **2.5D/3D generation**
   - footprint extrusion,
   - openings,
   - material assignment,
   - zone creation.
5. **Placement tools**
   - click-to-place, snap to wall/ceiling/grid,
   - orientation gizmo,
   - array/line/ring tools,
   - lock/group/align.
6. **Project persistence**
   - canonical JSON export/import,
   - schema migration harness,
   - content hash.

### Acceptance criteria

- A real 20 × 15 m plan can be imported, calibrated and extruded within 15 minutes by a trained user.
- Wall/floor/ceiling misclassification is reviewable and does not silently enter the acoustic model.
- A speaker can be placed and oriented in 3D with keyboard/mouse only.
- Save → reload → export produces byte-identical canonical JSON for unchanged data.

### Test strategy

- Golden DXF/PDF fixtures with known dimensions.
- Calibration round-trip tests.
- Geometry validity tests (non-self-intersecting footprints, closed loops).
- Snapshot tests for the canonical JSON.

### Risks

- CAD files are inconsistent; invest in review UI, not magic.
- PDF vector extraction is fragile; keep raster fallback.
- Large meshes can stall the UI; use workers and level-of-detail.

---

## Milestone 2 — Polar coverage and specification

**Goal:** make the platform credible for acoustic design and hardware specification.

### Deliverables

1. **Certified catalog ingest**
   - GLL/CLF parser + golden fixtures,
   - EASE import (where licensed),
   - manufacturer revisioning and provenance,
   - replace illustrative seed data.
2. **Coverage engine**
   - direct SPL per band,
   - D/R and STI estimate,
   - coverage uniformity and overlap,
   - listener-plane and mesh receivers,
   - worker-based heatmaps with cancellation.
3. **Polar tooling**
   - import preview and seam checks,
   - on-axis / max normalization controls,
   - SH order selection and error display,
   - balloon comparison.
4. **Hardware graph and BOM**
   - amplifier channel assignment,
   - low-Z / 70 V / 100 V checks,
   - impedance and power budget,
   - IP/weather matrix,
   - Dante/AES67 channel and bandwidth budget.
5. **Reports**
   - coverage report with assumptions,
   - BOM and cable schedule,
   - network/latency budget,
   - provenance appendix.
6. **Landscape culture audit**
   - plant strata and foliage-scale coverage,
   - native/Mediterranean and evergreen ratios,
   - wind-sensitive species exposure,
   - wired vs Bluetooth wiring for each zone,
   - Syntagma-derived visitor coexistence,
   - textual meta-composition validation,
   - MUSI-CO / Mindkestra DATA→MUSIC per zone.

### Acceptance criteria

- A manufacturer GLL/CLF file imports without manual editing and passes validation.
- A 400 m² listener plane at 0.5 m resolution with 20 sources computes in under 250 ms off the main thread.
- The BOM totals reconcile with the speaker placements and output channels.
- Every report states the catalog revision, weather conditions, normalization and calculation version.
- Illustrative data is impossible to export without an explicit “illustrative” watermark.

### Test strategy

- Cross-check direct SPL against a trusted reference tool for 3–5 canonical cases.
- Compare octave-band absorption/T60 against measured rooms.
- Property tests for coverage statistics.
- BOM invariants: quantity sums, channel uniqueness, tap load.

### Risks

- GLL/CLF licensing and binary complexity.
- STI estimates being mistaken for certified measurements.
- Optimisation producing visually uniform but perceptually poor results.

---

## Milestone 3 — Real-time spatial composition

**Goal:** make the design audible and performable.

### Deliverables

1. **Audio engine**
   - 8/16/32-channel output,
   - HOA up to 7th order,
   - VBAP and DBAP,
   - WFS approximation,
   - binaural monitoring,
   - sample-accurate trajectory interpolation.
2. **OSC bridge production**
   - local relay with target health,
   - bundle timetags,
   - clock sync,
   - Max/SuperCollider templates,
   - CLAP/VST3 prototype.
3. **Routing and hardware**
   - Dante/AES67 flow export,
   - channel map and delay/trim table,
   - amplifier presets (vendor-specific where available).
4. **Collaboration**
   - multi-user editing with awareness,
   - comments and approvals,
   - snapshot/restore,
   - conflict review for geometry.
5. **Live inputs**
   - WebRTC/SIP audio,
   - MIDI/MPE,
   - sensor streams,
   - rehearsal recording.

### Acceptance criteria

- A source trajectory is rendered with no audible zipper noise at 48 kHz / 128 samples.
- The exported channel map matches the audio engine’s output channel-for-channel.
- OSC pitch: position updates at 60 Hz reach the engine within the declared budget.
- Two editors can move different sources concurrently without losing either change.
- A full rehearsal can be recorded and replayed from the project + packet log.

### Test strategy

- Loopback latency measurement.
- Null tests for bypass and static scenes.
- Panner energy tests (VBAP/DBAP/HOA).
- Network jitter/loss simulation.
- Multi-client CRDT convergence tests.

### Risks

- Real-time engine scope explosion; start with one renderer (VBAP) and one output backend.
- Dante integration requires vendor SDK/licensing and venue testing.
- Clock drift between browser, relay and audio host.

---

## Milestone 4 — AI dramaturgy and venue deployment

**Goal:** support long-running, responsive, multi-entity sound environments.

### Deliverables

1. **Generative agents**
   - procedural Foley,
   - ambient/spectral beds,
   - reactive drones,
   - narrative/co-composition roles,
   - local fallback models.
2. **Sensor ecology**
   - weather, occupancy, light, air quality,
   - mapping curves and smoothing,
   - privacy-preserving edge processing.
3. **Human–AI workflow**
   - proposal queue,
   - approval/rejection with notes,
   - A/B rehearsal,
   - provenance and model versioning,
   - SPL/content guardrails enforced at the renderer.
4. **Venue operations**
   - commissioning wizard,
   - limiters and emergency mute,
   - health dashboard,
   - show-control integration,
   - rollback pack.
5. **Research**
   - measured auralisation,
   - hybrid ray tracing,
   - perceptual validation of coverage/uniformity,
   - ecological soundscape metrics.

### Acceptance criteria

- An AI agent cannot exceed the configured SPL or duration without explicit approval.
- Sensor loss degrades gracefully to a composed fallback.
- A venue operator can mute, limit and restore the system without the authoring laptop.
- Every generative contribution is traceable to a model, seed and prompt version.
- A public performance can run for 8 hours without memory growth or clock drift beyond the declared budget.

### Risks

- AI cost/latency and non-determinism.
- Content rights and voice cloning.
- Privacy of occupancy/vision data.
- Operational complexity at the venue.

---

## Cross-cutting workstreams

| Workstream | M0 | M1 | M2 | M3 | M4 |
|---|---|---|---|---|---|
| Schema/migrations | v1 | migration harness | catalog revisions | collaboration fields | AI/venue fields |
| Landscape culture | demo tests | real planting survey | certified vegetation acoustics | visitor input trials | long-run ecological audit |
| Testing | unit | golden CAD | reference SPL | DSP/network | soak/security |
| Performance | baseline | worker import | worker heatmap | audio budget | 8 h soak |
| Docs | blueprint | import guide | catalog guide | deployment guide | operations manual |
| Security | threat model | upload sandbox | licence gates | RBAC/audit | venue hardening |

---

## Definition of done (every milestone)

- Contracts documented and versioned.
- Unit tests for new math; golden tests for new formats.
- Typecheck and build green.
- A demo project that exercises the new capability.
- A written risk/limitation note.
- No illustrative data silently promoted to certified data.
- No commit without explicit user request.

---

## Recommended first sprint after M0

1. Add a worker wrapper for `sampleListenerPlane` and expose progress/cancel.
2. Build a DXF import spike with one real plan and a scale calibration UI.
3. Replace one illustrative profile with a measured/open polar balloon and prove the atlas + SH path on it.
4. Add the WebSocket → UDP relay with a 30 Hz diff publisher and a SuperCollider receiver.
5. Write the first end-to-end test: import a plan, place two speakers, compute a heatmap, export OSC, assert the addresses and values.
