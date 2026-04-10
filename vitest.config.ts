import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@primitives': path.resolve(__dirname, 'src/primitives'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@stores': path.resolve(__dirname, 'src/stores'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        // Intentional cap for dev machines. On CI runners with fewer cores
        // vitest clamps to (cpuCount - 1) automatically, so this is safe.
        // Revisit if a CI environment is added with many available cores.
        maxForks: 4,
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/primitives/**/*.ts'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
})
