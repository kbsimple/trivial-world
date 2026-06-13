---
phase: 17-per-player-pack-and-difficulty
plan: "02"
subsystem: ui-layer
tags:
  - per-player-difficulty
  - setup-screen
  - turn-screen
  - react-native
  - alert
dependency_graph:
  requires:
    - "Plan 17-01: updatePlayerDifficulty action on playerStore"
    - "Plan 17-01: playerDifficulties snapshot in gameStore"
    - "Plan 17-01: Player.difficultyPreference field"
  provides:
    - "Difficulty chip in setup.tsx packChipRow (native only)"
    - "handlePickDifficulty handler with Alert.alert picker"
    - "Difficulty label in turn.tsx progress strip"
  affects:
    - "Setup screen: each player row has [pack chip][difficulty chip] side by side"
    - "Turn screen: progress strip shows difficulty label for players with preference set"
tech_stack:
  added: []
  patterns:
    - "Difficulty chip reuses existing packChip/packChipDefault/packChipActive/packChipText styles"
    - "Platform.OS === 'web' guard prevents difficulty chip render and handler on web"
    - "playerDifficulties?.[idx] != null guard (not !value) for null/undefined safety"
    - "difficultyLabel = capitalize(difficultyPreference) or 'Any Difficulty' in setup"
    - "difficultyLabel = capitalize(playerDifficulties[idx]) or null in turn (null = no render)"
key_files:
  created: []
  modified:
    - apps/mobile/app/game/setup.tsx
    - apps/mobile/app/game/turn.tsx
decisions:
  - "Difficulty chip reuses all four packChip styles verbatim — no new style keys added"
  - "packChipRow gap: 4 added to separate the two chips visually"
  - "Progress strip uses null difficultyLabel to suppress render (not empty string)"
  - "playerDifficulties?.[idx] != null (not truthy check) matches plan 17-01 data layer convention"
metrics:
  duration_minutes: 2
  completed_date: "2026-06-13"
  tasks_completed: 2
  files_modified: 2
---

# Phase 17 Plan 02: Setup UI Difficulty Chip + Turn Screen Difficulty Label Summary

Difficulty chip added to setup.tsx packChipRow alongside pack chip; difficulty label added to turn.tsx progress strip between pack name and category count — completing the visible surface of the per-player difficulty feature.

## What Was Built

### Task 1: Difficulty chip in setup.tsx packChipRow

**apps/mobile/app/game/setup.tsx** (32 additions):
- Destructured `updatePlayerDifficulty` from `usePlayerStore` alongside existing actions
- Added `handlePickDifficulty(playerId)` immediately after `handlePickPack`:
  - `Platform.OS === 'web'` guard (returns early on web)
  - `Alert.alert('Select Difficulty', undefined, [...])` with 5 options
  - Options: Any Difficulty (→ null), Easy (→ 'easy'), Medium (→ 'medium'), Hard (→ 'hard'), Cancel
- Added `difficultyLabel` computation in the player map (after `chipLabel`):
  - `player.difficultyPreference ? capitalize(difficultyPreference) : 'Any Difficulty'`
- Added second `Pressable` inside existing `packChipRow` View:
  - Uses `packChip` + `packChipDefault`/`packChipActive` + `packChipText` styles (no new styles)
  - `onPress={() => handlePickDifficulty(player.id)}`
  - Displays `difficultyLabel`
- Added `gap: 4` to `packChipRow` StyleSheet entry

### Task 2: Difficulty label in turn.tsx progress strip

**apps/mobile/app/game/turn.tsx** (13 additions):
- Destructured `playerDifficulties` from `useGameStore` alongside existing fields
- Added `difficultyLabel` computation in progress strip map (after `displayPackName`):
  - `playerDifficulties?.[idx] != null ? capitalize(...) : null`
  - Null → renders nothing; non-null → renders label text
- Added `{difficultyLabel && <Text style={styles.progressDifficulty}>...</Text>}` between `displayPackName &&` block and `progressCount` Text
- Added `progressDifficulty` style after `progressPack`: `{ color: '#888', fontSize: 11, marginRight: 4 }`

## Test Results

| Test File | Tests Before | Tests After | Status |
|-----------|-------------|-------------|--------|
| playerStore.test.ts | 46 | 46 | All pass |
| gameStore.test.ts | 48 | 48 | All pass |
| questionStore.test.ts | 20 | 20 | All pass |
| packStore.test.ts | 106 | 106 | All pass |
| **Total** | **220** | **220** | **All pass** |

(UI files setup.tsx and turn.tsx have no test files; verification is by TypeScript clean compile + code inspection.)

## TypeScript

`cd apps/mobile && npx tsc --noEmit` — no errors in `app/game/setup.tsx` or `app/game/turn.tsx`.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| e730d61 | feat | add difficulty chip to packChipRow in setup.tsx |
| 8eabf57 | feat | add difficulty label to turn screen progress strip |

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed the exact patterns and JSX structure specified in the `<interfaces>` and `<action>` sections of the plan. No new styles were created; no new files were created; no structural changes were required.

## Known Stubs

None. The difficulty chip in setup.tsx calls `updatePlayerDifficulty` which was wired end-to-end in plan 17-01. The difficulty label in turn.tsx reads from `playerDifficulties` which is snapshotted from player preferences in `startGame()`. All data flows are live.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. The Alert.alert picker in setup.tsx uses hardcoded buttons (T-17-04: accept). The progress strip label is display-only derived text (T-17-05: accept). Difficulty preference is visible to all players on shared device — intentional in-person group play (T-17-06: accept).

## Self-Check: PASSED

- [x] `apps/mobile/app/game/setup.tsx` — `handlePickDifficulty`, `updatePlayerDifficulty`, `Select Difficulty`, `Any Difficulty`, `difficultyLabel`, `difficultyPreference`, `gap: 4` all present
- [x] `apps/mobile/app/game/turn.tsx` — `playerDifficulties`, `difficultyLabel`, `progressDifficulty`, `!= null` all present
- [x] Difficulty chip Pressable is INSIDE the existing `packChipRow` View alongside the pack chip (verified in file)
- [x] No new chip style keys added (verified `progressDifficulty` is in turn.tsx only, not setup.tsx)
- [x] All 220 tests pass
- [x] Commits e730d61, 8eabf57 exist in git log
