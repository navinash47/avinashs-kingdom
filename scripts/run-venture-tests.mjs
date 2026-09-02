#!/usr/bin/env node
/**
 * Run registered local tests for a venture and write public/data/tests/<id>.json
 *
 * Usage: node scripts/run-venture-tests.mjs --venture kingdom-ops
 *        node scripts/run-venture-tests.mjs --venture kingdom-ops --json
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRegistry, getRegistryEntry, expandHome } from './lib/registry.mjs'
import { runLocalTest } from './lib/cicd.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dataDir = path.join(root, 'public', 'data')

const args = process.argv.slice(2)
const ventureIdx = args.indexOf('--venture')
const ventureId = ventureIdx >= 0 ? args[ventureIdx + 1] : null
const jsonOut = args.includes('--json')

if (!ventureId) {
  console.error('Usage: node scripts/run-venture-tests.mjs --venture <id>')
  process.exit(1)
}

const registry = loadRegistry(root)
const entry = getRegistryEntry(registry, ventureId)
if (!entry) {
  console.error('Unknown venture:', ventureId)
  process.exit(1)
}

const snapshot = runLocalTest(entry, dataDir, expandHome)
if (jsonOut) {
  console.log(JSON.stringify(snapshot, null, 2))
} else {
  console.log(
    snapshot.ok ? 'PASS' : 'FAIL',
    '·',
    ventureId,
    '·',
    snapshot.duration_ms + 'ms',
  )
  for (const r of snapshot.results ?? []) {
    console.log(' ', r.ok ? '✓' : '✗', r.label, `(${r.duration_ms}ms)`)
  }
}
process.exit(snapshot.ok ? 0 : 1)
