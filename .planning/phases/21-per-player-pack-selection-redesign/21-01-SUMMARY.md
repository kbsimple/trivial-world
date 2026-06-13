---
phase: 21-per-player-pack-selection-redesign
plan: "01"
subsystem: setup-ui
tags: [navigation, player-row, chip-toggle, cleanup]
dependency_graph:
  requires: []
  provides: [setup-tsx-single-chip-per-player, handleCustomPack, handleRevertToShared]
  affects: [apps/mobile/app/game/setup.tsx]
tech_stack:
  added: []
  patterns: [expo-router-push-with-params, zustand-reactive-return, pressable-conditional-style]
key_files:
  created: []
  modified:
    - apps/mobile/app/game/setup.tsx
decisions:
  - "Use router.push (not replace) so router.back() in /packs reliably returns to setup"
  - "Revert to Shared calls BOTH updatePlayerPack(id, null) AND updatePlayerCombo(id, null) — updatePlayerPack alone does not clear comboId"
  - "Difficulty chip removed entirely (Decision A1) — no dedicated difficulty screen in this phase"
  - "Ellipsis character (…) used for truncation per UI-SPEC, not '...'"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-13"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 21 Plan 01: Remove Inline Pickers, Add Shared/Custom Toggle Chip Summary

Single-chip Shared/Custom toggle per player replaces the two-chip pack+difficulty row, with navigation to /packs for pack selection and immediate revert on Custom tap.

## What Was Built

Refactored `apps/mobile/app/game/setup.tsx` to replace the two-chip player row (pack chip + difficulty chip) with a single Shared/Custom toggle chip per player. All inline Alert/Modal picker infrastructure was removed.

### Changes Made

**Imports cleaned:**
- Removed: `Platform`, `Modal`, `TouchableWithoutFeedback`
- Kept: `Alert` (still used in `handleStartGame` for CONF-01, no-players, and error dialogs)

**Store destructure cleaned:**
- Removed: `updatePlayerDifficulty` (difficulty chip removed)

**State removed:**
- `webPicker` useState block (powered the now-removed web Modal picker)

**Handlers removed:**
- `handlePickSource` (lines 100-129) — inline Alert/Modal pack picker
- `handlePickDifficulty` (lines 131-147) — inline Alert/Modal difficulty picker

**Handlers added:**
- `handleCustomPack(playerId)` — `router.push({ pathname: '/packs', params: { targetPlayerId: playerId } })`
- `handleRevertToShared(playerId)` — calls `updatePlayerPack(playerId, null)` then `updatePlayerCombo(playerId, null)`

**Player row chip logic replaced:**
- Old: `chipLabel` ("Default" or truncated name) + `difficultyLabel` (difficulty string)
- New: `isCustom` (boolean), `chipLabel` ("Shared" or "Custom: [truncated name ≤12 chars with …]")

**Row 2 JSX replaced:**
- Old: two Pressable chips (pack + difficulty)
- New: single Pressable chip with conditional style (`packChipDefault` when Shared, `packChipActive` when Custom)

**Modal JSX removed:**
- `{Platform.OS === 'web' && webPicker && (<Modal ...>...</Modal>)}` block deleted

**StyleSheet cleaned:**
- Removed 7 keys: `webPickerBackdrop`, `webPickerCard`, `webPickerTitle`, `webPickerDivider`, `webPickerItem`, `webPickerItemPressed`, `webPickerItemText`
- Kept all chip styles: `packChipRow`, `packChip`, `packChipDefault`, `packChipActive`, `packChipText`

**Unchanged:**
- `allPlayersCustom` computation
- `handleStartGame` (Alert retained for CONF-01 guard and error cases)
- `packInfo` display section
- Start Game button logic and disable conditions

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove inline picker infrastructure from setup.tsx | 8af4dd3 | apps/mobile/app/game/setup.tsx |

## Verification

All acceptance criteria met:

- `grep "handlePickSource" setup.tsx` → no output
- `grep "handlePickDifficulty" setup.tsx` → no output
- `grep "webPicker" setup.tsx` → no output
- `grep "Modal" setup.tsx` → no output
- `grep "TouchableWithoutFeedback" setup.tsx` → no output
- `grep "Platform" setup.tsx` → no output
- `grep "difficultyLabel" setup.tsx` → no output
- `grep "updatePlayerDifficulty" setup.tsx` → no output
- `grep "handleCustomPack" setup.tsx` → match found (line 95)
- `grep "handleRevertToShared" setup.tsx` → match found (line 99)
- `grep "targetPlayerId" setup.tsx` → match found (line 96)
- `grep "isCustom" setup.tsx` → match found (lines 179, 180, 216, 218)
- `grep "Shared" setup.tsx` → match found (lines 160, 184, 211)
- `grep "allPlayersCustom" setup.tsx` → match found (lines 36, 106, 158, 252, 255, 259, 270)
- `grep "Alert" setup.tsx` → match found (retained in handleStartGame)
- Line count: 404 lines (above 280 minimum)
- No new TypeScript errors introduced (pre-existing env errors unrelated to this file)
- 25 tests pass; 8 test files fail due to pre-existing WatermelonDB/module mock infrastructure issues (not related to this change)

## Deviations from Plan

None — plan executed exactly as written. All 10 action steps applied atomically:
1. Fixed imports (removed Platform, Modal, TouchableWithoutFeedback)
2. Removed updatePlayerDifficulty from store destructure
3. Removed webPicker state
4. Added handleCustomPack + handleRevertToShared handlers
5. Removed handlePickSource
6. Removed handlePickDifficulty
7. Replaced per-player derived values (chipLabel/difficultyLabel → isCustom/chipLabel)
8. Replaced Row 2 JSX with single toggle chip
9. Removed web picker Modal JSX block
10. Removed 7 web picker StyleSheet keys

## Known Stubs

None. The chip toggle is fully wired: "Shared" navigates to /packs (Plan 02 implements per-player mode there); "Custom: [name]" immediately reverts. The label computation reads live from `playerStore` and `packStore`.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `targetPlayerId` URL param (T-21-01) passes client-side player ID only — accepted per threat model.

## Self-Check: PASSED

- File exists: apps/mobile/app/game/setup.tsx — FOUND (404 lines)
- Commit exists: 8af4dd3 — FOUND
- All acceptance criteria verified via grep
