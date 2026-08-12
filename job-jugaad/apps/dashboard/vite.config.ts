import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  plugins: [react()],
  server: {
    port: 5177,
    fs: { allow: [path.resolve(root, '../..')] },
    proxy: {
      '/api': 'http://localhost:5178',
      '/gaps.xlsx': 'http://localhost:5178',
      '/resume-index.json': 'http://localhost:5178',
      '/queue.json': 'http://localhost:5178',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
