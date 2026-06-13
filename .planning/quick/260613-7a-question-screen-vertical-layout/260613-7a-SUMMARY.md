---
quick_id: 260613-7a
slug: question-screen-vertical-layout
status: complete
date: 2026-06-13
commits:
  - d3a2c4b
  - 502ec53
---

# Quick Task 260613-7a: Question Screen Vertical Layout

## What Was Done

Restructured the question screen layout so the category badge and question text
appear near the top of the screen, and the Reveal Answer button / answer content
are anchored at the bottom in a sticky footer.

## Changes

### `apps/mobile/components/QuestionCard.tsx`
- Removed `answerText`, `onReveal`, `tidbits` props — these moved to the parent screen
- Removed the Reveal Answer Pressable and open-answer revealed block from the card
- Removed `revealButton` / `revealButtonText` styles
- Changed container from `justifyContent: 'center'` → `justifyContent: 'flex-start'`
- Card now renders: header row (badge + difficulty), question number, question text, MC choices only

### `apps/mobile/app/game/question.tsx`
- Added `Pressable` import
- New three-zone layout:
  - **topZone**: PlayerIndicator + championship banner + QuestionCard
  - **spacer** (flex: 1): pushes footer to bottom
  - **footer**: Reveal Answer button (pre-reveal) → answer text + tidbits + AnswerButtons (post-reveal)
- Removed old `questionContainer` (flex: 1, center) and `answerButtons` styles
- Added `revealButton`, `revealButtonText`, `answerText`, `tidbitsText` styles to screen level

## Verification

- 282 tests pass
- No new TypeScript errors
