---
phase: 21-per-player-pack-selection-redesign
status: complete
completed: 2026-06-13
plans_completed: 2
tests_passing: 288
---

# Phase 21 — Per-Player Pack Selection Redesign — Summary

## Goal

Replace the two-chip player row (pack chip + difficulty chip) in setup.tsx with a single Shared/Custom toggle chip. Add per-player mode to packs/index.tsx via a `targetPlayerId` URL param. Remove all inline Alert/Modal picker infrastructure.

## What Changed

### Plan 01 — setup.tsx refactor

- Removed: `Platform`, `Modal`, `TouchableWithoutFeedback` imports; `webPicker` state; `handlePickSource`; `handlePickDifficulty`; difficulty chip JSX; web picker Modal JSX; 7 web picker StyleSheet keys
- Added: `handleCustomPack` (navigates to /packs with targetPlayerId) and `handleRevertToShared` (clears packId, comboId, and difficultyPreference)
- Each player row now renders a single Shared/Custom chip: `packChipDefault` when no custom pack, `packChipActive` when pack or combo is selected
- `allPlayersCustom` logic, `packInfo` display, and Start Game button logic unchanged

### Plan 02 — packs/index.tsx per-player mode

- Added `useLocalSearchParams` to read `targetPlayerId` param
- Title shows `"Select Pack for [player.name]"` when targetPlayerId is set
- Pack tap in per-player mode calls `updatePlayerPack(targetPlayerId, packId)` then `router.back()`
- Saved Combos section rendered below pack list when `targetPlayerId && savedCombos.length > 0`
- Footer: Back button only in per-player mode; multi-pack footer unchanged otherwise

### Code Review Fix (R-21-01)

- `handleRevertToShared` now also calls `updatePlayerDifficulty(playerId, null)` to clear persisted difficultyPreference that had no other UI reset path after difficulty chip removal

## Key Decisions

- **A1**: Difficulty chip removed entirely (not replaced) — per-player difficulty via a dedicated screen is deferred
- **A2**: Saved combos rendered inline in /packs per-player mode (no navigation to /combos needed)
- **A3**: Multi-pack footer hidden in per-player mode — single pack/combo selection only

## Test Results

288/288 tests passing. TypeScript: 0 errors.

## Deferred

- R-21-03: Empty player name shows "Select Pack for " — low priority, deferred
- R-21-04: Post-download no auto-select in per-player mode — consistent with game-level behavior, deferred
