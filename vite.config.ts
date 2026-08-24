import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error ESM plugin module without types
import { embedProxyPlugin, orchestratorApiPlugin } from './scripts/vite-plugins.mjs'

export default defineConfig({
  plugins: [react(), orchestratorApiPlugin(), embedProxyPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.KINGDOM_SHARE ? '0.0.0.0' : '127.0.0.1',
    allowedHosts: true,
    hmr: process.env.KINGDOM_SHARE ? false : undefined,
  },
})
