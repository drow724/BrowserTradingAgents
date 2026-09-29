# Quickstart: Feature 011 validation

## Prerequisites

- `npm install` (the `pixel-agents` package is no longer installed).
- Optional: delete any stale `public/office-art/` — the office must work with or without it.

## Scenarios

1. **Regenerate** — `node scripts/build-office-art.mjs --check` → exit 0 (committed PNGs equal the maps).
2. **Office** — `npm run dev`, open http://localhost:3000/?provider=standin: office ready, eight distinct
   characters seated; Run Graph: working roles type with screens on, others idle. (US1, SC-004)
3. **No upstream art** — Network tab: no request to `/office-art/`; all art from `/office/`. (FR-001)
4. **Provenance** — every file in `public/office/` has one row in `art/office/PROVENANCE.md`. (US2)

## Automated

```bash
npm run typecheck && npm run build && npm test
npm run test:browser
```
