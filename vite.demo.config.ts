// Separate Vite config for the demo app, so the library build (vite.config.ts)
// stays untouched. Run with:  npm run demo
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: 'demo',
  plugins: [vue()],
  server: { port: 5173, open: true },
  build: { outDir: '../dist-demo', emptyOutDir: true },
})
