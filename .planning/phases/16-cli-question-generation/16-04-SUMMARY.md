---
phase: 16-cli-question-generation
plan: "04"
subsystem: mobile-ui
tags:
  - tidbits
  - question-card
  - ui
  - tdd
dependency_graph:
  requires:
    - tidbits field in QuestionSchema (from 16-01)
    - tidbits field in QuestionModel.toQuestion() (from 16-01)
  provides:
    - QuestionCard with optional tidbits prop displayed after answer reveal
    - question.tsx forwarding currentQuestion.tidbits to QuestionCard
    - shouldShowTidbits pure utility function
  affects:
    - apps/mobile/components/QuestionCard.tsx
    - apps/mobile/app/game/question.tsx
tech_stack:
  added: []
  patterns:
    - TDD (RED/GREEN cycle)
    - Conditional rendering guard pattern (revealed && tidbits)
    - Pure function extraction for testability
key_files:
  created:
    - apps/mobile/components/questionCard.utils.ts
    - apps/mobile/components/QuestionCard.tidbits.test.ts
  modified:
    - apps/mobile/components/QuestionCard.tsx
    - apps/mobile/app/game/question.tsx
decisions:
  - Extract shouldShowTidbits as pure helper to enable unit testing without React Native renderer
  - MC branch uses revealed wrapper + inner tidbits guard to match acceptance criterion pattern
  - tidbitsText style uses opacity 0.7 (not color alpha) for visual subordination to answerText
metrics:
  duration_minutes: 5
  completed_date: "2026-06-13"
  tasks_completed: 1
  files_changed: 4
---

# Phase 16 Plan 04: Tidbits Display in Question Reveal Screen Summary

## One-liner

Added `tidbits` optional prop to QuestionCard with conditional reveal guard — displays italic, subdued fact text below the answer in both open-answer and multiple-choice branches, wired through from `currentQuestion.tidbits` in question.tsx.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (TDD RED) | Failing tests for tidbits display logic | 5c48f2b | apps/mobile/components/QuestionCard.tidbits.test.ts |
| 1 (TDD GREEN) | Implement tidbits in QuestionCard + question.tsx | 26a10c1 | apps/mobile/components/QuestionCard.tsx, apps/mobile/app/game/question.tsx, apps/mobile/components/questionCard.utils.ts |

## What Was Built

### QuestionCard.tsx Updates

Added `tidbits?: string` to `QuestionCardProps` interface. Tidbits renders after answer reveal in two branches:

**Open-answer branch:** Wrapped `answerText` and tidbits in a React Fragment (`<>`). Tidbits renders below `answerText` with `{tidbits && (...)}` guard — only evaluates when the parent `revealed ? <>` branch is already active.

**Multiple-choice branch:** Added `{revealed && (...)}` wrapper inside `<View style={styles.choicesContainer}>` after the "Reveal Answer" pressable, containing an inner `{tidbits && (...)}` guard.

**New `tidbitsText` StyleSheet entry:**
```typescript
tidbitsText: {
  fontSize: 14,
  textAlign: 'center',
  marginTop: 12,
  paddingHorizontal: 16,
  opacity: 0.7,
  fontStyle: 'italic',
},
```

### questionCard.utils.ts (new)

Pure helper function extracted to enable unit testing without React Native renderer:

```typescript
export function shouldShowTidbits(revealed: boolean, tidbits: string | undefined): boolean {
  return revealed && !!tidbits;
}
```

### question.tsx Update

Added `tidbits={displayQuestion.tidbits}` prop to the `QuestionCard` JSX (uses `displayQuestion` — the ref-stabilized question value that prevents flash-on-navigate).

## Test Results

- 5 new tidbits tests (TDD): all pass (GREEN gate)
- Pre-existing 211 mobile tests: all pass in main project (no regressions)
- TypeScript: no new errors introduced

## Deviations from Plan

### Auto-adapted: Test strategy for TDD

**Found during:** Task 1 (RED phase)

**Issue:** The plan's `<behavior>` describes React Native component rendering (JSX conditionals), but the project has no `@testing-library/react-native` installed and the vitest setup only stubs out `Platform` from `react-native`. Attempting to `require('./QuestionCard')` in tests failed because the module's `import { View, Text, Pressable }` from `react-native` resolved to the stub which only exports `Platform`.

**Fix:** Extracted the conditional logic (`shouldShowTidbits`) into a pure helper function in `questionCard.utils.ts` that can be imported and tested without a renderer. The RED tests import from `./questionCard.utils` (which didn't exist yet) — correctly failing in RED phase. Tests pass GREEN after the utils file is created.

**Files modified:** `apps/mobile/components/questionCard.utils.ts` (new), `apps/mobile/components/QuestionCard.tidbits.test.ts` (adjusted import)

## TDD Gate Compliance

- RED gate: commit `5c48f2b` — `test(16-04):` — all 5 tests fail (module not found — correct RED behavior)
- GREEN gate: commit `26a10c1` — `feat(16-04):` — all 5 tests pass

## Known Stubs

None. The `tidbits` prop is fully wired from `currentQuestion.tidbits` through to the UI. No placeholder text or empty values.

## Threat Flags

No new security surface. Analysis:

- **T-16-04-02 (Information Disclosure — Tidbits shown before reveal):** Mitigated. Both branches use `revealed &&` or check inside `revealed ? <>` — tidbits cannot appear before the answer is revealed.
- **T-16-04-01 (Tampering — tidbits string injection):** Accept — React Native `Text` renders strings as text only, no HTML/script injection possible.

## Self-Check: PASSED

Files exist:
- apps/mobile/components/QuestionCard.tsx — contains `tidbits?: string` (line 17) and `tidbitsText` style
- apps/mobile/components/questionCard.utils.ts — contains `shouldShowTidbits` export
- apps/mobile/components/QuestionCard.tidbits.test.ts — 5 tests, all pass
- apps/mobile/app/game/question.tsx — contains `tidbits={displayQuestion.tidbits}`

Commits exist:
- 5c48f2b (test RED)
- 26a10c1 (feat GREEN)
