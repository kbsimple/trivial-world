---
status: complete
quick_id: "260718"
slug: tap-mc-reveal
date: 2026-07-18
commit: 8e7d1db
---

# Summary: Tap MC option to reveal answer

## What was done

Added tap-to-reveal behavior on multiple-choice option rows.

**QuestionCard.tsx:**
- Added `onChoicePress?: () => void` prop
- When prop is set and `!revealed`: each choice row renders as `Pressable` with 0.7 opacity feedback on press; calls `onChoicePress()`
- When prop is absent or `revealed`: choices render as `View` (no change to existing behavior)

**question.tsx:**
- Passes `onChoicePress={answerRevealed || submitted ? undefined : revealAnswer}` to `<QuestionCard>`

## Rollback

Remove `onChoicePress={answerRevealed || submitted ? undefined : revealAnswer}` from `<QuestionCard>` in `question.tsx`. One line. The `onChoicePress` prop in `QuestionCard` can stay (it's optional with no side effects when undefined).

## Tests

447/447 passing. No regressions.
