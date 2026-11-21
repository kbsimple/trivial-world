---
phase: 25-backend-foundation-contracts
plan: 03
subsystem: backend
tags: [zod, contracts, vitest]
requires: [25-01]
provides:
  - Strict Zod 4 ingest and review contracts in @trivial-world/types
  - Root vitest projects gate (no DB, no build required)
  - IngestRepository port
requirements: [BACK-02, BACK-07]
key-files:
  created:
    - packages/types/src/ingest.ts
    - packages/types/src/ingest.test.ts
    - packages/types/src/review.ts
    - packages/types/src/review.test.ts
    - packages/types/vitest.config.ts
    - packages/api/src/repo.ts
    - vitest.config.ts
  modified:
    - packages/types/src/index.ts
    - packages/types/package.json
    - packages/types/tsconfig.json
    - apps/mobile/vitest.config.ts
    - package.json
    - pnpm-lock.yaml
metrics:
  completed: 2026-11-17
---

# Phase 25 Plan 03: Contracts and Test Topology Summary

Strict, capped, versioned Zod contracts for game records, feedback, review export and review decisions, plus a root `vitest` projects gate and the `IngestRepository` port.

## Exports
- ingest: INGEST_SCHEMA_VERSION, MAX_BODY_BYTES (65536), MAX_OUTCOMES (500), MAX_NOTE_CHARS (500), MAX_SEATS (8), ContentHashSchema, QuestionIdSchema, SeatSchema, OutcomeSchema, GameStatusSchema, GameRecordSchema, FeedbackReasonSchema, QuestionSnapshotSchema, FeedbackSchema, IngestReceiptSchema, ApiErrorCodeSchema, ApiErrorSchema, HealthResponseSchema, and inferred types.
- review: REVIEW_SCHEMA_VERSION, MAX_REVIEW_FEEDBACK_ITEMS (200), MAX_REVIEW_DECISIONS (100), ReviewDecisionKindSchema, ReviewExportItemSchema, ProposedFixSchema, ReviewDecisionSchema, ReviewDecisionBatchSchema, ReviewItemResultSchema, ReviewBatchResponseSchema, and inferred types.
- api: IngestRepository, InsertResult (packages/api/src/repo.ts).

## Test commands
- `npx vitest run` or `pnpm test:unit` (root): apps/mobile + packages/*; 474 tests passing, verified with packages/types/dist removed (source alias).
- `pnpm test:integration` -> `pnpm --filter @trivial-world/api test:integration` (not in turbo).
- `pnpm --filter @trivial-world/types test`: 41 tests.

## Commits
- 78a6760 feat(25-03): ingest contracts with tests
- 4102350 feat(25-03): review contracts and package exports
- fcaea27 feat(25-03): root vitest projects, types source alias, repo port

## Deviations from Plan
- The worktree base differed from the expected base, so it was reset to 890546e per the startup check.
- TDD: tests and implementation for each task were written together before the first run, so a separate failing RED run was not captured.
- Verified: apps/mobile tsc exit 0, api typecheck passes, mobile standalone vitest 433 passing, dist excludes test files.

## Known Stubs
None.

## Self-Check: PASSED
