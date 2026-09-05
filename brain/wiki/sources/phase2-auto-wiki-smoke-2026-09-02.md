---
type: source
publish_status: published
updated: 2026-09-02
raw_hash: c81800ea96d15c6885ebc6903150ca6a176eed76daccdfb2b031c748bffd684d
tags: [auto-wiki]
---

# Phase 2 auto-wiki smoke source

**Raw:** 
**Status:** published (auto-wiki promote)

> Promoted from auto-wiki draft after lint.

## Summary

- Auto-wiki must create a draft under wiki/drafts/sources without publishing.
- Promoting requires an explicit --promote step after lint.
- Re-running the same file must be idempotent by content hash.

## Key claims

- Auto-wiki must create a draft under wiki/drafts/sources without publishing.
- Promoting requires an explicit --promote step after lint.
- Re-running the same file must be idempotent by content hash.

## Limitations

- Auto-wiki draft - verify against raw; do not treat as published truth.

## Links

- [[index]]
