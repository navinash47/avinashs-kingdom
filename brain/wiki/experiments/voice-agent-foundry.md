---
type: concept
updated: 2026-09-28
tags: [voice-agent-foundry]
---

# Voice Agent Foundry experiments

| Experiment | Evidence | Result |
|---|---|---|
| Real-service browser onboarding, approval, order lookup, mock comparison | `tests/browser/onboarding.spec.ts` | Passed locally |
| PostgreSQL expired lease recovery and duplicate event receipt | `services/control-api/src/postgres.test.ts` | Passed locally |
| Ten concurrent budget reservations | `services/evaluation-worker/src/budget.test.ts` | Cap enforced locally |
| Live provider audio comparison | No measured results | Pending credentials and harness |

Mock results are contract fixtures, never vendor performance measurements. No paid calls were made during bootstrap.

[[ventures/voice-agent-foundry]] · [[architecture/voice-agent-foundry]]
