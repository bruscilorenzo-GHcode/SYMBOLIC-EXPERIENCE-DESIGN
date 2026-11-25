# MAS Site Experience

The public entry point is an editorial site, not the raw studio UI. It synthesises the Kimi reference structure with the AURA-SPEC 3D engine.

## Structure

1. **Hero** — bilingual experimental-immersive-space statement, audience line for architects/designers/developers/musicians, live 3D garden panel (`PlayScene`, non-interactive so the page scrolls).
2. **Manifesto** — dark band, large serif statement, sound-rule graphic.
3. **Method** — four steps (Leggere il programma, Tradurre nella partitura, Fare rispondere lo spazio, Specificare senza sostituire) with an interactive notation panel.
4. **Spatial Score** — the real Inhabiting engine embedded in a three-column editorial workspace: habitat + seven parameters + render modes, live 3D field, direction summary, audio audition, and CTAs.
5. **Ambienti** — four habitat archetypes with atmospheric reference imagery; selecting one applies the habitat and returns to the score.
6. **Principles** — four MAS principles.
7. **Studio** — process, archetypes, explicit architect/designer/developer integration panels and the “Apri lo studio” / “Parliamo del progetto” conversion.
8. **Closing** — brief CTA.

## Continuity with the platform

- The site uses the same `play-engine` state as the full studio. Habitat, parameters, objects, personae and audio are not duplicated.
- `Apri lo studio completo` switches to the full Inhabiting Playground (`appView: 'play'`).
- `Specifica tecnica` applies the current composition and opens the Acoustic Spec Lab (`appView: 'spec'`, section `blueprint`).
- `Parliamo del progetto` opens the existing `PlaySeedDialog` with the current spatial/musical seed.
- The previous full app remains reachable from the site and from the topbar `Site` button.

## Daylight

3D scenes expose a dedicated **Luce naturale / Natural light** slider in the hero and in the Spatial Score. It drives the `light` play parameter and, in `PlayScene`, tone-mapping exposure, ambient/hemisphere/directional light, sky brightness, ground brightness and fog depth. `0%` is night (silhouettes, stars, low exposure), `100%` is full daylight (bright foliage, water and sky). The full Inhabiting studio keeps the same `Luce` parameter and benefits from the same engine response.

## Studio handoff

The full studio is now a light technical workspace coherent with the site: cool paper/ink/teal palette, MAS topbar, large 2D plan board, quick-add palette for speakers and project objects, mission and parameters in a side rail, 3D toggle, daylight control, and a technical-spec handoff. Below 1100px the side rail becomes a drawer so the plan keeps the full height. Language follows the site: opening the studio from EN gives an English studio shell, object catalogue, parameters, mission, sound controls and MAS brief.

## Manifesto and partners

The public site carries the MAS manifesto: the experimental immersive space is explored through and with a living score, where architect and client, musician and engineer, gardener and machine communicate. Technology is the infrastructure of that exchange and of the learning the space generates. The studio section states the integration claim directly: we design with architects, designers and developers, not instead of them. A partner strip at the bottom links musi-co.com, lorenzobrusci.com, giardinosonoro.com and musstdesign.com.

## Interactive score

The Spatial Score defaults to the Kimi-style 2D diffusion diagram. **Diffusion field** offers Omni 360°, Line 90° and Lens 30°. The switcher sits over the drawing, and the field itself and each node are tap/click targets that cycle the field; keyboard users get the same controls with `aria-pressed`, Enter/Space and arrow keys. Switching changes the ellipse geometry, line-array beam, lens cone, node layout, channel caption and the visible status line, which names the active field instead of relying on colour. The diagram derives its field from the first speaker persona, and choosing a field writes that persona back, so the 3D field and the audition stereo width follow. There is no state-syncing effect that can overwrite the user's choice. A Diagram / 3D field switch preserves the full 3D scene.

The Method section keeps text selection enabled: `::selection` is ink-on-signal-amber, matching the rest of the site. Hovers use a pale cool mint background with ink text. Focus-visible rings use a double amber/ink outline across the public site, Studio and Spec Lab; darkening hovers are not used anywhere in the light shells.

## Four generative musical worlds

The same composition can be voiced in four categories, selected in Studio and in the Spatial Score:

- **Soundscape** — spectral pad and air texture over a sub drone and field noise.
- **Cinematic** — strings and brass over a cinematic drone and field noise; long harmonic arcs and metric pulses.
- **High Pop** — synth and electric guitar over a sub-bass and crowd noise; hook-led melody and backbeat.
- **Classics** — piano and cello over a string drone and air noise, voiced with the **Maestro** soundfont.

The categories use the **SYNTAGMA audio stack**: AudioWorklet + `spessasynth_lib` + the bundled `default.sf2` SoundFont (Maestro bank for Classics). Soundscape is fully generative; the other genres read the actual MIDI stem libraries:

- `HighPop-Long` → Drums / Bass / Pad / Lead
- `Cinematic` → Drums / Bass / Pad / Lead
- `Classic-Long` (Maestro) → Cello Bass / Viola Pad / Violin Lead

Each part has a shuffled, non-repeating queue with unseen 2-bar windows and two-stem prefetch. Patterns swap at every 2-bar boundary; live `P1…P4` readouts show the current source and window. Genre changes set the tempo hint (112 / 100 / 108 BPM) and are capped at 120 BPM. Human parameters gate density, transpose pitch, set velocity, reverb and brightness, and add granular retriggers. Idiom or radical parameter changes use a 0.15 s gain crossfade; habitat changes lerp background/fog/sky/light colours over 0.6 s.

## Technical Spec Lab

The spec lab now uses the same light editorial shell as the Studio: MAS topbar, section tabs, paper side rails and a large technical canvas. The **Blueprint** tab carries the polar/coverage view; **Geometry & import** is a dedicated large plan workspace with imports, object palette and inspector; **Materials** and **BOM & routing** are light tables. Language follows the site.

### OSC relay

`OSC relay` is an optional **local** service, not a Vercel function. It forwards binary OSC from the browser over WebSocket (`ws://localhost:8765`) to UDP (`127.0.0.1:9000`) for Max, SuperCollider or a plugin. If it is not running, the UI shows `OSC ERROR` with the explanation and the exact command (`pnpm dev:relay`); this is not a project or acoustic simulation error.

## Separate language versions

The language is now part of the URL, not a mixed mode on the same page:

| View | Italian | English |
|---|---|---|
| Public site | `/` | `/en` |
| Inhabiting Studio | `/studio` | `/en/studio` |
| Acoustic Spec Lab | `/spec` | `/en/spec` |

The language toggle pushes the corresponding URL; browser back/forward restores both page and language. The production Vercel rewrite serves the SPA for all paths.

## Languages

The public site, Spatial Score and MAS brief are fully bilingual. The header `IT / EN` switch persists in `localStorage` (`mas.site.lang`). English mode translates navigation, hero, manifesto, method, score controls and metrics, environments, principles, studio, closing, seed summary and printable/downloadable brief.

## Visual system

- Paper/ink/fern/amber/brick palette from the new reference.
- Cormorant Garamond display, Archivo body, IBM Plex Mono labels.
- 3D remains the differentiator: the hero and Spatial Score are live WebGL scenes, not static SVGs or photography.
- Reference photography is credited in `public/images`; replace before commercial launch.
