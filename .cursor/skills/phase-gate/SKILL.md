---
name: phase-gate
description: >-
  Close a venture phase with evaluation, STATUS, PROJECT_LOG, budget check, and Kingdom sync.
  Use when marking a phase PASS/FAIL, finishing a gate, advancing phases.json, or when the user
  says phase gate, phase complete, or close phase on WhatsApp, City, or other phased repos.
---

# Phase gate

Pattern from WhatsApp Agent Cash `loginstructions.md`. Apply to any venture with `tracking/phases.json`.

## Checklist (in order)

1. **Confirm current phase** from `tracking/phases.json` (`current_phase` or equivalent). Do not gate the wrong phase.
2. **Write evaluation** into `phases.json` (pass/fail, notes, date).
3. **Update `STATUS.md`** — version/progress/priority and Next 3 tasks.
4. **Append `PROJECT_LOG.md`** with PASS or FAIL and one-line reason (create the file if the repo uses it and it is missing).
5. **Budget check** — if `BUDGET.md` or `tracking/expenses.jsonl` exists, confirm spend is under ceiling; halt and ask human if over policy.
6. **Sync Kingdom:**

```bash
cd /Users/avinashnandyala/Projects/avinashs-kingdom && npm run sync
```

7. Tell the human the new current phase and next open gate.

## Rules

- Only commit if the human asked.
- Do not skip sync after a gate.
- If the repo has no phases file, say so and stop — do not invent a phase system mid-gate.
