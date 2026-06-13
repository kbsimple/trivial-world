---
phase: 15-per-player-pack-selection
plan: 02
subsystem: game-store
tags: [game, store, zustand, pack-selection, per-player, question-routing]
dependency_graph:
  requires:
    - Player.packId field (15-01)
    - playerStore.updatePlayerPack (15-01)
  provides:
    - GameState.playerPackIds field (types/game.ts)
    - GameState.playerCategories field (types/game.ts)
    - startGame() per-player pack snapshot (stores/gameStore.ts)
    - selectCategory() packId routing (stores/gameStore.ts)
    - markAnswer() per-player championship check (stores/gameStore.ts)
    - selectQuestion optional packId param (stores/questionStore.ts)
  affects:
    - apps/mobile/types/game.ts
    - apps/mobile/stores/gameStore.ts
    - apps/mobile/stores/questionStore.ts
    - apps/mobile/stores/gameStore.test.ts
tech_stack:
  added: []
  patterns:
    - Snapshot pattern — gameState captures per-player derived data at game start
    - Optional parameter threading — packId flows from gameStore snapshot → questionStore
    - resolvedPackId = packId ?? activePackId — graceful fallback for backward compatibility
    - deriveCategoriesForPack helper — pure function inside startGame for testability
key_files:
  created: []
  modified:
    - apps/mobile/types/game.ts
    - apps/mobile/stores/gameStore.ts
    - apps/mobile/stores/questionStore.ts
    - apps/mobile/stores/gameStore.test.ts
decisions:
  - deriveCategoriesForPack falls back to ALL_CATEGORIES when pack not in availablePacks
  - markAnswer reads get() fresh for playerCategories to avoid closure stale read
  - Per-pack resetAskedQuestions uses setState to temporarily set activePackId then restores
  - getActiveCategories() helper deleted — replaced by snapshot-based approach
  - All individual startGame test mocks updated to include availablePacks and enabledCategories
metrics:
  duration: ~7 minutes
  completed: 2026-06-13
---

# Phase 15 Plan 02: GameStore Per-Player Pack Snapshot Summary

**One-liner:** gameStore snapshots per-player pack IDs and derived category sets at game start; selectCategory routes questions to each player's pack; markAnswer uses per-player snapshot for championship detection.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add playerPackIds and playerCategories to GameState type | 1dd8da9 | types/game.ts |
| 2 | Update gameStore, questionStore, and test mocks | 9806894 | stores/gameStore.ts, stores/questionStore.ts, stores/gameStore.test.ts |

## What Was Built

### GameState type (types/game.ts)
Added two new fields to the `GameState` interface:
- `playerPackIds: (string | null)[]` — snapshotted pack ID per player at game start; `null` means the player inherited the game-level `activePackId`
- `playerCategories: PlayerColor[][]` — snapshotted active categories per player derived from pack `categoryCounts` filtered by `enabledCategories`

### gameStore.ts
- **startGame()**: Now destructures `availablePacks` and `enabledCategories` from packStore. Snapshots `playerPackIds` (each player's `packId ?? activePackId ?? null`) and `playerCategories` (via `deriveCategoriesForPack` pure helper). Resets asked questions for every unique pack ID used across all players — not just the game-level pack.
- **selectCategory()**: Reads `playerPackIds[currentPlayerIndex]` and passes it as `packId` to `selectQuestion`.
- **markAnswer()**: Championship check now uses `playerCategories[currentPlayerIndex] ?? ALL_CATEGORIES` instead of the deleted `getActiveCategories()` helper that read from packStore globally.
- **resetGame()**: Clears `playerPackIds: []` and `playerCategories: []`.
- **partialize**: Persists `playerPackIds` and `playerCategories` for session restore.
- **getActiveCategories()**: Deleted — replaced by snapshot-based approach.

### questionStore.ts
- `selectQuestion` signature updated to `(category: PlayerColor, packId?: string) => Promise<Question | null>`
- Native path now resolves `resolvedPackId = packId ?? activePackId` — uses the caller-supplied pack ID if provided, falling back to the store's active pack
- Web path unchanged (accepts but ignores `packId`)

### gameStore.test.ts
- Module-level packStore mock updated to include `availablePacks: []`, `enabledCategories: null`, and `setState: vi.fn()`
- All individual `mockReturnValue` overrides in `startGame` tests updated to include `availablePacks: []` and `enabledCategories: null`
- `beforeEach` state reset includes `playerPackIds: []` and `playerCategories: []`
- `selectCategory` test expects `selectQuestion('pink', undefined)` (packId from empty playerPackIds array)
- Championship test explicitly sets `playerCategories: [ALL_CATEGORIES]` and `playerPackIds: [null]`
- Initial state test asserts `playerPackIds: []` and `playerCategories: []`
- `resetGame` test sets and asserts both new fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Individual startGame test mocks missing availablePacks/enabledCategories**
- **Found during:** Task 2 (initial test run — 3 tests failed)
- **Issue:** Six individual test calls to `vi.mocked(usePackStore.getState).mockReturnValue(...)` only returned `{ activePackId: ... }`. The updated `startGame()` destructures `availablePacks` and `enabledCategories`, causing `availablePacks.find(...)` to throw (undefined.find), which landed in the catch block — `completedCategories` never set.
- **Fix:** All individual `mockReturnValue` calls updated to include `availablePacks: []` and `enabledCategories: null`. The `activePackId: null` case also updated.
- **Files modified:** `apps/mobile/stores/gameStore.test.ts`
- **Commit:** 9806894 (included in Task 2 commit)

## Verification

- `grep "playerPackIds\|playerCategories" apps/mobile/stores/gameStore.ts` → 15 lines (initial state, startGame snapshot, markAnswer, resetGame, partialize = 5 locations × 2 fields + deriveCategoriesForPack uses = correct)
- `grep "resolvedPackId" apps/mobile/stores/questionStore.ts` → 3 lines
- `grep "packId?" apps/mobile/stores/questionStore.ts` → 2 lines (interface + implementation)
- `grep "getActiveCategories" apps/mobile/stores/gameStore.ts` → 0 lines (deleted)
- `grep "uniquePackIds" apps/mobile/stores/gameStore.ts` → 2 lines (declaration + loop)
- `grep "availablePacks: \[\]" apps/mobile/stores/gameStore.test.ts` → 8 lines
- All 207 tests pass (48 gameStore + 159 other stores) — zero failures
- No new TypeScript errors introduced in modified files

## Known Stubs

None. All data flows are wired — `playerPackIds` and `playerCategories` are derived from real store data (`playerStore.players` + `packStore.availablePacks`) and used in actual gameplay logic.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. The `playerPackIds` values flow from `playerStore` (user-selected from the controlled `packStore.availablePacks` list) to `questionStore` as an internal parameter — consistent with T-15-02 and T-15-03 (accept disposition).

## Self-Check: PASSED

- `apps/mobile/types/game.ts` — modified, playerPackIds and playerCategories confirmed
- `apps/mobile/stores/gameStore.ts` — modified, confirmed
- `apps/mobile/stores/questionStore.ts` — modified, confirmed
- `apps/mobile/stores/gameStore.test.ts` — modified, confirmed
- Commit 1dd8da9 confirmed: `feat(15-02): add playerPackIds and playerCategories to GameState type`
- Commit 9806894 confirmed: `feat(15-02): snapshot playerPackIds/playerCategories; thread packId through selectQuestion`
- All 207 tests pass
