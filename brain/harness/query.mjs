#!/usr/bin/env node
/**
 * Deterministic query surface over brain/harness/empty-model (KG + FSM).
 * For compiled-wiki search use: node brain/harness/wiki-query.mjs <terms>
 * Usage:
 *   node brain/harness/query.mjs list
 *   node brain/harness/query.mjs neighbors <nodeId>
 *   node brain/harness/query.mjs path <fromId> <toId>
 *   node brain/harness/query.mjs fsm
 *   node brain/harness/query.mjs allow <action>
 *   node brain/harness/query.mjs capabilities
 *   node brain/harness/query.mjs type <nodeType>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelDir = path.join(__dirname, 'empty-model')

function load(name) {
  const p = path.join(modelDir, name)
  if (!fs.existsSync(p)) {
    console.error(`Missing ${p} — run: npm run sync`)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function list(graph) {
  const byType = {}
  for (const n of graph.nodes) {
    byType[n.type] = (byType[n.type] ?? 0) + 1
  }
  console.log(JSON.stringify({ synced_at: graph.synced_at, counts: byType, nodes: graph.nodes.length, edges: graph.edges.length }, null, 2))
}

function neighbors(graph, id) {
  const out = graph.edges.filter((e) => e.from === id || e.to === id)
  console.log(JSON.stringify({ id, edges: out }, null, 2))
}

function pathFind(graph, from, to) {
  const adj = new Map()
  for (const e of graph.edges) {
    if (!adj.has(e.from)) adj.set(e.from, [])
    adj.get(e.from).push({ to: e.to, rel: e.rel, id: e.id })
    if (!adj.has(e.to)) adj.set(e.to, [])
    adj.get(e.to).push({ to: e.from, rel: e.rel, id: e.id })
  }
  const q = [[from]]
  const seen = new Set([from])
  while (q.length) {
    const cur = q.shift()
    const tip = cur[cur.length - 1]
    if (tip === to) {
      console.log(JSON.stringify({ path: cur }, null, 2))
      return
    }
    for (const n of adj.get(tip) ?? []) {
      if (seen.has(n.to)) continue
      seen.add(n.to)
      q.push([...cur, n.to])
    }
  }
  console.log(JSON.stringify({ path: null, error: 'no path' }, null, 2))
  process.exitCode = 1
}

function showFsm(fsm) {
  console.log(JSON.stringify(fsm, null, 2))
}

function allow(fsm, action) {
  const state = fsm.state
  const allowed = fsm.allowed_in_state?.[state] ?? []
  const ok = allowed.includes(action)
  console.log(JSON.stringify({ state, action, allowed: ok }, null, 2))
  if (!ok) process.exitCode = 1
}

function byType(graph, type) {
  const nodes = graph.nodes.filter((n) => n.type === type)
  console.log(JSON.stringify({ type, count: nodes.length, nodes }, null, 2))
}

function capabilities(graph) {
  byType(graph, 'capability')
}

const [cmd, a, b] = process.argv.slice(2)
const graph = () => load('graph.json')
const fsm = () => load('fsm.json')

switch (cmd) {
  case 'list':
    list(graph())
    break
  case 'neighbors':
    if (!a) {
      console.error('neighbors <nodeId>')
      process.exit(1)
    }
    neighbors(graph(), a)
    break
  case 'path':
    if (!a || !b) {
      console.error('path <fromId> <toId>')
      process.exit(1)
    }
    pathFind(graph(), a, b)
    break
  case 'fsm':
    showFsm(fsm())
    break
  case 'allow':
    if (!a) {
      console.error('allow <action>')
      process.exit(1)
    }
    allow(fsm(), a)
    break
  case 'capabilities':
    capabilities(graph())
    break
  case 'type':
    if (!a) {
      console.error('type <nodeType>')
      process.exit(1)
    }
    byType(graph(), a)
    break
  default:
    console.error(`Unknown command: ${cmd ?? '(none)'}
Commands: list | neighbors | path | fsm | allow | capabilities | type
Wiki search: node brain/harness/wiki-query.mjs <terms>`)
    process.exit(1)
}
