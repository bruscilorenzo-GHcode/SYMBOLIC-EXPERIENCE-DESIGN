# Landscape Culture Tests

**Package:** `packages/landscape-culture`  
**Tests:** `packages/landscape-culture/tests/`  
**Demo:** `GIARDINO_SONORO_DEMO` (also rendered in the studio's left rail)

The Giardino Sonoro work is not only a loudspeaker problem. It is a **landscape culture** problem: which strata, foliage scales, species, maintenance regimes, wiring methods, visitor inputs and environmental signals belong to a place. This package turns those expectations into executable tests.

The package is deterministic and dependency-free apart from `@aura-spec/core-acoustics`. It does not call an LLM in tests; it validates an LLM's proposed meta-composition and provides a rule-based fallback.

---

## 1. Vertical strata and foliage

The catalog itemises:

| Stratum | Role in the soundscape | Typical scale |
|---|---|---|
| `ground-cover` | fine-grained absorption, rustle, soil protection | 0.1–0.4 m |
| `shrub` | mid-layer masking, seasonal colour, bird habitat | 1.5–3 m |
| `small-tree` | understorey, near-listener canopy, scale transition | 4–5 m |
| `medium-tree` | structural middle layer, wind filtering | 7–9 m |
| `large-tree` | canopy roof, long reverberation shadow, ecological anchor | 14–18 m |

Foliage is itemised as `small`, `medium`, `large`. The audit requires at least one of each in a Giardino Sonoro palette, because foliage scale changes both the high-frequency scattering and the perceived grain of wind and rain.

### 1.1 Catalog

| ID | Species | Stratum | Foliage | Persistence | Water | Note |
|---|---|---|---|---|---|---|
| `pachysandra-terminalis` | *Pachysandra terminalis* | ground-cover | small | evergreen | medium | shaded evergreen carpet |
| `liriope-muscari` | *Liriope muscari* | ground-cover | medium | evergreen | low | dry rustle under trees |
| `thymus-serpyllum` | *Thymus serpyllum* | ground-cover | small | evergreen | low | aromatic sunny paving |
| `viburnum-tinus` | *Viburnum tinus* | shrub | medium | evergreen | medium | dense winter screen |
| `laurus-nobilis` | *Laurus nobilis* | shrub | medium | evergreen | low | aromatic clipped hedge |
| `hydrangea-macrophylla` | *Hydrangea macrophylla* | shrub | large | deciduous | high | soft seasonal mass |
| `acer-palmatum` | *Acer palmatum* | small-tree | medium | deciduous | medium | layered understorey |
| `cercis-siliquastrum` | *Cercis siliquastrum* | small-tree | medium | deciduous | low | Mediterranean marker |
| `olea-europaea` | *Olea europaea* | medium-tree | small | evergreen | low | silver leaf, wind shimmer |
| `magnolia-grandiflora` | *Magnolia grandiflora* | medium-tree | large | evergreen | medium | dense opaque evergreen |
| `quercus-ilex` | *Quercus ilex* | large-tree | small | evergreen | low | Mediterranean canopy backbone |
| `tilia-cordata` | *Tilia cordata* | large-tree | medium | deciduous | medium | strong seasonal change |
| `platanus-acerifolia` | *Platanus × acerifolia* | large-tree | large | deciduous | medium | powerful canopy, high wind noise |

Acoustic absorption, scattering and `canopyAttenuationDbPerM` are **estimates** (`provenance.verification: "estimated"`). They are structured octave-band data for tests and early design, not measured vegetation coefficients. Replace them with site measurements before acoustic specification.

### 1.2 What the audit checks

`auditLandscapePalette(design)` returns:

- **Issues** for missing strata or foliage sizes, unknown profiles, invalid quantities.
- **Warnings** for:
  - native/Mediterranean share below 35%,
  - evergreen share below 20%,
  - wind-sensitive species in an outdoor zone,
  - canopy projection above 2.5× the planting area.
- Coverage booleans for every stratum and foliage size.
- Totals: plants by stratum, plants by foliage, canopy projection.

The demo includes three planting designs (grove, river terrace, sheltered clearing), each with all five strata and all three foliage sizes.

---

## 2. Multichannel wiring: wired vs Bluetooth

`chooseWiringPlan(request)` evaluates:

| Method | Latency | Channels | Run | Notes |
|---|---|---|---|---|
| `wired-analog` | 0.4 ms | N | ≤ 80 m | simple, copper-heavy, long runs warn |
| `wired-dante` | 1.5 ms | N | ≤ 100 m/hop | preferred for >2 channels and synchronous zones |
| `wired-aes67` | 2.0 ms | N | ≤ 100 m/hop | interoperability-first |
| `wired-avb` | 2.0 ms | N | ≤ 100 m/hop | deterministic, higher switch cost |
| `wireless-bluetooth` | ~180 ms | 2 per link | ~15 m | lossy, non-sample-synchronous, RF planning |

The planner scores latency, run length, channel count, exposure, budget and heritage constraints. It makes the hidden costs explicit:

- multichannel Bluetooth requires multiple links and cannot guarantee phase/clock alignment,
- Bluetooth is lossy and shares the 2.4 GHz spectrum,
- outdoor Bluetooth needs weatherproof powered receivers,
- heritage constraints may favour wireless, but conservation review remains mandatory,
- analog multicore becomes heavy and lossy over long runs.

The Giardino Sonoro demo intentionally uses **Dante for the grove and river**, and **Bluetooth only for the sheltered, heritage-constrained 2-channel clearing**.

---

## 3. Syntagma-derived orchestration

`composeCoexistence(inputs, policy)` is the portable contract for multiple visitors providing musical input in different zones.

It is inspired by the existing SYNTAGMA/GLooper cell/group/voice model, but it does not import that application. It produces a deterministic mix plan:

1. **Global tonal centre** — weighted pitch-class vote.
2. **Global mode** — weighted mode vote; modal colour is preserved rather than forced into one scale.
3. **Global tempo** — weighted median.
4. **Per-input transposition** — nearest semitone move that lands on a degree of the global mode, bounded by `maxTranspositionSemitones`.
5. **Tempo reconciliation** — allow half/double time, then clamp to `maxTempoDriftPct`.
6. **Density budget** — scale each zone's density shares so they sum to `maxDensity`.
7. **Role** — `lead`, `support`, `pedal`, `texture`.
8. **Channel allocation** — contiguous channel spans per zone.
9. **Warnings** — incompatible keys, tempo drift, density reduction, channel overflow.

The single-input case is a pass-through: no transposition, no tempo scale, gain 0, role `lead`. That is the baseline for "individual input".

---

## 4. Textual multi-input → LLM meta-composition

`buildMetaCompositionRequest(...)` creates a constrained request for an LLM:

- the visitor texts,
- available zones and channel spans,
- density/tempo/transposition limits,
- the landscape palette,
- the MUSI-CO DATA→MUSIC ontology,
- a response contract.

The LLM may propose a meta-composition, but `validateMetaCompositionDraft` enforces:

- every visitor input appears in the **attribution** and in at least one **layer**,
- no invented zones,
- no duplicate zones or channels,
- channel spans stay inside the budget,
- density per zone stays within `maxDensity`,
- descriptors are musically valid.

If the LLM returns an invalid draft or fails, `synthesizeTextualMetaComposition` falls back to `ruleBasedMetaComposer`. The fallback is deterministic, detects themes (water, stone, air, metal, voice, forest) in English and Italian, and assigns layers per zone.

This is the "multi input testuali" path: the LLM is a proposal engine inside a validated composition contract, not an unreviewed audio source.

---

## 5. MUSI-CO DATA→MUSIC / Mindkestra protocol

`MUSICO_CROSS_ONTOLOGY` is a cross-ontology from environmental measurements to musical controls. It is explicitly **artistic**, not a scientific sonification standard.

Examples:

| Environmental reading | Musical target | Direction | Rationale |
|---|---|---|---|
| `water.pollutionIndex` | `roughness` ↑, `brightness` ↓ | pollution roughens/darkens | polluted water has no bright upper partials |
| `water.dissolvedOxygen` | `density` ↑ | oxygen supports activity | more life, more polyphony |
| `water.turbidity` | `granularity` ↑ | turbidity becomes grain | suspended matter is texture |
| `water.ph` | `rootPitchClass` | slow harmonic centre | pH is not a pitch event |
| `air.pm25` | `roughness` ↑, `filterCutoff` ↓ | particulate closes the filter | polluted air veils the spectrum |
| `air.no2` | `roughness` ↑ | acidic edge | irritant chemistry as friction |
| `noise.laeq` | `pulse` ↑ | ambient noise articulates | noise raises event rate |
| `weather.temperature` | `tempo` ↑ | warmth speeds metabolism | seasonal metabolism |
| `weather.humidity` | `reverb` ↑ | humidity diffuses | air mass and tail |
| `light.par` | `brightness` ↑ | light opens spectrum | photosynthesis |
| `flow.rate` | `tempo` ↑, `pulse` ↑ | river as clock | flow drives the landscape clock |

`sonifyZones(readings, zones)` produces one result per zone with its channel span. Missing data is explicit: it generates a warning and leaves the default descriptor rather than inventing a value.

The protocol IDs are:

```
musico.data-to-music.v1
musico.mindkestra.data-to-music.v1
```

The note in the ontology states that the ranges must be replaced with the official MUSI-CO/Mindkestra protocol tables when available.

---

## 6. Test matrix

| File | What it protects |
|---|---|
| `planting.spec.ts` | all strata/foliage present, profile validity, attenuation ordering, palette completeness, exotic-only warning, totals |
| `wiring.spec.ts` | wired choice for synchronous multichannel, Bluetooth only where tolerable, multichannel Bluetooth costs, long analog runs, link IDs |
| `orchestration.spec.ts` | solo pass-through, compatible keys, transposition, constrained incompatibility, tempo drift, density budget, roles, channels, empty input |
| `textual.spec.ts` | request constraints, deterministic fallback, valid LLM, dropped input, unknown zone/channel/density, provider failure, theme detection |
| `data-to-music.spec.ts` | Mindkestra protocol, polluted vs clean water, air pollution, pH, missing data, zone mapping, determinism, mapping clamp |
| `landscape.spec.ts` | complete Giardino Sonoro audit, strata/foliage coverage, Dante/Bluetooth split, coexistence, DATA→MUSIC per zone, textual validation, incomplete palette |

The package currently contributes **46 tests**. The full repository suite is **78 tests**.

---

## 7. Extending the culture

Add a species by extending `PLANT_CATALOG` with a `PlantProfile`; run `validatePlantProfile`. Do not invent "measured" coefficients: use `verification: "estimated"` or attach a real source and checksum.

Add a wiring method by extending `WiringMethod`, `METHOD_BASE` and `evaluateWiringOption`. Add the latency/clock/interoperability warning before adding a score bonus.

Add a DATA→MUSIC mapping by extending `MUSICO_CROSS_ONTOLOGY`. State the direction, range, curve, weight and rationale. Add a test that proves the direction is not inverted.

Add a visitor-input policy by extending `CoexistencePolicy`. Keep the single-input pass-through and the density budget as invariants.
