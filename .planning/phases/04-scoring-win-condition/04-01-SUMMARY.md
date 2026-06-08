---
phase: 04-scoring-win-condition
plan: 01
subsystem: scoring
tags: [types, stores, wedges, win-condition]
dependencies:
  requires: [03-02]
  provides: [wedge-tracking, win-detection]
  affects: [playerStore, gameStore, Player, GameState]
tech_stack:
  added: []
  patterns: [Zustand state management, immutable array updates]
key_files:
  created: []
  modified:
    - types/player.ts
    - stores/playerStore.ts
    - types/game.ts
    - stores/gameStore.ts
decisions:
  - Wedge tracking uses PlayerColor array (same type as category)
  - hasAllWedges checks for exactly 6 wedges (one per category)
  - Win condition: correct center answer + all 6 wedges
  - Wedges only awarded on non-center correct answers
metrics:
  duration_minutes: 4
  completed_date: "2026-06-08T15:12:16Z"
  tasks_completed: 4
  files_modified: 4
---

# Phase 4 Plan 01: Scoring State Infrastructure Summary

Extended Player type with wedge tracking and added win condition detection to GameStore, enabling the app to track each player's wedge collection and determine when a player wins the game.

## What Was Built

### Player Type Extensions (types/player.ts)
- Added `wedges: PlayerColor[]` to Player interface for tracking earned wedges
- Added four scoring actions to PlayerState interface:
  - `awardWedge(playerId, category)` - awards wedge on correct answer
  - `getWedgeCount(playerId)` - returns count of wedges
  - `hasAllWedges(playerId)` - returns true when player has 6 wedges
  - `resetWedges()` - clears all wedges for new game

### PlayerStore Wedge Management (stores/playerStore.ts)
- Implemented `awardWedge` with validation:
  - Checks player exists
  - Prevents duplicate wedges (same category)
  - Enforces 6-wedge maximum limit
- Implemented `getWedgeCount` as selector (no state mutation)
- Implemented `hasAllWedges` returns true only at 6 wedges
- Implemented `resetWedges` clears all player wedges
- Updated `addPlayer` to initialize empty wedges array

### GameState Extensions (types/game.ts)
- Added `isCenterQuestion: boolean` to track win attempts
- Added `winner: Player | null` to store winning player
- VALID_TRANSITIONS already allows `scoring -> finished` (correct from Phase 2)

### GameStore Win Detection (stores/gameStore.ts)
- Added `isCenterQuestion` and `winner` to initial state
- Updated `markAnswer`:
  - Awards wedge when `correct && !isCenterQuestion`
  - Checks win condition: correct center answer + all 6 wedges
  - Sets `winner` and transitions to `finished` on win
- Updated `startGame`:
  - Resets `isCenterQuestion` and `winner`
  - Calls `resetWedges()` for new game
- Updated `nextTurn`:
  - Resets `isCenterQuestion` flag
- Added `startCenterQuestion` helper for future board integration

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Covered

- **SCOR-01**: Player wedge tracking (PlayerStore with wedges array)
- **SCOR-02**: Wedge awarding on correct answers (markAward logic)
- **SCOR-03**: Win condition detection (all wedges + center correct)

## Commits

| Hash | Message |
|------|---------|
| 64e37b6 | feat(04-01): extend Player type with wedges array and scoring actions |
| 6b7488d | feat(04-01): implement wedge management actions in PlayerStore |
| 3ca7541 | feat(04-01): extend GameState with winner and center question tracking |
| 8303321 | feat(04-01): implement win condition detection in GameStore |

## Self-Check: PASSED

- All files created/modified exist
- All commits present in git log
- TypeScript compilation passes (exit 0)
- No test suite (no tests exist yet)

## Must-Haves Verified

- [x] Player wedge tracking via wedges array
- [x] awardWedge validates duplicates and 6-wedge limit
- [x] getWedgeCount returns correct count
- [x] hasAllWedges returns true only with 6 wedges
- [x] resetWedges clears all player wedges
- [x] GameState has isCenterQuestion and winner fields
- [x] markAnswer awards wedge on correct non-center answer
- [x] markAnswer detects win (6 wedges + center correct)
- [x] Game transitions to 'finished' on win
- [x] Winner stored in game state on win