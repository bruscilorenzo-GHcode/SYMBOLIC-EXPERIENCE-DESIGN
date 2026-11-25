import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@aura-spec/core-acoustics': fileURLToPath(
        new URL('../../packages/core-acoustics/src/index.ts', import.meta.url),
      ),
      '@aura-spec/catalog': fileURLToPath(new URL('../../packages/catalog/src/index.ts', import.meta.url)),
      '@aura-spec/osc-bridge': fileURLToPath(new URL('../../packages/osc-bridge/src/index.ts', import.meta.url)),
      '@aura-spec/landscape-culture': fileURLToPath(
        new URL('../../packages/landscape-culture/src/index.ts', import.meta.url),
      ),
      '@aura-spec/inhabiting-model': fileURLToPath(
        new URL('../../packages/inhabiting-model/src/index.ts', import.meta.url),
      ),
      '@aura-spec/design-bridge': fileURLToPath(
        new URL('../../packages/design-bridge/src/index.ts', import.meta.url),
      ),
      '@aura-spec/play-engine': fileURLToPath(
        new URL('../../packages/play-engine/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
})
