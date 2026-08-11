---
type: concept
updated: 2026-08-11
tags: [job-jugaad, qa]
---

# Job Jugaad Q&A memory

New ATS questions discovered during apply runs are stored in:

1. `job-jugaad/data/profile.yaml` → `learned_answers`
2. Entity [[entities/avinash-profile]] (non-secret answers only)

Agents should reuse `learned_answers` before calling the LLM for custom questions.

Standing defaults: F-1 OPT; legally authorized = Yes; future sponsorship needed = Yes.

- 2026-08-11: learned “Why Anthropic?* Why Anthropic?* null Why Anthropic? null…”

- 2026-08-11: learned “Additional Information Additional Information null Additional Information null…”

- 2026-08-11: learned “Are you legally authorized to work in the United States?…”

- 2026-08-11: learned “Will you now or in the future require sponsorship for employment visa status?…”

- 2026-08-11: learned “What is your visa / work authorization status?…”
