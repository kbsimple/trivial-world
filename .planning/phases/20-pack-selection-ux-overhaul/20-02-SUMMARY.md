---
phase: 20
plan: 2
subsystem: ui
tags: [setup-screen, pack-chips, segmented-control]
key-files:
  modified:
    - apps/mobile/app/game/setup.tsx
metrics:
  tests_added: 0
  tests_removed: 0
  net_tests: 0
---

## Summary

Rewrote `setup.tsx` to remove the segmented control (Shared Pack / Per Player toggle) and make per-player pack + difficulty chips always visible.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 23c0a11 | feat(20-02): remove segmented control, add always-visible per-player pack chips |

## Changes Applied

1. Removed `packMode` and `setPackMode` selectors from usePackStore
2. Removed `clearPlayerPackSources` from usePlayerStore destructure
3. Removed `handleSetPackMode` function
4. Added `allPlayersCustom` computed from `players.every(p => p.packId !== null || p.comboId !== null)`
5. Updated CONF-01 guard: `if (!activePackId && !allPlayersCustom)`
6. Updated packInfo to show "(optional)" hint when `allPlayersCustom`
7. Removed segmented control JSX block
8. Replaced conditional `{packMode === 'custom' && ...}` with always-visible `packChipRow` containing pack source chip + difficulty chip
9. Updated Start Game disabled logic: `players.length === 0 || (!activePackId && !allPlayersCustom)`
10. Removed dead styles: segmentedControl, segment, segmentActive, segmentText, segmentTextActive, playerSourceRow, playerSourceLabel, playerSourceChevron

## Self-Check: PASSED

- `grep "packMode" apps/mobile/app/game/setup.tsx` → no output ✓
- `grep "segmentedControl" apps/mobile/app/game/setup.tsx` → no output ✓
- `grep "allPlayersCustom" apps/mobile/app/game/setup.tsx` → match ✓
- `grep "packChipRow" apps/mobile/app/game/setup.tsx` → match ✓
- 288 tests pass ✓
