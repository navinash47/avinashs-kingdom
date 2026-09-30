---
type: concept
updated: 2026-09-28
tags: [voice-agent-foundry]
---

# Voice Agent Foundry architecture

React console → control API → voice runtime → commerce adapter. Evaluation worker owns mock benchmark reports and durable budget reservations. PostgreSQL stores tenant-scoped approved versions, sessions, transactional outbox and consumer receipts. The LiveKit audio worker is a separate process with server-authorized turns.

Three coding workers share one checkout with exclusive task paths; Codex owns shared contracts/migrations/CI. Cursor and OpenRouter handoffs are prepared; external workers have not been launched.

Primary design: `~/Projects/voice-agent-foundry/docs/system-design.md`.

[[ventures/voice-agent-foundry]] · [[experiments/voice-agent-foundry]]
