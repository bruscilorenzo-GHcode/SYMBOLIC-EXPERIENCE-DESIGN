# AURA-SPEC project rules

- Work only inside `spatial-aura-engine/` for this project. The surrounding GLooperDemos app is unrelated.
- Read `docs/` and `packages/core-acoustics/src/types/` before changing acoustic or data contracts.
- Coordinate convention: right-handed, metres, Y up, +Z = 0° azimuth. Orientation is `[yaw, pitch, roll]` degrees, intrinsic Y-X-Z.
- `@aura-spec/core-acoustics` stays dependency-free and deterministic. Acoustic formulas must cite a standard or be labelled as an engineering approximation.
- Catalog seed data from Architettura Sonora / K-ARRAY is illustrative. Never present it as a manufacturer specification or remove `provenance`.
- Browser code must not import Node built-ins. Node-only code stays in transports/services.
- Run `npx tsc -p packages/core-acoustics/tsconfig.json --noEmit` and `npx vitest run --config vitest.config.ts` after changes.
- Do not commit, push or open a PR unless explicitly requested.
- Prefer the MVP vertical slice: import → place → polar coverage heatmap → multichannel OSC export.
