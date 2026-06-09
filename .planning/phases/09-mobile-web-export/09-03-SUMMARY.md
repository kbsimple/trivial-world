---
phase: 09-mobile-web-export
plan: 03
subsystem: services/question-provider
tags: [web-compat, platform-abstraction, database-guard]
duration: 5m
completed: 2026-06-09T18:08:00Z
depends_on:
  - 09-02
provides:
  - Platform-aware question retrieval (getNextQuestion, getQuestionsForCategory)
  - Bundled questions for web (ALL_QUESTIONS)
  - Guarded database initialization for web
affects:
  - questionStore.ts (can use questionProvider instead of direct database queries)
  - game flow (web will use bundled questions)
tech_stack:
  added:
    - services/questionProvider.ts
    - Platform.OS checks in _layout.tsx
  patterns:
    - Platform-aware data source selection
    - Dynamic imports to avoid web bundling
key_files:
  created:
    - apps/mobile/services/questionProvider.ts
  modified:
    - apps/mobile/app/_layout.tsx
---

# Phase 9 Plan 3: Question Provider Abstraction Summary

**One-liner:** Platform-aware question provider with bundled questions for web and guarded database initialization.

## Objective

Create question provider abstraction and guard database initialization for web compatibility.

**Purpose:** Enable bundled questions on web while preserving WatermelonDB on mobile.

**Output:** Question provider abstraction, bundled question data, database init guard.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create question provider abstraction | 36f3378 | apps/mobile/services/questionProvider.ts |
| 2 | Add bundled questions export | N/A | No changes needed - exports already exist |
| 3 | Guard database initialization in app layout | f602976 | apps/mobile/app/_layout.tsx |

## Implementation Details

### Task 1: Question Provider Abstraction

Created `apps/mobile/services/questionProvider.ts` with:

- **`getNextQuestion(category, excludeIds)`**: Returns random unasked question
  - Web: Filters bundled ALL_QUESTIONS by category and exclusion list
  - Mobile: Queries WatermelonDB with pack filtering and asked_at checks
- **`getQuestionsForCategory(category)`**: Returns all questions for a category
  - Web: Uses getQuestionsByCategory from bundled data
  - Mobile: Queries database for active pack's questions

Key design decisions:
- Platform detection via `Platform.OS === 'web'`
- Dynamic imports for database on mobile to avoid web bundling issues
- Category filtering and difficulty support from packStore
- Fallback when all questions exhausted (re-ask category)

### Task 2: Bundled Questions Export

Verified existing exports in `apps/mobile/data/questions/index.ts`:
- `ALL_QUESTIONS`: Array of 120 questions from all categories
- `getQuestionsByCategory(category)`: Filter function

No changes needed - exports already correct per D-08.

### Task 3: Database Initialization Guard

Modified `apps/mobile/app/_layout.tsx`:

- Added `Platform` import from react-native
- SQLiteAdapter creation guarded: `Platform.OS !== 'web'`
- Database export guarded: `export const database = Platform.OS !== 'web' ? createDatabase(adapter!) : null`
- useEffect guard: Web immediately sets `isInitialized(true)` without database call
- Mobile continues normal database initialization flow

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dynamic imports | Used for database on mobile | Avoids bundling WatermelonDB on web |
| Null database on web | Database is null on web platform | Clean separation, no mock needed |
| Category type conversion | PlayerColor cast to Category | Both have same values, Category is canonical |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| None | - | No new security surface introduced |

## Self-Check: PASSED

- [x] services/questionProvider.ts exists and exports getNextQuestion, getQuestionsForCategory
- [x] Platform.OS checks present in both files
- [x] ALL_QUESTIONS export verified in data/questions/index.ts
- [x] Database initialization guarded for web
- [x] Commits: 36f3378, f602976

## Notes for Future Plans

- questionStore can be refactored to use questionProvider instead of direct database queries
- Web flow: skip pack selection screen, go directly to setup (next plan)
- Haptics utility wrapper needed for web no-op (D-10)