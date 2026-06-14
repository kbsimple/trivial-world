---
phase: 22-undo-last-answer
plan: 01
subsystem: ui
tags: [zustand, react-native, expo-router, undo, snapshot]

requires:
  - phase: 21-per-player-pack-selection-redesign
    provides: turn screen and question screen foundation used by undo flow

provides:
  - lastMarkSnapshot field in gameStore with 8-field pre-mark state capture
  - undoLastMark() action restoring all 8 fields and clearing snapshot
  - unmarkAsked() in questionStore with mobile WatermelonDB and web array branches
  - '↩ Undo last mark' Pressable on turn screen, visible only when snapshot exists
  - handleUndo navigates to /game/question restoring answerRevealed: true from snapshot

affects: [turn-screen, question-screen, gameStore, questionStore]

tech-stack:
  added: []
  patterns: [pre-mutation snapshot pattern for single-level undo, dual-branch mobile/web store actions]

key-files:
  created: []
  modified:
    - apps/mobile/stores/gameStore.ts
    - apps/mobile/stores/questionStore.ts
    - apps/mobile/app/game/turn.tsx
    - apps/mobile/stores/gameStore.test.ts
    - apps/mobile/stores/questionStore.test.ts

key-decisions:
  - "Snapshot captured as first set() in markAnswer() before any mutation or markAsked() call"
  - "lastMarkSnapshot excluded from partialize — in-session only, no persistence across restarts"
  - "selectCategory() clears snapshot at entry — undo window expires when new question is selected"
  - "unmarkAsked() mobile branch queries by question_id and sets askedAt = null via database.write()"

patterns-established:
  - "Pre-mutation snapshot: set({ lastMarkSnapshot: { ...get() fields } }) before any mutation in markAnswer()"
  - "Dual-branch store action: Platform.OS === 'web' ? in-memory array update : WatermelonDB write"

requirements-completed:
  - UNDO-01
  - UNDO-02
  - UNDO-03
  - UNDO-04
  - UNDO-05
  - UNDO-06
  - UNDO-07

duration: 15min
completed: 2026-06-13
---

# Phase 22: Undo Last Answer Summary

**Single-level undo via pre-mutation snapshot in gameStore, with unmarkAsked() in questionStore and a subtle '↩ Undo last mark' link at the bottom of the turn screen**

## Performance

- **Duration:** 15 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- gameStore captures all 8 pre-mark fields as `lastMarkSnapshot` synchronously before `markAnswer()` mutates; `undoLastMark()` restores them and calls `unmarkAsked()`
- questionStore gains `unmarkAsked()` with web (array filter) and mobile (WatermelonDB `askedAt = null`) branches, mirroring the existing `markAsked()` dual-branch pattern
- turn.tsx renders `↩ Undo last mark` Pressable below progress strip only when `lastMarkSnapshot !== null`; tapping calls `undoLastMark()` then navigates to `/game/question` (which restores `answerRevealed: true` from snapshot)
- 14 new tests; 302 total passing

## Task Commits

1. **Task 1: Store changes + tests** - `5a3a74a` (feat: all store + test changes in one commit)
2. **Task 2: turn.tsx Undo affordance** - included in same commit

## Files Created/Modified
- `apps/mobile/stores/gameStore.ts` — MarkSnapshot interface, lastMarkSnapshot field, undoLastMark(), snapshot in markAnswer(), clear in selectCategory()/resetGame()
- `apps/mobile/stores/questionStore.ts` — unmarkAsked() with web/mobile branches
- `apps/mobile/app/game/turn.tsx` — lastMarkSnapshot/undoLastMark destructure, handleUndo, Pressable affordance, undoLink/undoLinkText styles
- `apps/mobile/stores/gameStore.test.ts` — unmarkAsked in mock, lastMarkSnapshot in reset, snapshot/undoLastMark/selectCategory-clear test blocks
- `apps/mobile/stores/questionStore.test.ts` — unmarkAsked describe block (4 tests, mobile database path)

## Decisions Made
- Test environment has `Platform.OS = 'ios'`, so `unmarkAsked` tests verify the mobile (WatermelonDB) branch by capturing the `update` callback
- Platform mock is in `__mocks__/react-native.ts` with `OS: 'ios'` — existing pattern

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
- Test for `unmarkAsked` initially assumed `Platform.OS === 'web'` in test environment; the mock sets `OS: 'ios'`, so tests were rewritten to verify the mobile database branch (capturing the update callback to assert `askedAt = null`)

## Next Phase Readiness
- Phase 22 complete; v10.0 Undo Last Answer milestone ready to close
- No blockers

---
*Phase: 22-undo-last-answer*
*Completed: 2026-06-13*
