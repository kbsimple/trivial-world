# Phase 22: Undo Last Answer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 22-undo-last-answer
**Areas discussed:** Undo button placement, Undo depth

---

## Undo Button Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle link at the bottom | Small muted text/link below the progress strip: "Undo last mark" — visible but doesn't compete with category buttons during normal play | ✓ |
| Visible button near the top | A small button row below the player indicator header, above the category buttons | |

**User's choice:** Subtle link at the bottom

---

## Undo Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Show only when available | Undo affordance only appears after a mark is made and before the next question starts | ✓ |
| Always visible, greyed when unavailable | Always present but dimmed when there's nothing to undo | |

**User's choice:** Show only when available

---

## Undo Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Single level only | Undo only the most recent mark. Snapshot cleared when new question selected | ✓ |
| Multiple levels (full history) | Stack of snapshots — can undo last N marks, going back through previous turns | |

**User's choice:** Single level only

---

## Claude's Discretion

- Post-undo landing: navigate to `/game/question` with `answerRevealed: true` (conductor sees question + answer again, can re-mark)
- Undo link label text and exact styling
- Whether a brief toast confirms undo completed

## Deferred Ideas

- Undo for skip action
- Multi-level undo history
- Visual confirmation toast after undo
