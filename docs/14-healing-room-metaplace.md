# Healing Room and Metaplace in the MAS system

MAS (the mediated space) opens onto two places that share its grammar and keep their own design DNA. The three are joined by the **SystemBar** (`apps/studio-web/src/system`), which shows the places (MAS → Healing Room → Metaplace) and a single design path:

| Step | Where | What the user does |
|---|---|---|
| 01 Space | Healing Room | chooses the layout: *Rite of passage* (PHAS plan, ~700 m²) or the *255 m² event station* |
| 02 Sound modules | Healing Room | switches modules on: sound shower, perimeter ring, spherical dome, vibroacoustic floor, resonant walls, analogue VR |
| 03 Character | Healing Room | objects (timber arches, living garden, water mirror, central disc, isolation domes, biomorphic capsules, display walls, phygital talisman), light scene and intensity, sound atmosphere |
| 04 Session | Healing Room | walks the PHAS user journey: invitation → gallery → rite of passage (changing room, diagnostics, treatment, relaxation; guided or self-guided) → centre (Doppelgänger) → back to the world (talisman) |
| 05 Improvement plans | Metaplace | Performing Wish → modulation → Improvement plan → traces |

## Healing Room — design Lorenzo Brusci and Greg Wilk (architect)

The source is the project folder (`HEALING ROOM/`: `01_HealingRoom_communication_GREG_Lorenzo_0808.pdf`, `02_PHAS_healingRoom_2408.pdf`, `PHAS_HealingRoom_2208.pdf`), not the earlier simplified black-box scene, which is no longer used by the view.

- `healing/roomDesign.ts` — configurator data, PHAS functional colours, zone areas (Healing Room 49.71 m², observation 216.55 m², seven diagnostic rooms, vestibule 43.10 m²; event station 151.52 + 41.05 + 4 × ~18 m²), persisted locally (`mas.healing.design.v1`).
- `healing/RoomPlan.tsx` — one drawing, two readings: **Plan** (functional diagram in PHAS colours, labels, legend) and **Axonometry** (the same SVG layers stacked in CSS 3D: floor, light, objects, extruded walls, domes, timber arches and, floating above, the sound layer).
- `healing/roomAudition.ts` — local Web Audio sketch: the atmosphere (forest, water, breath, twin's voice, inhabited silence) voiced through the selected modules (shower brightens, ring rotates, dome adds space, floor adds sub, walls add resonance).
- The session reuses `@aura-spec/healing-room` for samples, focus gate, Doppelgänger and goal.

## Metaplace — concept and design DNA Lorenzo Brusci

Source: `METAPLACE copy.pdf` (deck branded RELBEING) and `METAPLACE_session/METAPLACE_concept_brief.md`.

- `packages/metaplace` — pure, deterministic engine: `parseWish`, `readModulation` (three traditions normalised, interaction as normalised entropy, individual ⇄ group, physical ⇄ virtual), `composePlan` (tiers Threshold 4 / Cycle 8 / Metamorphosis 12, fields of assistance, phases, venues, emerging assistants, the *More* profile), `depositTrace` (append-only). Tests in `packages/metaplace/tests`.
- A configured Healing Room can be linked as a station: meditation and revalidation sessions take place there and the relational Doppelgänger joins the plan.
- Visual DNA: blurred chromatic fields on near-black (`ChromaField`), heavy expanded grotesk, deck pages in off-white with ultramarine headings and cyan rules.
- Advisory: the System proposes, the person decides; no real biometrics are collected.

## Routes

| View | Italian | English |
|---|---|---|
| Healing Room | `/healing` | `/en/healing` |
| Metaplace | `/metaplace` | `/en/metaplace` |
