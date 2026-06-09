---
phase: 06-question-pack-structure
plan: 01
subsystem: types, infra
tags: [monorepo, turborepo, pnpm-workspaces, zod, json-schema, typescript]

# Dependency graph
requires: []
provides:
  - Turborepo monorepo structure with pnpm workspaces
  - @trivial-world/types package with Zod schemas
  - TypeScript types derived from Zod schemas via z.infer
  - JSON Schema exports for non-TypeScript validation
affects: [question-pack-structure, question-generator, game-configuration]

# Tech tracking
tech-stack:
  added: [turbo, zod, zod-to-json-schema]
  patterns: [contract-first-development, zod-first-types]

key-files:
  created:
    - packages/types/src/category.ts
    - packages/types/src/question-pack.ts
    - packages/types/src/json-schema.ts
    - packages/types/src/index.ts
    - packages/types/package.json
    - packages/types/tsconfig.json
    - pnpm-workspace.yaml
    - turbo.json
    - apps/mobile/package.json
  modified:
    - package.json (converted to monorepo root)

key-decisions:
  - "D-01: Full monorepo with Turborepo, pnpm workspaces, shared @trivial-world/types package"
  - "D-02: Defer migration of existing 120 questions until user reviews them"
  - "D-03: UUID-based pack identifiers"
  - "D-04: Single active pack per game session"
  - "D-05: Schema versioning with additive-only changes"

patterns-established:
  - "Contract-first: Zod schemas define types, apps import from @trivial-world/types"
  - "URL-safe question IDs (^[a-z0-9-]+$) for stable references"
  - "Schema versioning: schemaVersion literal field in every pack"

requirements-completed: [PACK-01, PACK-02, PACK-03]

# Metrics
duration: 15min
completed: 2026-06-08
---

# Phase 6 Plan 1: Monorepo & Types Package Summary

**Turborepo monorepo with pnpm workspaces, @trivial-world/types package containing Zod schemas for QuestionPack/Question/PackMetadata with JSON Schema exports**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-08T12:27:00Z
- **Completed:** 2026-06-08T12:42:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Established monorepo structure with Turborepo and pnpm workspaces
- Created @trivial-world/types shared package with Zod-first type definitions
- Defined QuestionPack, Question, PackMetadata, PackIndexEntry schemas with versioning
- Exported JSON Schema draft-07 format for non-TypeScript environments
- Migrated existing Expo app to apps/mobile with workspace dependency on types package

## Files Created/Modified
- `package.json` - Converted to monorepo root with turbo scripts
- `pnpm-workspace.yaml` - Workspace configuration for apps/* and packages/*
- `turbo.json` - Turborepo pipeline configuration
- `apps/mobile/package.json` - Expo app relocated with @trivial-world/types workspace dependency
- `packages/types/package.json` - @trivial-world/types package configuration
- `packages/types/tsconfig.json` - TypeScript config for types package
- `packages/types/src/category.ts` - CategorySchema, DifficultySchema, CATEGORY_NAMES
- `packages/types/src/question-pack.ts` - QuestionSchema, PackMetadataSchema, QuestionPackSchema, PackIndexEntrySchema
- `packages/types/src/json-schema.ts` - JSON Schema 7 exports via zod-to-json-schema
- `packages/types/src/index.ts` - Public exports for @trivial-world/types

## Decisions Made
- Used Zod-first approach: schemas define types, TypeScript types derived via `z.infer`
- Minimum 20 questions per pack for meaningful gameplay
- SHA-256 checksum for pack integrity verification
- Schema version `"1.0.0"` literal for version-aware validation
- JSON Schema draft-07 for broad compatibility with validators (AJV, etc.)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all files created successfully, structure matches plan specification.

## User Setup Required

None - no external service configuration required. The types package is internal.

## Next Phase Readiness
- Monorepo foundation complete, ready for pnpm install
- Types package ready for use by mobile app and generator web app
- Zod schemas defined, ready for runtime validation
- JSON Schema available for non-TypeScript validators
- Phase 7 (Question Generator) can now import @trivial-world/types

---
*Phase: 06-question-pack-structure*
*Completed: 2026-06-08*

## Self-Check: PASSED
- All 10 key files verified to exist
- QuestionPackSchema, PackMetadataSchema present in question-pack.ts
- schemaVersion "1.0.0" literal verified
- questionPackJsonSchema export verified
- @trivial-world/types workspace dependency in apps/mobile/package.json