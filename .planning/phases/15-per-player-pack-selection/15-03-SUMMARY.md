---
phase: 15-per-player-pack-selection
plan: 03
subsystem: ui-setup-turn
tags: [ui, setup, turn, pack-selection, per-player, react-native, alert]
dependency_graph:
  requires:
    - Player.packId field (15-01)
    - playerStore.updatePlayerPack (15-01)
    - GameState.playerPackIds (15-02)
    - GameState.playerCategories (15-02)
  provides:
    - Per-player pack chip in setup screen sub-row (apps/mobile/app/game/setup.tsx)
    - Alert.alert pack picker on native (apps/mobile/app/game/setup.tsx)
    - Turn screen progress strip with per-player pack name (apps/mobile/app/game/turn.tsx)
    - Per-player category grid from snapshot (apps/mobile/app/game/turn.tsx)
  affects:
    - apps/mobile/app/game/setup.tsx
    - apps/mobile/app/game/turn.tsx
tech_stack:
  added: []
  patterns:
    - Platform.OS guard — web shows static badge; native shows tappable chip with Alert.alert picker
    - Two-row player entry layout — Row 1 (colorDot | nameInput | removeButton), Row 2 (pack chip sub-row)
    - Per-player snapshot consumption — turn screen reads playerPackIds/playerCategories from gameStore
    - Truncated display name — pack names capped at 12 chars + ellipsis for compact progress strip
key_files:
  created: []
  modified:
    - apps/mobile/app/game/setup.tsx
    - apps/mobile/app/game/turn.tsx
decisions:
  - Pack chip placed in sub-row BELOW name input per CONTEXT.md locked decision (not inline)
  - Alert.alert used for pack picker (already imported; no new modal screen needed)
  - Platform.OS !== 'web' guard hides chip on web (no downloaded packs concept on web)
  - progressPack shown only when displayPackName is non-null (no "Default" badge in progress strip)
  - Pre-existing TS2322 readonly-array error in turn.tsx resolved as side effect of playerCategories migration
metrics:
  duration: ~8 minutes
  completed: 2026-06-12
---

# Phase 15 Plan 03: Setup Pack Chip and Turn Progress Strip Summary

**One-liner:** Setup screen gets a per-player pack chip in a sub-row below each name input (native-only, Alert.alert picker); turn screen progress strip shows truncated pack names and uses per-player category snapshot for grid and counts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add per-player pack chip and Alert.alert picker to setup.tsx | 0197721 | apps/mobile/app/game/setup.tsx |
| 2 | Update turn.tsx progress strip and category grid to use per-player snapshots | f10a333 | apps/mobile/app/game/turn.tsx |

## What Was Built

### setup.tsx

- **Import:** `Platform` added to react-native imports
- **Store subscriptions:** `updatePlayerPack` destructured from `usePlayerStore`; `downloadedPackIds` subscribed from `usePackStore`
- **`handlePickPack(playerId)`:** Platform guard (`Platform.OS === 'web'` returns early); builds `selectablePacks` from `availablePacks` filtered by `downloadedPackIds`; opens `Alert.alert` with "Default (game pack)" option, one button per downloaded pack (names truncated at 28 chars in picker), and a Cancel button
- **Player row layout:** Each player entry wrapped in `playerRowOuter` column View. Row 1 (unchanged): `[colorDot | nameInput | removeButton]`. Row 2 (native only): `packChipRow` View containing a `Pressable` chip that shows the player's pack name (truncated to 12 chars) or "Default"; chip style toggles between `packChipDefault` (gray/muted) and `packChipActive` (brighter) based on whether a pack is assigned
- **Styles added:** `playerRowOuter`, `packChipRow`, `packChip`, `packChipDefault`, `packChipActive`, `packChipText`; `marginBottom` moved from `playerRow` to `playerRowOuter`

### turn.tsx

- **Store subscriptions:** `playerPackIds` and `playerCategories` added to `useGameStore` destructure; `availablePacks` added from `usePackStore`; `enabledCategories` subscription removed
- **`activeCategories` derivation:** Now reads `playerCategories[currentPlayerIndex] ?? PLAYER_COLORS` (per-player snapshot) instead of `enabledCategories` from packStore — fixes the pre-existing TS2322 readonly-array type error as a side effect
- **Progress strip:** Each player entry now derives `totalCats` from `playerCategories[idx]`; looks up `displayPackName` (truncated to 12 chars) from `availablePacks` using `playerPackIds[idx]`; conditionally renders a `progressPack` Text element between the player name and the count
- **Style added:** `progressPack` (color: #888, fontSize: 11, marginRight: 4)

## Deviations from Plan

None — plan executed exactly as written. The pre-existing TS2322 readonly-array error in turn.tsx was incidentally resolved by the planned migration from `enabledCategories` to `playerCategories`.

## Verification

- `grep "handlePickPack" apps/mobile/app/game/setup.tsx` → 3 lines (definition + JSX onPress + filter call)
- `grep "updatePlayerPack" apps/mobile/app/game/setup.tsx` → 3 lines (destructure + null call + id call)
- `grep "Platform.OS" apps/mobile/app/game/setup.tsx` → 2 lines (handler guard + JSX guard)
- `grep "playerPackIds" apps/mobile/app/game/turn.tsx` → 2 lines (destructure + usage)
- `grep "playerCategories" apps/mobile/app/game/turn.tsx` → 3 lines (destructure + activeCategories + progress strip)
- `grep "enabledCategories" apps/mobile/app/game/turn.tsx` → 0 lines (removed)
- All 207 tests pass — zero failures
- No new TypeScript errors in modified files (pre-existing turn.tsx TS2322 resolved)

## Known Stubs

None. Pack chip data flows from real `playerStore.players[].packId` (set by `updatePlayerPack`). Progress strip pack names flow from real `gameStore.playerPackIds` snapshot + `packStore.availablePacks` index.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Pack options in Alert.alert are built from `packStore.availablePacks` (controlled list) — consistent with T-15-04 (accept disposition). Pack name in progress strip is display-only text — consistent with T-15-05 (accept disposition).

## Self-Check: PASSED

- `apps/mobile/app/game/setup.tsx` — modified, handlePickPack + pack chip confirmed
- `apps/mobile/app/game/turn.tsx` — modified, playerPackIds/playerCategories + progressPack confirmed
- Commit 0197721 confirmed: `feat(15-03): add per-player pack chip and Alert.alert picker to setup screen`
- Commit f10a333 confirmed: `feat(15-03): update turn screen to use per-player pack snapshot for category grid and progress strip`
- All 207 tests pass
