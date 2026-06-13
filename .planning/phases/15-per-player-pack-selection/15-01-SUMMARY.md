---
phase: 15-per-player-pack-selection
plan: 01
subsystem: player-model
tags: [player, store, zustand, pack-selection, types]
dependency_graph:
  requires: []
  provides:
    - Player.packId field (types/player.ts)
    - PlayerState.updatePlayerPack action (types/player.ts)
    - updatePlayerPack implementation (stores/playerStore.ts)
    - packId: null initialization in addPlayer (stores/playerStore.ts)
  affects:
    - apps/mobile/types/player.ts
    - apps/mobile/stores/playerStore.ts
    - apps/mobile/stores/playerStore.test.ts
tech_stack:
  added: []
  patterns:
    - Zustand set() action with .map() filter — identical shape to updatePlayerName
    - Optional nullable field (packId?: string | null) for backward compatibility
key_files:
  created: []
  modified:
    - apps/mobile/types/player.ts
    - apps/mobile/stores/playerStore.ts
    - apps/mobile/stores/playerStore.test.ts
decisions:
  - packId is optional (?) to keep backward compatibility with persisted state that lacks the field
  - packId: null (not undefined) in addPlayer for stable JSON serialization through persist middleware
  - updatePlayerPack follows exact same pattern as updatePlayerName for consistency
metrics:
  duration: ~4 minutes
  completed: 2026-06-13
---

# Phase 15 Plan 01: Player Pack Assignment Foundation Summary

**One-liner:** Player model gains `packId?: string | null` field and `updatePlayerPack` action — foundational data layer for per-player pack selection.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add packId to Player interface and updatePlayerPack to PlayerState | 75bd6e9 | types/player.ts |
| 2 | Implement updatePlayerPack in playerStore and update addPlayer | 31fe33b | stores/playerStore.ts, stores/playerStore.test.ts |

## What Was Built

The `Player` model now carries a `packId?: string | null` field. When `null`, downstream logic falls back to the game-level `activePackId`; when set to a string, that pack is used for this player's questions. The `updatePlayerPack(id, packId)` action in `playerStore` follows the exact same pattern as the existing `updatePlayerName` action.

`addPlayer()` now initializes `packId: null` explicitly — this avoids `undefined` appearing in test assertions and ensures stable round-trip serialization through Zustand's persist middleware (JSON.stringify drops `undefined` keys, causing rehydration shape mismatches).

## Verification

- `grep "packId" apps/mobile/types/player.ts` returns 2 lines (Player + PlayerState)
- `grep "updatePlayerPack" apps/mobile/types/player.ts` returns 1 line
- `grep "packId: null" apps/mobile/stores/playerStore.ts` returns 1 line (in addPlayer)
- `grep "updatePlayerPack" apps/mobile/stores/playerStore.ts` returns 1 line (implementation)
- All 207 tests pass (42 playerStore + 165 in other stores) — zero failures
- No new TypeScript errors in modified files

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. `packId: null` is intentional default state (not a stub) — it means "use game default", which is the correct behavior when no per-player pack has been assigned.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. `packId` values flow from internal store data only, consistent with T-15-01 (accept disposition).

## Self-Check: PASSED

- `apps/mobile/types/player.ts` — modified, confirmed
- `apps/mobile/stores/playerStore.ts` — modified, confirmed
- `apps/mobile/stores/playerStore.test.ts` — modified, confirmed
- Commit 75bd6e9 exists: `git log --oneline | grep 75bd6e9` confirmed
- Commit 31fe33b exists: `git log --oneline | grep 31fe33b` confirmed
- All 207 tests pass
