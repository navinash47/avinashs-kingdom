#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'data', 'audits')
fs.mkdirSync(outDir, { recursive: true })

const macPath = path.join(
  process.env.HOME || '',
  'Projects/mac-storage-audit/reports/latest.json',
)
const killPath = path.join(
  process.env.HOME || '',
  'Projects/subscription-audit/reports/latest-kill-list.txt',
)

function syncMac() {
  if (!fs.existsSync(macPath)) {
    console.warn('No mac latest.json at', macPath)
    return
  }
  const mac = JSON.parse(fs.readFileSync(macPath, 'utf8'))
  const vol = mac.results?.volumes?.extra || {}
  const summary = {
    generated_at: mac.generated_at,
    source: macPath,
    disk: {
      note: mac.results?.volumes?.notes?.[0] || '',
      percent_used: vol.percent_used,
      total_bytes: vol.total,
      used_bytes: vol.used,
      free_bytes: vol.free,
    },
    top_home: (mac.results?.home?.items || []).slice(0, 8).map((i) => ({
      path: i.path,
      bytes: i.bytes,
    })),
    recommendations: (mac.recommendations || []).map((r) => ({
      priority: r.priority,
      title: r.title,
      bytes: r.bytes,
      risk: r.risk,
      action: r.action,
      rationale: r.rationale,
    })),
  }
  fs.writeFileSync(
    path.join(outDir, 'mac-storage-summary.json'),
    JSON.stringify(summary, null, 2),
  )
  console.log('Wrote mac-storage-summary.json')
}

function syncSubs() {
  if (!fs.existsSync(killPath)) {
    console.warn('No subscription kill list at', killPath)
    return
  }
  const killText = fs.readFileSync(killPath, 'utf8')
  const lines = killText.trim().split('\n')
  const items = []
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('http')) continue
    if (line.includes('|')) {
      const parts = line.split('|').map((s) => s.trim())
      const next = lines[i + 1]?.trim()
      items.push({
        name: parts[0],
        cadence: parts[1],
        annual: parts[2],
        source: parts[3],
        cancel_url: next?.startsWith('http') ? next : '',
      })
    }
  }
  fs.writeFileSync(
    path.join(outDir, 'subscription-kill-list.json'),
    JSON.stringify(
      {
        generated_from: lines[0],
        annual_estimate: lines[1],
        source_path: killPath,
        items,
      },
      null,
      2,
    ),
  )
  console.log('Wrote subscription-kill-list.json (', items.length, 'items)')
}

syncMac()
syncSubs()
