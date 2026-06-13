---
phase: 15-per-player-pack-selection
fixed_at: 2026-06-12T22:46:30Z
review_path: .planning/phases/15-per-player-pack-selection/15-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-06-12T22:46:30Z
**Source review:** .planning/phases/15-per-player-pack-selection/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Router navigates before async `startGame` resolves

**Files modified:** `apps/mobile/app/game/setup.tsx`
**Commit:** 697b4b8
**Applied fix:** Changed `handleStartGame` to `async`, added `await startGame()`, then conditionally navigates to `/game/turn` only when `useGameStore.getState().phase === 'selecting'`. If the phase is still `'setup'` (indicating `startGame` failed internally), an error alert is shown instead.

### WR-02: Web path in `questionStore.resetAskedQuestions` ignores per-player packs

**Files modified:** `apps/mobile/stores/questionStore.ts`
**Commit:** 32dd6ba
**Applied fix:** Added a detailed comment in the web branch of `resetAskedQuestions` documenting that the single flat `askedQuestionIds` array shared across all packs is an accepted limitation. Web always uses the bundled question pool (no downloaded packs), so per-player `packId` assignments have no effect on web and the flat reset is correct behaviour for the single shared pool.

### WR-03: Web path in `selectQuestion` ignores `packId` argument

**Files modified:** `apps/mobile/stores/questionStore.ts`
**Commit:** ad4be55
**Applied fix:** Added a comment to the web branch of `selectQuestion` clarifying that ignoring the `packId` argument is intentional per the web platform design decision. Web uses the single bundled question pool and the per-player pack chip is already hidden on web (guarded by `Platform.OS !== 'web'` in setup.tsx), making this consistent with the overall design.

### WR-04: Stale read of `playerCategories` inside `markAnswer`

**Files modified:** `apps/mobile/stores/gameStore.ts`
**Commit:** aade03d
**Applied fix:** Added `playerCategories` to the destructure from the single `get()` call at the top of `markAnswer`, and removed the separate `const { playerCategories } = get()` call that had been made mid-function before the championship check. All state is now read from one snapshot, following the conventional Zustand single-snapshot pattern.

---

_Fixed: 2026-06-12T22:46:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
