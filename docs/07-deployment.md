# Deployment

## Production

| | |
|---|---|
| URL | **https://musico-spatial-aura.vercel.app** |
| Vercel project | `musico-spatial-aura` |
| Scope | personal account (`bruscilorenzo-8459`) |
| Deployment ID | `dpl_AcqdvxNfLjMcBFASgin7xtHFK5kQ` |
| Inspector | https://vercel.com/bruscilorenzo-8459/musico-spatial-aura |

The site is a static Vite build. It does not require a server function.

## Build contract

`vercel.json` at the project root:

```json
{
  "buildCommand": "pnpm --filter @aura-spec/studio-web build",
  "outputDirectory": "apps/studio-web/dist",
  "installCommand": "pnpm install --frozen-lockfile",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The app build runs:

```bash
tsc -p tsconfig.json --noEmit && vite build
```

The workspace is a pnpm monorepo. Vercel reads `packageManager: pnpm@11.19.0`, installs from `pnpm-lock.yaml`, runs the app build, and serves `apps/studio-web/dist`.

## Local verification

From the project root:

```bash
pnpm install
pnpm --filter @aura-spec/studio-web build
pnpm test
```

The production build output should contain `apps/studio-web/dist/index.html` and hashed assets.

## Redeploy

After changes:

```bash
npx vercel deploy --prod --yes --project musico-spatial-aura
```

Or link the directory once:

```bash
npx vercel link --yes --project musico-spatial-aura
npx vercel deploy --prod
```

## Runtime topology

```
Browser studio (Vercel static)
   │
   ├── OSC relay on the operator's machine: ws://localhost:8765 → udp://127.0.0.1:9000
   ├── Yjs collaboration relay (optional): ws://localhost:1234
   └── static preview of geometry, polar balloons and coverage heatmap
```

The deployed site is static. OSC and collaboration servers are **not** hosted on Vercel in M0. The operator runs `services/osc-relay` and `services/collab-server` locally on the venue/studio network. This is intentional: OSC/UDP and Dante-adjacent traffic must stay on the local audio network.

To point the studio at a different relay, set `VITE_OSC_RELAY_URL` at build time:

```bash
VITE_OSC_RELAY_URL=ws://192.168.1.20:8765 npx vercel deploy --prod --yes --project musico-spatial-aura
```

or configure it in the Vercel project environment variables.

## Domain and access

- The production alias is public and returns HTTP 200 without authentication.
- Preview deployments may have Vercel Deployment Protection enabled; use `vercel curl` or a bypass token if a preview is protected.
- A custom domain can be attached in Project Settings → Domains.
- Do not put Vercel tokens, Dante credentials or AI provider keys in the repository.

## Future deployment work

- Git integration for automatic previews and production deploys.
- A hosted collaboration relay with authentication.
- An optional hosted catalog API and solver queue.
- A venue edge package that bundles the OSC relay, collab relay and audio engine.
