---
type: architecture
venture_id: research-frontier
updated: 2026-08-24
---

# Research Frontier architecture

## System design

Paper clubbing and frontier ranking for generative comics / multimodal consistency vertical. Brain wiki is the knowledge store.

```mermaid
flowchart LR
  Abs["Abstracts / OpenAlex"] -->|ingest| Club["Paper clubbing"]
  Club --> Brain["brain/wiki"]
  Cites["Citation graph"] --> Brain
  Brain --> Rank["Frontier ranking"]
  Rank --> Q["Open questions"]
```

## Input / output flows

- **In:** abstracts, OpenAlex/Semantic Scholar citations
- **Out:** ranked open questions, concept pages in brain/wiki

## Data stores

| Store | Type | Path |
|-------|------|------|
| Brain | Markdown | ~/Projects/avinashs-kingdom/brain |

## Future plans

- Ingest 1-3 abstracts via kingdom-wiki
- Citation graph pull
