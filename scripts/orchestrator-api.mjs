#!/usr/bin/env node
/** Standalone orchestrator API on :5174 (optional — Vite dev embeds handlers inline). */
import http from 'node:http'
import { handleOrchestratorRequest } from './lib/orchestrator-handlers.mjs'

const PORT = Number(process.env.ORCHESTRATOR_API_PORT || 5174)

const server = http.createServer(async (req, res) => {
  const handled = await handleOrchestratorRequest(req, res)
  if (!handled) {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Kingdom orchestrator API → http://127.0.0.1:${PORT}`)
})
