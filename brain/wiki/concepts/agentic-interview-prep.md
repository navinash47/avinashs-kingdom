---
type: concept
updated: 2026-09-02
tags: [jobs, interview, leetcode, system-design, agents]
---

# Agentic interview study checklist

Interview stack for Applied AI / Agent Engineer roles (not classical FAANG-SDE-first). Pair with [[ventures/job-jugaad]] and Track A resume.

**Mix:** Coding 40% · AI system design 30% · Agentic depth 25% · Light classical SDE 5%.

## 1. Coding (LeetCode) — ~120–150 focused

**Cadence:** 5 problems/week + 1 timed mock until fluent. Python. Know Big-O cold.

| Block | Topics | Target count |
|-------|--------|--------------|
| Foundations | Arrays, hash maps, two pointers, sliding window, stacks | 35 |
| Trees / graphs | BST, DFS/BFS, topological sort, union-find | 30 |
| Heaps / intervals | Top-K, merge intervals, scheduling | 15 |
| Strings | Parsing, tries (light) | 10 |
| Medium DP | Knapsack patterns, LIS, grid paths — **not** contest DP | 20 |
| Timed mixes | Medium interviews under 35–40 min | 15+ |

**Skip / defer:** heavy contest DP, obscure bit tricks, ICPC-level graphs.

**Pass bar:** consistent mediums in ~25–35 min; explain tradeoffs out loud.

## 2. System design for AI products

One drill per week. Outline: requirements → API → data → queues/workers → models/tools → evals → cost/latency → failure modes.

### Drill prompts

1. Design a **tool-calling agent backend** (chat + tools + retries + idempotency).
2. Design a **long-running job system** for comic/video generation (queue, workers, progress, cancel).
3. Design **multi-tenant LLM cost caps** (per-user ceilings, fallback models, caching).
4. Design **RAG vs agent memory** for a support bot; when each wins.
5. Design **eval regression in CI** (golden sets, LLM-as-judge pitfalls, flaky gates).
6. Design a **multi-agent YouTube desk** (work items, provenance lint, cut control).
7. Design **WhatsApp lead-qualify FSM** with human handoff and audit trail.
8. Classic: URL shortener / rate limiter / news feed — keep sharp for Big Tech screens.

### Kingdom talking points

- City **spend ceiling** + structured-output smoke tests
- Comic **usage.db** + split text vs image providers
- YouTube **provenance lint** (source URL, fair-use, times, beat)
- Kingdom **sync** of STATUS / phases / expenses

## 3. Agentic depth (take-home differentiator)

| Skill | What to practice | Proof you already have |
|-------|------------------|------------------------|
| Tool-calling loops | ReAct vs planner; schema for tools | Comic / City structured outputs |
| State machines vs planners | When FSM beats free-form agent | WhatsApp qualify → booking FSM |
| Multi-agent handoff | Work items, ownership, race control | YouTube multi-agent desk |
| Evals | Golden sets, LLM-as-judge failure modes | BioNLP R@10; Comic VLM rubric |
| Observability | Traces, failure taxonomies, cost | Provenance JSONL; usage metering |
| Framework literacy | LangGraph / OpenAI Agents SDK / MCP — tradeoffs | Custom orchestration is fine if explained — see [[agentic-stack-guidance]] |

**Ship one public artifact:** short eval report from Comic or YouTube (metrics + failure cases) > another DeepLearning.AI cert.

## 4. Light classical SDE (5%)

Keep Mastercard stories ready: latency, PCI tokenization, Java 8→17, Jenkins, Azure monitoring (−25% manual). Enough for legacy screens; do **not** re-specialize Java/SDE.

## Weekly template

| Day | Work |
|-----|------|
| Mon–Fri | 1 LC (or 5 across week) |
| Sat | 1 AI system-design drill (45–60 min writeup) |
| Sun | 1 agent take-home sketch OR mock interview |

## Related

- [[ventures/job-jugaad]]
- [[concepts/agentic-resume-gates]]
- [[concepts/agentic-stack-guidance]]
- Job Jugaad `CAREER_MARKETING.md` (LinkedIn copy)
- Resumes: `~/Portfolio/resume/Avinash Resume -Agentic.tex` (Track A), `…AI-Backend.tex` (Track B)
