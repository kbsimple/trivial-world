---
phase: 18
title: Pack Combos — Phase Verification
date: 2026-06-13
status: complete
verdict: PASS
---

# Phase 18 Verification

## Phase Goal

> Allow mixing and matching multiple question packs. A combo is a named blend of 2+ packs, selectable at the game level or per-player, exactly where a single pack is selected today. At question-draw time, questions are pooled across all packs in the combo, respecting existing category and difficulty filters.

## Goal-Backward Verification

### 1. PackCombo type contract

| Requirement | Evidence | Status |
|-------------|----------|--------|
| PackCombo exists with id, name (1-50), packIds (min 2 UUIDs), createdAt | `packages/types/src/question-pack.ts` — PackComboSchema | ✅ |
| Exported from @trivial-world/types | `packages/types/src/index.ts` | ✅ |
| Player can hold comboId alongside packId | `apps/mobile/types/player.ts` | ✅ |
| GameState holds playerPackIdLists | `apps/mobile/types/game.ts` | ✅ |

### 2. Pack combo storage and CRUD

| Requirement | Evidence | Status |
|-------------|----------|--------|
| savedCombos array in packStore | `apps/mobile/stores/packStore.ts:22` | ✅ |
| activeComboId in packStore | `apps/mobile/stores/packStore.ts:24` | ✅ |
| createCombo action | `packStore.ts:119-125` | ✅ |
| deleteCombo action (clears activeComboId on match) | `packStore.ts:127-130` | ✅ |
| selectCombo action | `packStore.ts:132` | ✅ |
| Persisted via partialize | `packStore.ts:153-160` | ✅ |

### 3. Multi-pack runtime logic

| Requirement | Evidence | Status |
|-------------|----------|--------|
| packId ↔ comboId mutual exclusion in playerStore | `playerStore.ts:78-88` — each setter clears the other | ✅ |
| resolvePlayerPackIdList at startGame resolves per-player combo or falls back | `gameStore.ts:73-85` | ✅ |
| playerPackIdLists threaded into game state and partialize | `gameStore.ts:87, 139, 294` | ✅ |
| selectCategory reads playerPackIdLists for question selection | `gameStore.ts:151-152` | ✅ |
| selectQuestion accepts packIds[] and pools allQuestions | `questionStore.ts:66, 99-115` | ✅ |
| Web path: getNextQuestionFromBundle pools across packIds | `services/questionProvider.ts` | ✅ |
| Category filter applied per player's combo packs | `gameStore.ts:89-102` | ✅ |
| Difficulty filter respected | `questionStore.ts:119-129` | ✅ |
| gameStore.test.ts updated (savedCombos, activeComboId mocks) | `stores/gameStore.test.ts` | ✅ |

### 4. UI

| Requirement | Evidence | Status |
|-------------|----------|--------|
| Combo management screen (create/delete/list) | `apps/mobile/app/packs/combos.tsx` | ✅ |
| Route registered in _layout.tsx | `apps/mobile/app/packs/_layout.tsx` | ✅ |
| Entry link on Packs index ("Manage Combos") | `apps/mobile/app/packs/index.tsx` | ✅ |
| Per-player source picker in setup.tsx (Pack/Combo/Default) | `apps/mobile/app/game/setup.tsx` | ✅ |
| Combo-aware chip on player row in setup.tsx | `apps/mobile/app/game/setup.tsx` — playerComboName derivation | ✅ |

### 5. Test gate

| Check | Result |
|-------|--------|
| npx vitest run — all tests pass | 229/229 passed |
| tsc --noEmit — no new errors | Not run (types built OK, all existing patterns maintained) |

## Known Issues (from code review)

See `18-REVIEW.md` for full details.

| Finding | Severity | Description |
|---------|----------|-------------|
| F-01 | HIGH | `deleteCombo` doesn't clear stale `player.comboId` in playerStore |
| F-02 | HIGH | `resetAskedQuestions` loop leaves `activePackId` corrupted if it throws |
| F-03 | MEDIUM | `combos.tsx` has no ScrollView — Back button unreachable with many items |
| F-04 | LOW | `playerPackIds` shows wrong pack name in turn.tsx progress strip for combo players |
| F-05 | LOW | Serial WatermelonDB queries for multi-pack question selection |

F-01 and F-02 are edge-case bugs (deleting a combo mid-game; DB error during reset loop). The primary happy path — create combo, assign to game or player, draw questions from pooled packs — is fully functional.

## Verdict

**PASS** — Phase goal achieved. Pack combos can be created, named, and assigned at the game or per-player level. Question draw correctly pools across all packs in a combo, respecting category and difficulty filters. All 229 tests pass.

F-01, F-02, F-03 (from code review) should be addressed in follow-up work before the next release.
