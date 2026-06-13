---
phase: 20
plan: 1
subsystem: stores
tags: [pack-store, game-store, all-custom-bypass]
key-files:
  modified:
    - apps/mobile/stores/packStore.ts
    - apps/mobile/stores/packStore.test.ts
    - apps/mobile/stores/gameStore.ts
    - apps/mobile/stores/gameStore.test.ts
metrics:
  tests_added: 4
  tests_removed: 4
  net_tests: 0
---

## Summary

Removed `packMode`/`setPackMode` from packStore and added `allPlayersCustom` bypass to `gameStore.startGame()`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 14dda49 | feat(20-01): remove packMode/setPackMode from packStore |
| 2 | fbcf6aa | feat(20-01): add all-custom bypass to gameStore.startGame() |

## Deviations

Used `!= null` (loose inequality) instead of `!== null` in `allPlayersCustom` computation. The strict check caused a pre-existing test ("does not start without an active pack") to fail because `clearAllMocks()` in beforeEach does not reset `mockReturnValue` implementations — mock players from earlier tests had `undefined` packId/comboId, and `undefined !== null` is `true`. Loose `!= null` correctly treats both `null` and `undefined` as "no custom source".

## Self-Check: PASSED

- `grep "packMode" apps/mobile/stores/packStore.ts` → no output ✓
- `grep "setPackMode" apps/mobile/stores/packStore.ts` → no output ✓
- `grep "allPlayersCustom" apps/mobile/stores/gameStore.ts` → match ✓
- `grep "all-custom bypass" apps/mobile/stores/gameStore.test.ts` → match ✓
- 52 gameStore tests pass, 45 packStore tests pass ✓
