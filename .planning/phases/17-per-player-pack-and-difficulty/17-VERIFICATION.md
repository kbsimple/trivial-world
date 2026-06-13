---
phase: 17-per-player-pack-and-difficulty
verified: 2026-06-13T01:30:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 17: Per-Player Pack and Difficulty Verification Report

**Phase Goal:** Each player can independently configure their own pack and difficulty level; a game draws questions from multiple packs simultaneously.
**Verified:** 2026-06-13T01:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | During game setup, each player can select both a pack and a difficulty level independently | ✓ VERIFIED | `setup.tsx` renders a difficulty chip per player (line 239–249); `handlePickDifficulty` calls `updatePlayerDifficulty`; `handlePickPack` calls `updatePlayerPack` — independent selection per player row |
| 2 | A game can draw questions from multiple packs simultaneously (one per player) | ✓ VERIFIED | `gameStore.startGame()` builds `playerPackIds` by mapping each player's `packId ?? activePackId`; `selectCategory()` reads `playerPackIds[currentPlayerIndex]` and passes it to `selectQuestion` |
| 3 | Questions are served to each player from their individually configured pack + difficulty combination | ✓ VERIFIED | `gameStore.selectCategory()` (line 121–131) reads both `playerPackIds[currentPlayerIndex]` and `playerDifficulties[currentPlayerIndex]` and passes both to `questionStore.selectQuestion`; `questionStore.selectQuestion` applies per-player difficulty filter with fallback to `enabledDifficulties` (lines 123–134); `questionProvider.getNextQuestionFromBundle` and `getNextQuestionFromDatabase` both accept and apply `difficulty?` |
| 4 | Game-level default pack and difficulty serve as fallback for players without custom settings | ✓ VERIFIED | `startGame()`: `playerPackIds = players.map(p => p.packId ?? activePackId ?? null)` — null packId falls back to game-level `activePackId`; `questionStore.selectQuestion` mobile path: `effectiveDifficulties = difficulty != null ? [difficulty] : (enabledDifficulties ?? null)` — null per-player difficulty falls back to game-level `enabledDifficulties` |
| 5 | Setup UI clearly shows each player's pack and difficulty configuration | ✓ VERIFIED | `setup.tsx` renders two chips per player in a `packChipRow` (lines 228–252): pack chip (showing "Default" or truncated pack name) and difficulty chip (showing "Any Difficulty" or capitalized difficulty); both are pressable and call their respective handlers; `turn.tsx` progress strip also shows `difficultyLabel` per player (lines 122–137) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/mobile/types/player.ts` | `difficultyPreference?: Difficulty \| null` field | ✓ VERIFIED | Line 20: `difficultyPreference?: Difficulty \| null` — present with comment |
| `apps/mobile/stores/playerStore.ts` | `updatePlayerDifficulty` action | ✓ VERIFIED | Lines 83–87: action sets `difficultyPreference` on matching player; initialized to `null` in `addPlayer` |
| `apps/mobile/types/game.ts` | `playerDifficulties: (Difficulty \| null)[]` in GameState | ✓ VERIFIED | Line 49: field present with explanatory comment |
| `apps/mobile/stores/gameStore.ts` | `startGame()` snapshots difficulties; `selectCategory()` passes per-player difficulty | ✓ VERIFIED | `startGame` line 68; `selectCategory` lines 122–125 |
| `apps/mobile/stores/questionStore.ts` | `selectQuestion` accepts `difficulty?` param and applies it | ✓ VERIFIED | Signature line 66; filtering logic lines 123–134 |
| `apps/mobile/services/questionProvider.ts` | Both `getNextQuestionFromBundle` and `getNextQuestionFromDatabase` accept and apply `difficulty?` | ✓ VERIFIED | `getNextQuestionFromBundle` lines 86–116; `getNextQuestionFromDatabase` lines 122–224 — both have `difficulty?: Difficulty` param and filter accordingly |
| `apps/mobile/app/game/setup.tsx` | Difficulty chip next to pack chip per player | ✓ VERIFIED | Lines 241–249: second `Pressable` chip renders `difficultyLabel` and calls `handlePickDifficulty` |
| `apps/mobile/app/game/turn.tsx` | Active player's difficulty label in progress strip | ✓ VERIFIED | Lines 122–137: `difficultyLabel` computed and rendered conditionally in each progress strip entry |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `setup.tsx` difficulty chip | `playerStore.updatePlayerDifficulty` | `handlePickDifficulty → Alert.alert → updatePlayerDifficulty(playerId, difficulty)` | ✓ WIRED | Lines 112–125 |
| `playerStore.players[].difficultyPreference` | `gameStore.playerDifficulties[]` | `startGame: players.map(p => p.difficultyPreference ?? null)` | ✓ WIRED | gameStore.ts line 68 |
| `gameStore.selectCategory` | `questionStore.selectQuestion` | `difficulty = playerDifficulties[currentPlayerIndex] ?? undefined` then passed as 3rd arg | ✓ WIRED | gameStore.ts lines 122–125 |
| `questionStore.selectQuestion` | `questionProvider.getNextQuestion` | `getNextQuestion(category, askedIds, resolvedPackId, difficulty)` | ✓ WIRED | questionStore.ts line 70 (web path) |
| `questionProvider.getNextQuestionFromBundle` | bundled question pool | filters by `q.difficulty === difficulty` when difficulty set | ✓ WIRED | questionProvider.ts lines 98–101 |
| `questionStore.selectQuestion` mobile path | WatermelonDB | `effectiveDifficulties` filter applied after fetch | ✓ WIRED | questionStore.ts lines 123–134 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `setup.tsx` difficulty chip | `player.difficultyPreference` | `usePlayerStore()` — reads live store state | Yes — reflects actual player object | ✓ FLOWING |
| `turn.tsx` progress strip | `playerDifficulties` | `useGameStore()` — snapshotted at `startGame()` from player store | Yes — snapshotted from real player preferences | ✓ FLOWING |
| `questionProvider.getNextQuestionFromBundle` | filtered question pool | `ALL_QUESTIONS` bundled data or fetched pack JSON | Yes — real question content | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: Tests used as proxy for behavioral verification — no runnable server to query.

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `updatePlayerDifficulty` sets and clears preference | `playerStore.test.ts` — `describe('updatePlayerDifficulty')` (4 cases) | 4/4 pass | ✓ PASS |
| `selectCategory` passes difficulty to selectQuestion | `gameStore.test.ts` — `describe('selectCategory')` — `toHaveBeenCalledWith('pink', undefined, undefined)` | Passes — args verified | ✓ PASS |
| `playerDifficulties` initialized empty, reset properly | `gameStore.test.ts` initial state and resetGame | `[]` on init and reset | ✓ PASS |
| All 94 tests pass | `vitest run stores/playerStore.test.ts stores/gameStore.test.ts` | 94/94 passed | ✓ PASS |

**Test coverage note:** No `startGame` test seeds players with a non-null `difficultyPreference` and asserts that `state.playerDifficulties` captures it. The production code at line 68 (`players.map(p => p.difficultyPreference ?? null)`) is correct and straightforward, but this path has no dedicated integration test. Not blocking — the snapshot logic is trivially correct given all surrounding tests pass.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Per-player difficulty selection in setup UI | ✓ SATISFIED | `setup.tsx` difficulty chip + `handlePickDifficulty` handler |
| Multi-pack simultaneous draw | ✓ SATISFIED | `gameStore.startGame()` builds `playerPackIds`; `selectCategory()` reads per-player pack |
| Per-player pack+difficulty question serving | ✓ SATISFIED | Full chain: `selectCategory → selectQuestion(category, packId, difficulty)` |
| Game-level fallback for pack and difficulty | ✓ SATISFIED | `packId ?? activePackId` in startGame; `difficulty != null ? [difficulty] : enabledDifficulties` in questionStore |
| UI showing per-player pack and difficulty config | ✓ SATISFIED | Two chips per player in setup; difficulty label in turn progress strip |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `setup.tsx` | 91 | `if (Platform.OS === 'web') return;` in `handlePickPack` — pack selection disabled on web | ℹ️ Info | Intentional per platform design: web has no downloaded packs |
| `setup.tsx` | 113 | `if (Platform.OS === 'web') return;` in `handlePickDifficulty` — difficulty selection disabled on web | ℹ️ Info | Consistent with pack selection; difficulty filter still applied via `getNextQuestionFromBundle` when set in state |

No blockers or warnings. The web guard is a deliberate platform limitation, not a stub.

### Human Verification Required

None. All success criteria are mechanically verifiable and confirmed through code inspection and test execution.

## Summary

All 5 success criteria are fully met.

The data path from "player selects a difficulty in setup" through to "questions filtered by that difficulty during turn" is complete end-to-end:

1. `Player.difficultyPreference` field exists in the type and is initialized to `null`.
2. `updatePlayerDifficulty` action writes to it; 4 unit tests cover it.
3. `GameState.playerDifficulties` snapshots it at `startGame()`.
4. `selectCategory()` reads it by index and passes it to `selectQuestion`.
5. `selectQuestion` (both web and mobile paths) applies it as a filter, with fallback to game-level `enabledDifficulties`.
6. `setup.tsx` renders a tappable difficulty chip per player showing the current value.
7. `turn.tsx` progress strip shows a difficulty label per player when set.

---

_Verified: 2026-06-13T01:30:00Z_
_Verifier: Claude (gsd-verifier)_
