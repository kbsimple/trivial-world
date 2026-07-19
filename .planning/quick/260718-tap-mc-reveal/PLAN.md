---
quick_id: "260718"
slug: tap-mc-reveal
description: "Tap MC option to reveal answer — behind optional onChoicePress prop (single-line rollback)"
date: 2026-07-18
must_haves:
  truths:
    - Pressing any MC choice when not yet revealed triggers revealAnswer() same as the Reveal button
    - Pressing a choice after already revealed does nothing
    - Removing the onChoicePress prop from question.tsx fully reverts the behavior
  artifacts:
    - apps/mobile/components/QuestionCard.tsx (updated — choices Pressable when onChoicePress set + not revealed)
    - apps/mobile/app/game/question.tsx (updated — passes onChoicePress={revealAnswer})
    - apps/mobile/components/QuestionCard.tsx tests pass
---

# Quick Task: Tap MC option to reveal answer

## Goal

When a conductor (or player) taps a multiple-choice option before the answer is revealed, the answer should be revealed — identical to pressing "Reveal Answer". The change must be trivially rollable back.

## Rollback strategy

All behavior lives in an optional `onChoicePress?: () => void` prop on `QuestionCard`.
To revert: remove `onChoicePress={revealAnswer}` from `question.tsx`. One line.

## Task 1 — Add `onChoicePress` prop to QuestionCard

**File:** `apps/mobile/components/QuestionCard.tsx`

**Changes:**
1. Add `onChoicePress?: () => void` to `QuestionCardProps` interface
2. Accept `onChoicePress` in the destructured props
3. In the choice render loop, when `onChoicePress` is defined AND `!revealed`:
   - Wrap the choice in a `Pressable` instead of `View`
   - On press: call `onChoicePress()`
   - Visual: add `opacity: pressed ? 0.7 : 1` feedback
4. When `revealed` or `onChoicePress` is undefined: keep existing `View` (no change to current behavior)

**Key constraint:** Pressable must only be active pre-reveal. After reveal, it's already a static `View` (or Pressable with no handler, but View is simpler).

## Task 2 — Wire up in question.tsx

**File:** `apps/mobile/app/game/question.tsx`

**Changes:**
- Pass `onChoicePress={revealAnswer}` to `<QuestionCard>` (only when `!answerRevealed && !submitted`)

The simplest conditional: pass `onChoicePress={answerRevealed || submitted ? undefined : revealAnswer}` — this keeps the prop always present but guards the call.

## Task 3 — Run tests

```bash
cd apps/mobile && pnpm test run
```

All tests must pass.
