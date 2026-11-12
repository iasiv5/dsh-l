# L♾️p Engineering Workbench (dsh-l)

**Turn your GitHub repositories into a visible loop: candidates come in, get triaged and prioritized, gates are cleared, code is built and verified, changes ship — and the new issues shipping creates flow back into the backlog. The loop keeps turning.**

[中文](README.md) | **English**

Status: design finalized (2026-11-12 grill consensus), v1 in development.

## What it is

A DeepSeek Harness sidebar workbench plugin: watch the GitHub repositories you choose, ingest every open issue and open PR into a candidate backlog, and have an LLM triage each candidate for validity, urgency and a recommended action. Three gates (before build / before ship / before release) are always human-approved.

- **v1**: data plane (ingest + backlog + triage advice), repo picker, manual refresh
- **v2**: one-way Feishu notifications + execution loop (task package → agent session → status flow-back)
- **v3**: confidence-based G1 auto-pass, two-way IM decisions, Ship, GitLab provider

Domain vocabulary: [GLOSSARY.md](GLOSSARY.md). Architecture: [ADR-0001](docs/adr/0001-park-autoloop-build-thin-layer.md). Full design: [docs/design.md](docs/design.md). Plans: [docs/plans/](docs/plans/).

## Development

```bash
npm install
npm run build   # emits lib/host.js + lib/client.js
npm test
```
