---
name: cicstep-weekly
description: >-
  Draft CICStep / CICS Careers weekly check-ins from Kingdom source-of-truth logs.
  Use when the user asks for CICStep, CICS weekly, careers check-in, or weekly
  accomplishments for UMass CICS Careers — not for casual status chat.
---

# CICStep weekly (internal)

Compile from dated logs, then map to the form. Do not invent outreach, events, mentorship, or lab work from panel progress alone.

## Sources (last 7 days of the reporting window)

Pull in this order:

1. `brain/wiki/log.md` — entries in the window
2. Each P0/P1 venture `STATUS.md` + `PROJECT_LOG.md` (or phase evaluation dates)
3. Comic: git log since window start **and** both `data/v2a_program.json` + `data/v2b_program.json` when present
4. City: `PROJECT_LOG` / phase eval dates — not only live-tracker “next pending”
5. Job Jugaad / applications only if the user confirms applications as reportable

Path map: `brain/wiki/concepts/where-files-live.md`.

## Category checkboxes (default honest)

| CICStep category | Default |
|------------------|---------|
| Personal projects | **On** when any Kingdom venture shipped in-window |
| CICS events | **Off** unless user confirms attendance |
| Alumni mentorship | **Off** unless user confirms |
| Research lab (UMass) | **Off** unless user confirms lab work (BeamDojo/Kingdom ≠ UMass lab) |

List **non-claims** explicitly (e.g. no broker outreach, no CICS event, no alumni mentorship) so the draft cannot overclaim.

## Coverage rules (hard)

- Always mention **P0/P1** ventures in the window, even if the next gate is still pending.
- A pending next milestone ≠ “no work this week.” Prefer dated gate / PROJECT_LOG lines.
- Parallel product tracks = separate agents: Comic 2A vs 2B; do not let “2A next pending” hide 2B git.
- Scaffolding, sync, and tunnel setup are ops — not outreach or research-lab claims.

## Draft shape

1. Window dates (report the week the form asks for — may lag real calendar).
2. Checkboxes + non-claims list.
3. ~100-word **messy first-person** accomplishments (user will rewrite).
4. Next-week priority (one clear focus).
5. Goals line (honest, not aspirational padding).

## Pre-flight before delivery

- [ ] Every P0/P1 venture checked via dated logs, not only live-tracker next-line
- [ ] Comic scanned for both 2A and 2B (git + program JSON)
- [ ] Events / mentorship / UMass lab unchecked unless confirmed
- [ ] No invented applications, broker outreach, or lab affiliation
- [ ] Copy is draft voice — remind user to edit
