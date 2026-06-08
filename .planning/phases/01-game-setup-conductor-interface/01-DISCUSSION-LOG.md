# Phase 1: Game Setup & Conductor Interface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 01-game-setup-conductor-interface
**Areas discussed:** Game Creation Flow, Participant Management, Question Display, Conductor Interface, Visual Design
**Mode:** Auto (recommended defaults selected)

---

## Game Creation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Quick start | Single "New Game" button, inline setup | ✓ |
| Setup wizard | Multi-step configuration screens | |
| Game mode selection | Choose game type before starting | |

**Auto-selected:** Quick start — Research shows "instant play" is table stakes for party games. No friction before first game.

---

## Participant Management

| Option | Description | Selected |
|--------|-------------|----------|
| Inline entry | Add players on same screen as game creation | ✓ |
| Separate lobby | Dedicated player management screen | |
| Pre-set player count | Choose number of players before naming | |

**Auto-selected:** Inline entry with auto-assigned colors from 6 Trivial World category colors (Blue, Pink, Yellow, Purple, Green, Orange). Maximum 6 players, minimum 1 for solo practice. Names optional with "Player N" defaults.

---

## Question Display

| Option | Description | Selected |
|--------|-------------|----------|
| Large centered text | Optimized for reading aloud | ✓ |
| Card-style layout | Question in card with border/shadow | |
| Compact display | Smaller text, more metadata visible | |

**Auto-selected:** Large centered text (minimum 24pt), category-colored badge prominently displayed, question number in "Q1" format. Answer hidden by default with large "Reveal Answer" button.

---

## Scoring Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Large ✓/✗ buttons | Full-width, easy thumb reach | ✓ |
| Swipe gestures | Swipe left/right for correct/incorrect | |
| Voice confirmation | Conductor says "correct" and app detects | |

**Auto-selected:** Large green ✓ (Correct) and red ✗ (Incorrect) buttons, 50% width each, with haptic feedback. Auto-advances to next player after marking.

---

## Board Representation

| Option | Description | Selected |
|--------|-------------|----------|
| Simplified position indicator | Current player and position only | ✓ |
| Full visual board | Trivial Pursuit-style round board | |
| List view | All players and positions in list format | |

**Auto-selected:** Simplified position indicator for Phase 1. Full board visualization deferred to Phase 3 when movement mechanics are implemented. Phase 1 focuses on conductor interface for question display.

---

## Visual Theme

| Option | Description | Selected |
|--------|-------------|----------|
| Dark theme default | Reduces eye strain, improves readability | ✓ |
| Light theme default | Traditional bright interface | |
| System preference | Follow device theme setting | |

**Auto-selected:** Dark theme by default. Party/social settings often have varied lighting; dark theme improves text readability and reduces screen glare.

---

## Claude's Discretion

Areas where Claude has flexibility to choose implementation approach:

- Typography scale and spacing — follow Tamagui design system
- Exact button placement — bottom-aligned action buttons work best for one-handed use
- Animation timing — standard 300ms transitions, instant for answer reveal
- Error handling — graceful defaults (empty name = "Player N", max players = hard limit)

---

## Deferred Ideas

None — all discussion stayed within Phase 1 scope.

---

*Auto-mode discussion completed: 2026-06-08*