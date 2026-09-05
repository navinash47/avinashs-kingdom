---
type: concept
updated: 2026-09-02
tags: [agents, langchain, langgraph, fde, ai-engineering, orchestration, kingdom]
---

# Agentic stack guidance (LangChain / LangGraph / roles)

Decision note: **do not adopt LangChain/LangGraph as a Kingdom dependency by default.** Prefer custom orchestration + Finite State Machine/eval/cost/provenance discipline already in the fleet. Keep framework literacy for interviews and selective borrowing of patterns.

Pairs with [[agentic-interview-prep]], [[agentic-resume-gates]], and [[kingdom-personal-os]].

## Verdict

| Choice | Guidance |
|--------|----------|
| **LangChain** | Glue for prompts/tools/RAG chains. High abstraction risk; weak resume signal if oversold. |
| **LangGraph** | Stateful graphs (nodes, edges, checkpoints, cycles, HITL). Study the *ideas*; add the library only when a venture needs portable checkpointing / interrupt-resume you will not reinvent. |
| **Kingdom default** | Custom orchestration + harness Finite State Machine/KG + phase gates. Claim language: “built custom orchestration; can discuss LangGraph/MCP tradeoffs” ([[agentic-resume-gates]]). |

Kingdom already maps closer to **LangGraph concepts** than LangChain: WhatsApp qualify to booking Finite State Machine, Comic/City tool loops, YouTube multi-agent desk, brain harness control Finite State Machine ([[brain-harness-fsm]]).

## What the roles actually do

**Artificial Intelligence / Applied Artificial Intelligence engineer** - productize models: APIs, queues, caching, cost/latency, fallbacks; RAG vs memory vs fine-tune; eval harnesses in CI; traces + failure taxonomy + usage metering.

**Agentic engineer** - tool schemas + loops (ReAct vs planner); when Finite State Machine beats free-form agent; multi-agent handoff / ownership / race control; human handoff + audit; framework literacy without worship.

**Forward Deployed Engineer (Forward Deployed Engineer)** - sit in the customer workflow; thinnest agent that changes a real process; integration over clever prompting; pilot metrics and field failure modes. WhatsApp Phase 8+ unlocks Forward Deployed Engineer-strength claims ([[agentic-resume-gates]], [[ventures/whatsapp-voice]]).

## Patterns to borrow (without new frameworks)

1. **Explicit workflow graph** - states, legal transitions, human interrupt points; free-form Large Language Model only inside bounded nodes.
2. **Checkpoints + idempotency** - persist job state; retries must not double-charge / double-send.
3. **Typed tool contracts** - schemas + logs; MCP when external agents need a stable boundary ([[ops/personal-os-playbook]], Phase 2 MCP).
4. **Eval / lint gate before “done”** - goldens, Vision Language Model/rubric gates (Comic pattern).
5. **Cost / policy gate** - spend ceilings + structured-output smoke tests (City pattern).
6. **Provenance / audit trail** - mandatory for trust-sensitive flows (YouTube pattern).
7. **Compiled memory over vector-only** - wiki + skills + registry ([[llm-wiki]], [[kingdom-personal-os]]).
8. **One control plane** - `npm run sync` to Throne; onboard via [[onboard-new-project]].

## Selective tooling matrix

| Tool / pattern | Use when | Skip when |
|----------------|----------|-----------|
| OpenAI Agents SDK / Anthropic tool use | Thin product agents | Existing working loop is enough |
| MCP | Expose venture capabilities to Cursor / external agents | Pure internal scripts |
| LlamaIndex / light RAG | Huge messy corpora | Fleet topology / phases (wiki wins) |
| Braintrust / W&B / Langfuse | Eval + traces for public demos | No golden set yet |
| Queues (BullMQ, SQS, …) | Long comic/video jobs | Sync CLI / wiki compile |
| CrewAI / AutoGen | Rare demos | Multi-agent desks already custom |

## Progress loop for every venture

Same shape Forward Deployed Engineer + agentic product teams use:

1. Workflow graph (states + HITL)
2. Typed tools (logged)
3. Eval / lint gate (fail closed)
4. Metering + ceilings
5. Dogfood artifact with provenance
6. Register + sync into Kingdom

## Interview / study actions

- One short **LangGraph** tutorial for tradeoff fluency - not a rewrite of Comic/City/WhatsApp/Kingdom.
- Keep drill list in [[agentic-interview-prep]] (tool-calling backend, long-running jobs, cost caps, RAG vs memory, eval CI, multi-agent desk, WhatsApp Finite State Machine).

## Claims (do / don't)

| Don't say | Prefer |
|-----------|--------|
| Built with LangChain | Custom orchestration; LangGraph/MCP tradeoffs discussed |
| Scaled Artificial Intelligence product (pre-pilot) | Lab systems with spend ceilings + usage accounting |
| Chatbot for leads | Finite State Machine agent qualify to booking with handoff + audit |

Full gate table: [[agentic-resume-gates]].

## Related

- [[agentic-interview-prep]]
- [[agentic-resume-gates]]
- [[kingdom-personal-os]]
- [[brain-harness-fsm]]
- [[llm-wiki]]
- [[ventures/job-jugaad]]
- [[ventures/whatsapp-voice]]
- [[ventures/comic-engine]]
- [[multi-agent-youtube]]
