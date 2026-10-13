import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueLegalQueryBuilder',
      fileName: (format: string) => `vue-legal-query-builder.${format}.js`
    },
    rollupOptions: {
      // legal-docs-types is a declared dependency, so it must stay a real
      // import rather than being copied in here: the package's own .d.ts
      // files reference it, and a consumer comparing their DocType against a
      // second copy baked into this bundle should not have to wonder.
      external: ['vue', 'legal-docs-types', 'legal-retrieval-types'],
      output: {
        globals: {
          vue: 'Vue',
          'legal-docs-types': 'LegalDocsTypes',
          'legal-retrieval-types': 'LegalRetrievalTypes'
        }
      }
    }
  }
})
