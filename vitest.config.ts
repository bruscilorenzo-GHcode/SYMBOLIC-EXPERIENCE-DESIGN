import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@aura-spec/core-acoustics': fileURLToPath(
        new URL('./packages/core-acoustics/src/index.ts', import.meta.url),
      ),
      '@aura-spec/inhabiting-model': fileURLToPath(
        new URL('./packages/inhabiting-model/src/index.ts', import.meta.url),
      ),
      '@aura-spec/landscape-culture': fileURLToPath(
        new URL('./packages/landscape-culture/src/index.ts', import.meta.url),
      ),
      '@aura-spec/design-bridge': fileURLToPath(
        new URL('./packages/design-bridge/src/index.ts', import.meta.url),
      ),
      '@aura-spec/play-engine': fileURLToPath(
        new URL('./packages/play-engine/src/index.ts', import.meta.url),
      ),
      '@aura-spec/healing-room': fileURLToPath(
        new URL('./packages/healing-room/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/*/tests/**/*.spec.ts'],
    environment: 'node',
    globals: false,
  },
})
