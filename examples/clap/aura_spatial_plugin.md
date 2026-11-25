# CLAP / VST3 spatialisation plugin bridge

The repository does not ship a native plugin binary yet. The intended contract is:

1. **Shared math**: link or port `@aura-spec/core-acoustics` so the plugin and the web studio compute the same SPL, D/R and directivity values.
2. **Shared address space**: consume the OSC messages documented in `packages/osc-bridge/src/address-space.ts`.
3. **Stable parameter IDs**: use `clapParametersForSession()` from `@aura-spec/osc-bridge` to derive parameter ids and normalized ranges.

## Why CLAP

- Per-note and per-voice modulation is useful for object-based sources.
- CLAP’s parameter flush and transport APIs fit the AURA clock model.
- The plugin can run as an insert on a DAW bus while the studio remains the architectural authoring surface.

## Threading

- OSC/network callbacks must not allocate on the audio thread.
- Copy incoming packets into a lock-free ring buffer; apply parameter changes at block boundaries.
- Publish renderer state at control rate; keep sample-accurate trajectory interpolation inside the audio callback.
- Use the bridge’s bundle timetags to align Max/SuperCollider/DAW clocks.

## Suggested plugin layout

```
AuraSpatialPlugin
├── ParameterBridge      // CLAP params <-> AURA source state
├── Renderer             // HOA / VBAP / DBAP / binaural
├── SpeakerLayout        // decoder matrix, delay/trim
├── OscReceiver          // optional, for co-composition
└── Metering             // SPL estimate, D/R, phase coherence
```

The plugin should refuse to emit SPL above the session’s `aiNodes[].guardrails.maxSplDb` and should expose a bypass that is sample-aligned.
