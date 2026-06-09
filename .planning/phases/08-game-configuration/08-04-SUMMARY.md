---
phase: 08-game-configuration
plan: 04
type: gap-closure
wave: 4
depends_on:
  - 08-01
  - 08-02
  - 08-03
duration: ~45 minutes
completed: 2026-06-08T02:30:00Z
files_modified:
  - apps/mobile/database/index.ts
  - apps/mobile/database/migrations/003_seed_default_pack.ts
  - apps/mobile/database/migrations/index.ts
  - apps/mobile/app/_layout.tsx
  - apps/mobile/services/packDownloader.ts
  - apps/mobile/stores/questionStore.ts
  - apps/mobile/stores/gameStore.ts
  - apps/mobile/stores/packStore.ts
  - apps/mobile/app/packs/index.tsx
  - apps/mobile/app/index.tsx
  - apps/mobile/app/game/setup.tsx
---

# Phase 8 Plan 04: Gap Closure Summary

**One-liner:** Fixed all blocking TypeScript errors and resolved verification gaps: database export, type errors, async/sync mismatch, and download progress bytes display.

## Objective Achieved

Fixed blocking verification gaps preventing Phase 8 completion:
1. Database instance properly exported via `getDatabase()` singleton
2. All TypeScript type errors resolved (null vs undefined, type casts)
3. Async/sync mismatch in gameStore.ts corrected
4. Download progress now shows actual bytes transferred

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Export database instance from database/index.ts | DONE | ee82a44 |
| 2 | Fix TypeScript errors in packDownloader.ts | DONE | 63750a0 |
| 3 | Fix TypeScript errors in questionStore.ts | DONE | 7341c4c |
| 4 | Fix async/sync mismatch in gameStore.ts | DONE | d7b993a |
| 5 | Wire bytesWritten to DownloadProgress | DONE | 63b323a |
| 6 | TypeScript verification | DONE | clean compile |

## Key Changes

### Database Export (Task 1)

- Added `getDatabase()` function returning singleton Database instance
- Fixed SQLiteAdapter import (default import, not named export)
- Fixed migrations export to match `SchemaMigrations` type structure
- Updated all consumers to use `getDatabase()` instead of importing `database`

### TypeScript Fixes (Tasks 2-3)

- Changed `null` to `undefined` for optional fields in model creation callbacks
- Fixed model creation callback types (cast inside callback with `as QuestionPackModel`)
- Fixed `QuestionModel` type usage (use `InstanceType<typeof QuestionModel>` for dynamic imports)
- Added proper type aliases for dynamic import types

### Async/Sync Fix (Task 4)

- Made `startGame`, `nextTurn`, `selectCategory`, `startCenterQuestion` async in gameStore
- Added `await` to all `selectQuestion()` calls
- Ensured proper Promise handling for async question selection

### Download Progress (Task 5)

- Added `downloadBytesWritten` to packStore state
- Updated download progress callback to track actual bytes
- Passed real bytes to DownloadProgress component instead of hardcoded 0

## Deviations from Plan

None - plan executed exactly as written.

## Must-Haves Verified

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| All TypeScript errors resolved | VERIFIED | `npx tsc --noEmit` passes clean |
| Database instance properly exported | VERIFIED | `getDatabase()` function available |
| Async functions use await | VERIFIED | gameStore.ts uses `await selectQuestion()` |
| Download progress shows actual bytes | VERIFIED | `downloadBytesWritten` tracked and passed to UI |

## Technical Notes

### Database Singleton Pattern

The original architecture created the database in `_layout.tsx` but other files imported from `database/index.ts`. The fix uses a lazy singleton pattern:

```typescript
export function getDatabase(): Database {
  if (!_database) {
    const adapter = new SQLiteAdapter({ schema, migrations, jsi: true });
    _database = new Database({ adapter, modelClasses });
  }
  return _database;
}
```

This allows database access from any file without initialization order dependencies.

### WatermelonDB Type Patterns

Two TypeScript patterns were necessary:

1. **Model creation callbacks**: Use untyped callback parameter and cast inside:
   ```typescript
   await database.get('questions').create((question) => {
     const q = question as QuestionModel;
     q.questionText = text;
   });
   ```

2. **Dynamic import types**: Use `InstanceType<typeof QuestionModel>` for runtime type checking

## Files Modified

| File | Change Type | Key Change |
|------|-------------|------------|
| `database/index.ts` | Modified | Added `getDatabase()`, fixed SQLiteAdapter import |
| `database/migrations/003_seed_default_pack.ts` | Modified | Use `getDatabase()`, fixed null→undefined |
| `database/migrations/index.ts` | Created | Fixed migrations export structure |
| `services/packDownloader.ts` | Modified | Fixed type errors, use `getDatabase()` |
| `stores/questionStore.ts` | Modified | Fixed type imports, use `getDatabase()` |
| `stores/gameStore.ts` | Modified | Made functions async, added await |
| `stores/packStore.ts` | Modified | Added `downloadBytesWritten` state |
| `app/packs/index.tsx` | Modified | Use `downloadBytesWritten`, fix imports |
| `app/index.tsx` | Modified | Use `getDatabase()` |
| `app/game/setup.tsx` | Modified | Use `getDatabase()` |
| `app/_layout.tsx` | Modified | Fixed SQLiteAdapter import |