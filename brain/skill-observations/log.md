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

### Observation 2: Cloud headed apply needs TTY for CAPTCHA truthfulness

**Status:** OPEN
**Date:** 2026-08-11
**Session context:** Job Jugaad live apply test in cloud agent
**Skill:** New skill candidate: headed-apply-ops
**Type:** internal
**Phase/Area:** apply verification

**Issue:** Without an interactive TTY, CAPTCHA pauses cannot be cleared and Submit-not-found paths were at risk of being marked submitted; fixed to waiting-on-you, but confirmation-email proof still requires Mac terminal + Gmail prompt.

**Suggested improvement:** Document Mac-only live apply gate; keep cloud for discover/rank/profile enrich.

**Principle:** Automations that claim “submitted” must require either a confirmation signal (email/DOM) or an interactive human gate — never treat a timed wait as success.

## 2026-08-11 — LinkedIn auth in cloud: OTP + human CAPTCHA

- Pattern: LinkedIn login in cloud agents needs (1) memory-only creds, (2) long OTP file wait, (3) headed browser + `waiting_on_you` pause for manual captcha clicks — do not automate CAPTCHA bypass.
- Friction: short OTP timeouts drop sessions before the user can reply; restart loses the challenge and requests a new code.
- Keep: `/tmp/job-jugaad-linkedin-otp` + `/tmp/job-jugaad-linkedin-continue` + status JSON for human-in-the-loop auth.
