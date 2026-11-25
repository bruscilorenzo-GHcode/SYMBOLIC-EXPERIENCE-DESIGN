# AURA-SPEC working agreement

This repository is a standalone platform scaffold. The surrounding parent repository (GLooperDemos) is a different product and must not be modified.

## Invariants

- Right-handed world, metres, Y up, +Z = 0° azimuth.
- Speaker orientation is `[yaw, pitch, roll]` degrees, intrinsic Y-X-Z.
- Polar data is dB relative to on-axis unless `normalization === "absolute"`.
- Frequency bands: 63 Hz–16 kHz, octave or third-octave.
- `packages/core-acoustics` is dependency-free and deterministic.
- Browser code must not import Node built-ins.
- Manufacturer specifications must carry `provenance`; illustrative seed data must never be presented as certified.
- Landscape acoustic coefficients, plant water needs and DATA→MUSIC mappings are artistic/engineering estimates. Keep `verification: "estimated"` until a real source is attached.
- The MUSI-CO DATA→MUSIC mapping is not a scientific pollution index; it preserves direction and relative magnitude, it does not claim toxicological validity.

## Verification

- `npx tsc -p packages/core-acoustics/tsconfig.json --noEmit`
- `npx tsc -p packages/osc-bridge/tsconfig.json --noEmit`
- `npx tsc -p packages/catalog/tsconfig.json --noEmit`
- `npx tsc -p packages/landscape-culture/tsconfig.json --noEmit`
- `npx vitest run --config vitest.config.ts`

## Scope discipline

The MVP vertical slice is: import → place → polar coverage heatmap → multichannel OSC export. Do not add speculative subsystems before that slice is trustworthy.
