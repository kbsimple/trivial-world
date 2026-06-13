---
phase: 16-cli-question-generation
plan: "01"
subsystem: types-and-database
tags:
  - schema
  - watermelondb
  - migration
  - tidbits
  - tdd
dependency_graph:
  requires: []
  provides:
    - tidbits field in QuestionSchema (packages/types)
    - WatermelonDB schema v3 (apps/mobile)
    - Migration 003 (apps/mobile)
    - QuestionModel.tidbits field and toQuestion() inclusion
  affects:
    - All consumers of QuestionSchema (CLI generator, mobile UI, pack validation)
    - WatermelonDB migrations on app upgrade
tech_stack:
  added: []
  patterns:
    - TDD (RED/GREEN cycle)
    - WatermelonDB addColumns migration pattern
    - Zod optional field extension
key_files:
  created:
    - apps/mobile/database/migrations/003_add_tidbits.ts
    - apps/mobile/services/questionSchema.test.ts
  modified:
    - packages/types/src/question-pack.ts
    - apps/mobile/database/schema.ts
    - apps/mobile/database/migrations/index.ts
    - apps/mobile/database/models/Question.ts
decisions:
  - tidbits is z.string().max(500).optional() — backward compatible with all existing packs
  - schemaVersion z.literal('1.0.0') unchanged — tidbits optional means no contract break
  - Migration uses addColumns with isOptional: true — existing rows remain valid
metrics:
  duration_minutes: 3
  completed_date: "2026-06-13"
  tasks_completed: 2
  files_changed: 6
---

# Phase 16 Plan 01: Tidbits Field — Type System and Database Summary

## One-liner

Added optional `tidbits` field (max 500 chars) to QuestionSchema via TDD and wired it through WatermelonDB migration 003, schema v3, and QuestionModel.toQuestion().

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (TDD RED) | Failing test for tidbits field | 71b7280 | apps/mobile/services/questionSchema.test.ts |
| 1 (TDD GREEN) | Add tidbits to QuestionSchema | cb28816 | packages/types/src/question-pack.ts |
| 2 | WatermelonDB schema v3 + migration 003 + model update | 98a0d39 | apps/mobile/database/migrations/003_add_tidbits.ts, apps/mobile/database/schema.ts, apps/mobile/database/migrations/index.ts, apps/mobile/database/models/Question.ts |

## What Was Built

### QuestionSchema Extension (packages/types)

Added one line to `QuestionSchema` in `packages/types/src/question-pack.ts`:

```typescript
tidbits: z.string().max(500).optional(), // interesting context shown at answer reveal
```

This is backward-compatible: existing packs without `tidbits` continue to pass validation. `PackMetadataSchema.schemaVersion: z.literal('1.0.0')` was left unchanged.

### WatermelonDB Migration 003 (apps/mobile)

Created `apps/mobile/database/migrations/003_add_tidbits.ts` using the `addColumns` step pattern (same as migration 002). The migration adds `{ name: 'tidbits', type: 'string', isOptional: true }` to the `questions` table, upgrading the database from v2 to v3. Existing rows are not invalidated.

### Schema v3 (apps/mobile/database/schema.ts)

Bumped `version: 2` to `version: 3` and added the `tidbits` column to the `questions` tableSchema.

### Migration Registry (apps/mobile/database/migrations/index.ts)

Added import for `migration003`, incremented `maxVersion` from 2 to 3, and spread `migration003.sortedMigrations` after `migration002.sortedMigrations`. Schema version and maxVersion are now in sync (both 3), satisfying WatermelonDB's migration integrity check.

### Question Model (apps/mobile/database/models/Question.ts)

Added `@field('tidbits') tidbits?: string` decorator field and included `tidbits: this.tidbits` in `toQuestion()` return value.

## Test Results

- 4 new tidbits tests added (TDD): all pass
- 211 mobile tests total: all pass (no regressions)
- 87 generator tests: all pass (no regressions)
- TypeScript: no new errors introduced (pre-existing errors in questionStore.test.ts and game/results.tsx unchanged)

## Deviations from Plan

None — plan executed exactly as written. All TDD gates satisfied:
- RED commit: `71b7280` (test(16-01): add failing test...)
- GREEN commit: `cb28816` (feat(16-01): add tidbits field...)

## TDD Gate Compliance

- RED gate: commit `71b7280` — `test(16-01):` — 3 of 4 tests failed as expected
- GREEN gate: commit `cb28816` — `feat(16-01):` — all 4 tests pass

## Known Stubs

None — no placeholder values or TODO fields in the modified files.

## Threat Flags

No new security surface introduced. Changes are:
1. An optional string field on an existing Zod schema (no new network endpoints)
2. A WatermelonDB column addition with isOptional: true (no new auth paths or trust boundaries)

T-16-01-02 (DoS via schema mismatch) mitigated: schema.version (3) equals migrations.maxVersion (3).

## Self-Check: PASSED

Files exist:
- packages/types/src/question-pack.ts — contains `tidbits: z.string().max(500).optional()`
- apps/mobile/database/migrations/003_add_tidbits.ts — contains `toVersion: 3`
- apps/mobile/database/schema.ts — contains `version: 3`
- apps/mobile/database/migrations/index.ts — contains `maxVersion: 3`
- apps/mobile/database/models/Question.ts — contains `tidbits: this.tidbits`

Commits exist:
- 71b7280 (test RED)
- cb28816 (feat GREEN)
- 98a0d39 (feat Task 2)
