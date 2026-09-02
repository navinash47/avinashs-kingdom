#!/usr/bin/env node
/** Write public/data/share-url.json from tunnel result rows. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildShareUrlJson } from './lib/embed-proxy.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const stamp = process.argv[2]
const outPath = process.argv[3] ?? path.join(root, 'public/data/share-url.json')
const rows = process.argv.slice(4).filter(Boolean)

if (!stamp || !rows.length) {
  console.error('Usage: write-share-url.mjs <stamp> <outPath> row…')
  process.exit(1)
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(buildShareUrlJson(rows, stamp), null, 2)}\n`)
console.log(`Wrote ${outPath}`)
