import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
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
  server: {
    watch: {
      ignored: ['**/.claude/**'],
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
})
