# Skill observation log

Stable path: `brain/skill-observations/log.md`  
Upstream methodology: rebelytics task-observer (CC BY 4.0).


## 2026-08-11

### Observation 1: Prompt-for-secrets beats .env for personal automation

**Status:** OPEN
**Date:** 2026-08-11
**Session context:** Job Jugaad venture scaffold — user refused .env for Gmail/API keys
**Skill:** New skill candidate: kingdom-secrets (also Cursor alwaysApply rule)
**Type:** internal
**Phase/Area:** secrets handling

**Issue:** User provided credentials via upload once, but established standing preference to be asked manually each run rather than maintaining .env files for Kingdom/Job Jugaad.

**Suggested improvement:** Keep kingdom-secrets.mdc alwaysApply; Job Jugaad CLI prompts via readline (masked). Never copy chat/upload secrets into repo files.

**Principle:** For personal automation, interactive per-run secret prompts reduce long-lived credential sprawl better than project .env files when the human is present at the keyboard.
