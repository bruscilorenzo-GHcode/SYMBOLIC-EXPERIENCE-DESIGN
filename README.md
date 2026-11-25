# MED.IA ARCHITECTURE STUDIO · Spatial Aura Engine — HEALING ROOM fusion

MED.IA ARCHITECTURE STUDIO (MAS) uses the AURA-SPEC engine as its internal
technical layer for architectural acoustics and spatial composition: CAD/BIM ingestion, manufacturer polar balloons, real-time coverage metrics, hardware specification, multichannel spatialisation, OSC/Dante routing and human–AI co-composition.

This repository is a **fork of the MUSICO_SPATIAL_AURA engine fused with the
HEALING ROOM concept** (diagnostic and health treatment room, brief
GREG–Lorenzo 08/08 + PHAS technical layers): the meditation process guides the
definition of the spaces, the room observes its inhabitant by collecting
diagnostic data, and a deterministic digital doppelgänger materialises the
healing goal.

> Reference profiles for **Architettura Sonora** and **K-ARRAY** are clearly marked `provenance.verification: "illustrative"`. They are synthetic engineering placeholders. Replace them with certified GLL/CLF or measured balloons before any specification.

## Healing Room fusion

- `packages/healing-room` — deterministic engine (`@aura-spec/healing-room`):
  - **Zones**: Vestibule Area → Stimulus–Exhibition (Observation) → Focus Area — Therapy, with the two space-relation variations *linear* (corridor) and *concentrated* (room in a room: black shiny cube inside the white exhibition space).
  - **Mind states**: everyday → observing → focused → empty, driven by a single focus depth parameter (0.25 / 0.55 / 0.85 thresholds).
  - **Diagnostics**: four communication channels (with Self, with the Digital Twin, with Others, with Artefacts); recorded samples build the **digital doppelgänger** — entity constructed from data, floating, circulating, pulsing (breath Hz, orbit radius, complexity, luminance all derived deterministically).
  - **Healing goal**: materialises at the centre of the focus area past the focused-mind threshold and completes exactly when the empty mind begins.
  - **Stations**: 4 m² kiosk (spherical display + sound shower, "analogue VR"), 16 m² capsule, 255 m² event station (observation 151.52 m², four diagnostic spaces ≈ 18 m², focus 41.05 m², 265.64 m² measured).
- Route `/healing` (and `/en/healing`) — full-screen experience: three-zone 3D scene (R3F), doppelgänger entity, data-wall of neuron-like panels, goal artifact (lotus / monolith / orb / lattice), local Web Audio sound shower (drone bed breathing at the doppelgänger's breath rate). Session state persists locally.
- The public site gains a **Healing Room** section and navigation entry in IT/EN.

The engine is deterministic by contract: same samples in, same doppelgänger and same goal out — no randomness, no generative model in the extraction path.

## Quickstart

```bash
cd /Users/lorenzobrusci2020/Desktop/MUSICO/2026/MUSICO_SPATIAL_AURA
pnpm install
pnpm dev          # http://127.0.0.1:5173
pnpm dev:relay    # optional: ws://localhost:8765 → udp://127.0.0.1:9000
pnpm dev:collab   # optional: ws://localhost:1234 (Yjs)
pnpm test         # vitest
pnpm typecheck    # turbo + tsc across packages
```

If pnpm asks about build scripts, run `pnpm approve-builds` once and allow `esbuild` (and `leveldown` if you use the persistence adapter). The browser build and tests work without the native LevelDB addon.

The core packages are dependency-free, so the acoustic tests can also run before installing the web stack:

```bash
npx vitest run --config vitest.config.ts
npx tsc -p packages/core-acoustics/tsconfig.json --noEmit
```

## What is implemented

| Area | Package | State |
|---|---|---|
| Speaker, environment, session schemas | `packages/core-acoustics/src/types` | Complete v1.0.0 contracts |
| SPL, air absorption, line-array decay, D/R, STI estimate, phase coherence | `packages/core-acoustics/src/acoustics` | Implemented + tested |
| Manufacturer polar CSV parser, IDW resampling, SH fit, texture atlas, GLSL | `packages/core-acoustics/src/polar` | Implemented + tested |
| Listener-plane heatmap and coverage statistics | `packages/core-acoustics/src/acoustics/heatmap.ts` | Implemented + tested |
| Landscape strata, planting palette, wiring, coexistence, DATA→MUSIC | `packages/landscape-culture` | Implemented + 46 tests + studio panel |
| Cross-domain garden game, missions, progression, score, four musical idioms | `packages/play-engine` | Implemented + 31 tests + MAS conversion |
| BOM, amplifier/network budget | `packages/core-acoustics/src/routing` | First-order rules |
| OSC 1.0 codec, address space, diff publisher, UDP/WebSocket transports | `packages/osc-bridge` | Implemented + tested |
| Max/MSP, SuperCollider, CLAP adapters | `packages/osc-bridge/src/adapters` | Code generators / descriptors |
| Catalog seed + validation | `packages/catalog` | Illustrative reference data |
| Yjs collaboration document | `packages/collab` | Schema + helpers |
| Editorial MAS site (hero, method, spatial score, environments, studio) | `apps/studio-web/src/site` | New default landing |
| Two-tier ontology (habitats, personae, transducers, tier machine) | `packages/inhabiting-model` | Implemented + tested |
| Acoustic Spec Lab (blueprint, geometry/import, materials, BOM) | `apps/studio-web/src/spec` | Tier 2 shell |
| Yjs relay | `services/collab-server` | Minimal server |
| OSC relay | `services/osc-relay` | WebSocket → UDP forwarder |

## Repository map

```
MUSICO_SPATIAL_AURA/
├── apps/studio-web/              # React 19 + R3F + Three.js studio
├── packages/
│   ├── core-acoustics/           # schemas, math, polar pipeline, BOM
│   ├── landscape-culture/        # strata, wiring, coexistence, DATA→MUSIC
│   ├── inhabiting-model/         # two-tier ontology: habitats, personae, transducers
│   ├── play-engine/              # deterministic Play derivation, missions, progression
│   ├── osc-bridge/               # OSC codec, addresses, transports, adapters
│   ├── catalog/                  # seed profiles + validation
│   └── collab/                   # Yjs document model
├── services/
│   ├── collab-server/            # y-websocket relay
│   └── osc-relay/                # WebSocket → UDP OSC relay
├── examples/                     # SuperCollider, Max, CLAP integration notes
├── docs/                         # blueprint, acoustics, schemas, roadmap
├── .roomodes                     # Roo Code custom modes
└── .clinerules/                  # Cline project rules
```

## Landscape culture tests

The Giardino Sonoro is treated as a landscape-culture system, not just a speaker layout. `packages/landscape-culture` itemises:

- ground cover, shrubs, small/medium/large trees, with small/medium/large foliage;
- wired analog/Dante/AES67/AVB vs Bluetooth wiring, with latency, channel and heritage constraints;
- Syntagma-derived coexistence for individual and multi-visitor musical inputs;
- textual multi-input meta-composition with a validated LLM contract and deterministic fallback;
- the MUSI-CO / Mindkestra DATA→MUSIC cross-ontology for water, air, climate and flow data.

The studio left rail renders the `GIARDINO_SONORO_DEMO` audit live. See [`docs/08-landscape-culture.md`](docs/08-landscape-culture.md).

## AURA PLAY · Giardino Giocabile

The default public landing turns the landscape culture model into a compositional instrument and ends in a MAS spatial seed / project conversation. Seven poetic world-parameters (canopy, water, stone, light, guests, season, wind) propagate through geometry, materials, acoustics, vegetation, environmental DATA→MUSIC and visitor coexistence. Eight missions ask for compositional states, five independent score dimensions replace a single points total, and completed missions unlock species, materials, render modes and parametric gestures.

Play uses a full-bleed R3F scene with native shaders, instanced planting strata, water ripples, visitor orbs and pollen, a local Web Audio audition, and **Semina nel mondo** to apply the composition through the Design Bridge into the existing Spatial and Design studios. See [`docs/10-gamification.md`](docs/10-gamification.md).

## The MVP vertical slice

```
Import → Place → Polar coverage heatmap → Multichannel OSC export
```

M0 covers **Place → Heatmap → OSC**, with a synthetic courtyard and reference profiles. M1 adds real CAD/raster ingestion; M2 adds certified polar catalogs and BOM/network sizing; M3 adds the real-time audio engine and co-composition; M4 adds AI dramaturgy and venue deployment.

## Deployment

Production: **https://musico-healing-room.vercel.app**

The Vercel project is `musico-healing-room` (personal scope). It builds only the studio app from the monorepo:

```bash
npx vercel deploy --prod --yes --project musico-healing-room
```

Configuration lives in [`vercel.json`](vercel.json); the build command is `pnpm --filter @aura-spec/studio-web build`, output `apps/studio-web/dist`. See [`docs/07-deployment.md`](docs/07-deployment.md).

## Documentation

- [`docs/00-blueprint.md`](docs/00-blueprint.md) — vision, system architecture, tech stack, cloud/collaboration, risks.
- [`docs/01-acoustics.md`](docs/01-acoustics.md) — SPL, line arrays, beam steering, room metrics, STI approximation.
- [`docs/02-data-model.md`](docs/02-data-model.md) — schemas, units, provenance, serialisation, CRDT layout.
- [`docs/03-polar-parser.md`](docs/03-polar-parser.md) — manufacturer tables → spherical matrices → WebGL shader.
- [`docs/04-osc-bridge.md`](docs/04-osc-bridge.md) — address space, timetags, Max/SuperCollider/CLAP.
- [`docs/05-roadmap.md`](docs/05-roadmap.md) — M0–M4 deliverables and acceptance criteria.
- [`docs/06-tooling-modes.md`](docs/06-tooling-modes.md) — Cline, Roo Code, Kilo Code, Architect/Code workflow.
- [`docs/07-deployment.md`](docs/07-deployment.md) — Vercel project, build settings, relay topology, redeploy.
- [`docs/08-landscape-culture.md`](docs/08-landscape-culture.md) — plant strata, wiring, coexistence, LLM meta-composition, DATA→MUSIC tests.
- [`docs/11-two-tier-architecture.md`](docs/11-two-tier-architecture.md) — Inhabiting Playground ↔ Acoustic Spec Lab: models, state machine, layout.
- [`docs/12-site-experience.md`](docs/12-site-experience.md) — editorial MAS site structure, 3D hero, Spatial Score, daylight, languages, studio handoff.
- [`docs/10-gamification.md`](docs/10-gamification.md) — AURA PLAY concept, parameter ontology, missions, scoring, progression, studio integration.

## Design stance

This is not a PA CAD clone. The unit of composition is the **acoustic situation**: geometry, material ecology, loudspeaker sculpture, dispersion, weather, listeners, generative agents and live performers. The software must make the physical consequences of a compositional decision visible and audible, without hiding them behind a black box.

The acoustic core is deliberately small and explicit. A Rust/C++/WASM DSP implementation can replace the hot loops later; it must not change the contracts or the coordinate conventions.
