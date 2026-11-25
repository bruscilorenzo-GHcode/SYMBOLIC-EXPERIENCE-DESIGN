# AURA-SPEC → Max/MSP

The OSC bridge sends plain OSC 1.0 messages or time-tagged bundles. A minimal receive chain:

```
[udpreceive 9000]
  → [oscparse]
  → [route /aura/v1/session/session-aura-demo/source/src-ambient/position]
  → [unpack f f f]
  → [prepend position]
```

## High-rate trajectories

- Keep OSC callbacks free of UI work; send values through `[zl clear]` or a `[qmetro 16]` scheduler.
- Do not drive audio-rate per-frame updates from OSC. Interpolate in the audio thread.
- Use `[deferlow]` before touching UI objects.
- For sample-accurate events, consume bundles with timetags and schedule them against the Max clock.

## Routing table

Generate a session-specific table with:

```ts
import { maxRoutingTableAsJson } from '@aura-spec/osc-bridge'
console.log(maxRoutingTableAsJson(session))
```

Paste the result into a `[coll]` or load it from `[js]` / `[node.script]`.

## Address groups

| Suffix | Args | Meaning |
|---|---|---|
| `/source/<id>/position` | x y z | metres, world coordinates |
| `/source/<id>/orientation` | yaw pitch roll | degrees, intrinsic Y-X-Z |
| `/source/<id>/gain` | dB | source gain |
| `/source/<id>/spread` | degrees | spatial spread |
| `/source/<id>/mute`, `/solo` | 0/1 | mute/solo |
| `/source/<id>/spatialization` | string | `object`, `hoa`, `vbap`, `dbap`, `wfs` |
| `/renderer/order` | int | HOA order |
| `/renderer/mode` | string | primary renderer |
| `/clock` | beats bpm playing | heartbeat |
