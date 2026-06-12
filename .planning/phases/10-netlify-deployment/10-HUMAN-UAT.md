---
status: automated
phase: 10-netlify-deployment
source: [10-VERIFICATION.md]
started: 2026-06-11T00:00:00Z
updated: 2026-06-12T00:00:00Z
---

## Status

All UAT items replaced by automated E2E tests in `e2e/production.spec.ts`.
Run with: `pnpm test:e2e:production`

## Test Coverage

| UAT Item | Automated Test | Status |
|----------|----------------|--------|
| Game app live on Netlify | `should load over HTTPS without script errors` | ✓ PASS |
| HTTPS on game site | `should load over HTTPS without script errors` | ✓ PASS |
| JS assets correct MIME type | `should serve JS assets with correct MIME type` | ✓ PASS |
| Live deep-linking /game | `should serve /game route directly (SPA deep-link)` | ✓ PASS |
| Live deep-linking /setup | `should serve /setup route directly (SPA deep-link)` | ✓ PASS |
| Deployment status endpoint | `/statusz.json returns valid deployment status JSON` | ✓ PASS |
| Pack index accessible | `/api/v1/packs.json returns valid pack index` | ✓ PASS |
| Pack download resolves | `pack download URL resolves to valid pack data` | ✓ PASS |
| Generator site live | `should load over HTTPS` | ✗ FAIL — site returns 404, Netlify publish dir misconfigured |
| Generator deep-link /review | `should serve /review route directly` | ✗ FAIL — generator site broken |
| Generator deep-link /packs | `should serve /packs route directly` | ✗ FAIL — generator site broken |

## Known Issues

**Generator Netlify site is broken** — `trivial-world-generator.netlify.app` returns 404 for all
routes. Root cause: Netlify UI for that site has incorrect publish directory or has never been
linked to the repository. Requires Netlify UI access to fix.

Pack data has been moved to the mobile site as a workaround (see commit 937586c).

## Summary

total: 11
passed: 8
issues: 3
pending: 0
skipped: 0
blocked: 0
