# MED.IA ARCHITECTURE STUDIO · Giardino Giocabile

The public product is **MED.IA ARCHITECTURE STUDIO (MAS)**: a Mediterranean
design studio working across landscape, AI, architecture, sound, light and
material ecology. AURA-SPEC remains the internal engine and technical layer.
The public surface is not a SaaS dashboard and not a CAD product; it is a
studio with a point of view.

AURA PLAY is the default landing and emotional front door: a gardener-composer
tends a living, sounding garden. It is not a points-for-clicks game and not a technical
dashboard. It is a cross-domain parametric instrument: one poetic gesture
changes music, architecture, vegetation, environmental-data mapping and the
social/visitor layer at the same time. The result can be auditioned locally,
applied to the existing Spatial and Design studios, and exported.

The earlier Music Inhabiting App is a reference, not the target. AURA PLAY keeps
the strong idea of a continuous macro that deforms a whole world, then replaces
its engineering-console surface with a full-bleed scene, a small constellation
of world-parameters, missions expressed as compositional states, and a
multi-dimensional garden profile rather than one shallow score.

## 1. Front door and spatial game

AURA PLAY is the default landing view. The topbar puts **Play** first and keeps
the Spatial and Design studios as visually secondary, advanced sections. The
first screen is a playable spatial plan; the immersive 3D garden is one gesture
away. The technical speaker layout is not the first impact.

The game is a **spatial specification game**, not decorative animation:

- The player places and resizes project objects in a 2D/3D plan.
- Landscape mode has trees, shrubs, ground cover, water, paths, canopies,
  benches, stones, lights and placeable speakers.
- Indoor mode has tables, chairs, sofas, windows, doors, room volumes, walls,
  columns, rugs, curtains, acoustic panels and speakers.
- Position, width, depth, height, elevation, rotation and material are directly
  editable with large poetic controls and drag/resize interaction.
- The placed objects become real `ArchitectureIntent` items and speaker
  intents; parameters continue to modify the generated world around them.

From the Play result, **Apri specifica tecnica** applies the composition and
opens the technical Design studio without losing the spatial composition.

## 2. Core loop

1. The player manipulates seven world-parameters: **Corona** (canopy), **Rivo**
   (water), **Pietra** (stone), **Luce** (light), **Ospiti** (guests),
   **Stagione** (season) and **Vento** (wind).
2. Every parameter deterministically propagates into geometry/materials,
   acoustic absorption, scattering and T60, plant strata, a musical descriptor,
   visitor coexistence and DATA→MUSIC weighting.
3. The scene, score profile and mission requirements respond live.
4. The player can use a small set of unlocked parametric **gestures** that nudge
   several parameters at once, then audition the descriptor with Web Audio,
   apply the composition to the existing environment/session, and export it.
5. Missions ask for compositional states, not clicks. Completing a mission
   advances progression, which unlocks species, materials, render modes,
   gestures and new poetic possibilities.

There are no timers, lives, currencies or leaderboard. The only persistence is
the local play state in `localStorage`.

The game never feels complete without the studio. It ends in a **spatial
seed**: a personal atmosphere and project beginning, not a cold technical
report.

## 3. Parameter ontology

| Parameter | Poetic range | Geometry / material | Acoustic consequence | Musical consequence | Social / data consequence |
| --- | --- | --- | --- | --- | --- |
| Corona | cielo aperto → volta viva | canopy radius/height, tree and shrub counts, covered area | leaf absorption and scattering rise; T60 and wind masking fall | density, mode, register and timbre shift | shelter and refuge; particulate capture |
| Rivo | pietra asciutta → acqua che parla | pond area, water level, shore material | water absorption and high-band reflection; masking balance | brightness, density, fluid timbre, pulse | humidity, water quality, water audibility |
| Pietra | terra morbida → geologia | stone count/height, path and hard-surface ratio | reflective area, longer T60, stronger early reflections | roughness, register, stone timbre | dust and PM2.5; harder coexistence |
| Luce | ombra → meriggio | lanterns, bloom, scene palette | visual exposure and clarity hint | brightness, tempo, airy timbre | PAR, temperature, species bloom |
| Ospiti | solo → coro | visitor orbs and social orbit | crowd masking and noise floor | density, pulse, vocal timbre | visitor motifs, key diversity, inclusion/crowding |
| Stagione | risveglio → riposo | leaf factor, foliage counts, warmth | seasonal absorption and scattering | tempo, mode colour, foliage/decay | temperature, humidity, air/water readings |
| Vento | quiete → fruscio | sway, particle drift, movement | wind masking, noise and scattering | roughness, pulse, granular timbre | flow, dust dispersion, sound masking |

The engine keeps all parameters in `[0, 1]`; gestures are deterministic clamped
vector additions. The current parameter set can be read back as a poetic phrase
through `parameterVocabulary`.

### Cross-domain derivation

`packages/play-engine/src/derive.ts` is the single source of truth:

- **Geometry and materials** come from parameter curves, with hand-authored
  relationships rather than a generic randomizer.
- **Acoustics** reuses `meanAbsorption`, `sabineT60`, `roomConstantM2`,
  `directToReverberantDb` and `estimateSti` from `@aura-spec/core-acoustics`.
  No acoustic formula is forked in the app.
- **Vegetation** builds three authored planting designs using the real
  `landscape-culture` plant catalog and runs `auditLandscapePalette`, so strata,
  foliage sizes, native/evergreen ratios and canopy projection are audited.
- **Environmental readings** (`pm25`, `no2`, `water.pollutionIndex`,
  `dissolvedOxygen`, `turbidity`, `ph`, `light.par`, `noise.laeq`, `flow.rate`,
  weather) feed `MUSICO_CROSS_ONTOLOGY` through
  `mapReadingsToMusicalDescriptor`.
- **Music** combines the DATA→MUSIC descriptor with direct parameter influence,
  then exposes mode, tempo, register, density, brightness, roughness, timbre,
  pulse and spread.
- **Visitors** become independent `VisitorMusicalInput`s, then pass through
  `composeCoexistence` from `landscape-culture` for keys, transposition, density
  shares and warnings.
- **Scores** are derived from the resulting world, not assigned by events.

## 4. Missions

Eight missions test compositional states rather than actions. Each requirement
is a pure predicate over the current `PlayComposition`, so evaluation is
deterministic, testable and independent of the UI.

| # | Mission | Compositional demand |
| --- | --- | --- |
| 01 | Il fiume nel bosco | Make grove and river coexist without masking the water. |
| 02 | Tre voci, nessun padrone | Host at least three visitor motifs in different keys, with inclusion. |
| 03 | Aria velata, parola chiara | Use polluted-air data to darken the canopy while keeping intelligibility. |
| 04 | Rifugio di basso e luce | Make low register and high brightness coexist in a refuge. |
| 05 | Vento d’autunno | Let an autumn wind move the garden without breaking musical coherence. |
| 06 | La pietra non beve il rivo | Combine stone and water: a long tail without swallowing clarity. |
| 07 | Giardino notturno | Keep spectral life and inclusion with very low light. |
| 08 | Una soglia per molti | Host many visitors without crowding or crowd masking. |

`evaluateMission` returns individual requirement results so the mission card can
show partial progress and poetic hints. `recordMissionPass` records only a real
pass and advances to the next incomplete mission.

## 5. Scoring

There is deliberately no single score. The garden has five independent
dimensions, each in `[0, 1]`:

- **Coerenza musicale** — DATA→MUSIC coverage, harmonic agreement of visitor
  claims, reasonable T60, roughness and intelligibility.
- **Equilibrio ecologico** — strata and foliage coverage, native/evergreen
  ratios, water balance, air/water quality, audit issues.
- **Inclusione / convivenza** — visitor count, key diversity, role diversity,
  coexistence warnings and crowding.
- **Chiarezza spaziale** — direct-to-reverberant estimate, STI/clarity,
  water and crowd masking.
- **Novità** — parameter dispersion, unusual tensions between domains and
  edge states. It is deterministic and based on the world, not on random rolls.

The UI renders these as a constellation and uses poetic levels (`latente`,
`fragile`, `in ascolto`, `vivo`, `pieno`) instead of a points total.

## 6. Progression and unlocks

Progression is measured by distinct completed missions:

| Stage | Threshold | Unlocks |
| --- | --- | --- |
| Seme | 0 | Base planting palette, earth/water/stone/wood/leaf materials, Diurno mode, Rugiada and Potatura gestures |
| Risveglio | 1 | Thyme and Judas tree; iron; Polline mode; Soglia gesture |
| Radura | 2 | Magnolia and lime; glass; Sospensione gesture; Notturno mode |
| Coro | 3 | Mirror material; Risonanza gesture; Aurora mode |
| Rifugio | 4 | Plane tree; Pioggia mode |
| Costellazione | 6 | Sciame mode, Fioritura gesture |

Species unlock into the actual `deriveVegetation` designs, materials unlock into
`PlayMaterials.usedMaterialIds`, render modes change the real Three.js palette
and particle bias, and gestures become usable. Reset returns exactly to the
initial state; no unlock is inferred from a browser session.

## 7. Visual and audio surface

- **Playable plan first**: a direct-manipulation 2D plan with object
  catalogue, drag/resize handles and an object lens for dimensions/materials.
- **3D world second**: React Three Fiber camera with gentle orbital motion,
  placed Play objects and speaker objects rendered in the scene.
- **Shader sky**: altitude gradient, sun, aurora bands, stars and wind-linked
  movement.
- **Shader ground**: procedural noise, canopy/stone/season colour shifts,
  damp rings and distance fog.
- **Shader water**: ripples, glints, edge falloff and depth-driven alpha.
- **Instanced planting strata**: ground cover, shrubs, small/medium/large trees,
  all with per-instance colour and wind sway. Plants avoid the pond.
- **Stone garden**: instanced mineral erratics scaled by the stone parameter.
- **Visitors**: up to five glowing orbs with individual orbits, halos and rings.
- **Pollen field**: a parameter- and mode-driven particle field with additive
  blending and clamped point size.
- **Atmosphere**: light shafts, canopy aura rings, vignette and film grain.

The Play UI is intentionally distinct from Spatial/Design: large editorial
typography, minimal numbers, a mission card, a score constellation and a
bottom control surface. The technical Spatial/Design topbar controls are hidden
while Play is active; the studios are reachable as advanced sections.

Audition is a small local Web Audio graph: a mode-based drone, filtered water
noise, air noise and a tempo-clocked pulse tied to the descriptor. It starts only
from the explicit **Ascolta** gesture and is cleanly stopped by **Silenzia**,
unmounting Play, or navigation. The audition is an indicative local monitor, not
the venue renderer.

## 8. Conversion and MAS seed

At the end of the loop, the player can open a personal spatial seed:

1. **Save / share the seed** — locally persisted, downloadable, printable and
   copyable.
2. **Request MAS design / bring this space to life** — an elegant brief form
   opens with the generated atmosphere and narrative.
3. **Project brief** — name, email, site, indoor/outdoor, atmosphere, budget
   range, timeline and notes, together with the generated seed summary.
4. **Submission hook** — since there is no backend, the brief is stored locally
   and can be printed/downloaded/copied. `VITE_MAS_REQUEST_MAILTO` can define a
   future direct mailto target; no invented contact address is used. A project
   API or CRM webhook can replace this integration point.

The conversion language is explicit: MAS designs the real space; the game is
the beginning of the conversation. The final call to action is “Richiedi MAS”.

## 9. Integration with the existing studios

`packages/play-engine/src/integration.ts` provides:

- `musicFeaturesFromPlay(composition)`: converts the PLAY descriptor into the
  existing `MusicFeatures` contract.
- `buildArchitectureIntentFromPlay(composition, baseSite, playObjects)`: calls
  the existing `architectureFromMusic` bridge, then authors Play-specific water,
  canopy, stone, zone, planting and acoustic-target additions, and converts
  placed Play objects into real architectural items and speaker intents.

Pressing **Semina nel mondo** in Play calls the store action which:

1. composes the current Play state,
2. builds an `ArchitectureIntent` via the design bridge,
3. reuses the existing `environmentFromIntent` and `sessionFromIntent`,
4. runs `soundscapeFromArchitecture` and `sessionFromSoundscapePlan`,
5. stores the new environment, session, site, design items/zones, soundscape
   plan and analysis status while remaining in Play.

The Spatial studio and Design studio then read the same generated world as any
other design operation. Existing routes and contracts are preserved.

**Raccogli il seme** exports a local JSON file containing the current composition,
placed objects, progress, progression, environment and session.

## 10. Code map

- `packages/play-engine/src/types.ts` — parameter, world, mission, score and
  progression contracts.
- `packages/play-engine/src/parameters.ts` — ontology, gestures, render modes,
  seasonal mapping and clamping.
- `packages/play-engine/src/objects.ts` — landscape/indoor object catalogue,
  default plans and placed-object transitions.
- `packages/play-engine/src/seed.ts` — spatial-seed narrative, MAS process,
  project archetypes, brief text and local conversion helpers.
- `packages/play-engine/src/derive.ts` — deterministic cross-domain derivation.
- `packages/play-engine/src/missions.ts` — eight missions and evaluation.
- `packages/play-engine/src/scoring.ts` — five independent score dimensions.
- `packages/play-engine/src/progression.ts` — stages, species, materials, modes
  and gestures.
- `packages/play-engine/src/state.ts` — pure progress transitions, mission
  recording, serialization and reset.
- `packages/play-engine/src/integration.ts` — Design Bridge adapter.
- `packages/play-engine/tests/play-engine.spec.ts` — determinism, cross-domain
  consequences, missions, scoring, progression, persistence, reset and bridge
  integration.
- `apps/studio-web/src/play/PlayView.tsx` — Play surface and plan/world switch.
- `apps/studio-web/src/play/PlayPlan.tsx` — direct-manipulation plan, object
  catalogue and object lens.
- `apps/studio-web/src/play/PlaySeedDialog.tsx` — spatial-seed summary and MAS
  project-brief conversion flow.
- `apps/studio-web/src/play/scene/PlayScene.tsx` — shader/instanced/particle
  scene.
- `apps/studio-web/src/play/audio/playAudition.ts` — local Web Audio monitor.
- `apps/studio-web/src/state/store.ts` — `play` state slice and world-apply
  action.

## 11. Verification and limitations

- All pure engine logic is deterministic: no `Math.random`, `Date.now` or DOM
  dependency in derivation, mission evaluation, scoring, progression or reset.
- `npx vitest run --config vitest.config.ts` passes, including existing suites.
- Package and app typechecks pass.
- Production Vite build passes.
- A headless Chrome smoke test lands directly in Play, edits the spatial plan,
  places and resizes objects, edits parameters, passes a mission, applies the
  composition, opens the technical specification, opens the MAS seed/brief,
  navigates to Design and Spatial studios, returns to Play and resets without
  application exceptions.

Remaining integration points: a real submission endpoint/CRM webhook and a
confirmed MAS contact address. Until then, the form is local, printable,
downloadable and copyable; no data is sent automatically.

Limitations:

- Acoustic values are design estimates on a simplified open-air volume; they
  reuse the established Sabine/STI helper math but are not a certified
  measurement or full wave-acoustic simulation.
- The Web Audio audition is a lightweight local monitor, not a renderer for the
  generated session; it intentionally has no backend, sample library or network.
- The scene uses native Three.js shaders and instancing; no post-processing
  dependency was added. The “bloom-like” look is additive particles and glows,
  not a physical bloom pass.
- The environmental dataset is generated deterministically from the Play world,
  not live sensor input; the accepted `landscape-culture` DATA→MUSIC ontology is
  the integration seam for real readings.
- The Play scene is designed for a recent WebGL2 browser. A headless smoke test
  on SwiftShader renders it, but very low-end devices may need reduced DPR or
  fewer particles.
