# Phase 5: State Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 05-state-persistence
**Areas discussed:** Player Persistence, Resume Flow UX, Pause/Resume Controls, App Lifecycle Behavior

---

## Player Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Add persist to playerStore | Wrap playerStore with persist middleware, matching gameStore/questionStore pattern. Each store maintains own storage key. | ✓ |
| Merge all stores into one | Unified game store with single storage key. Simpler serialization but larger JSON payload. | |
| Custom rehydration layer | Separate stores with custom load ordering. More complex. | |

**User's choice:** Add persist to playerStore (Recommended)
**Notes:** Critical gap identified — playerStore lacks persistence middleware, would lose all player data (names, colors, wedges) on app close.

---

## Resume Flow UX

| Option | Description | Selected |
|--------|-------------|----------|
| Home screen buttons | Show "Resume Game" (primary) and "New Game" (secondary) on home screen when saved game exists. Quick access, non-interruptive. | ✓ |
| Modal prompt on launch | Overlay asking "Resume game or start new?" Blocks interaction until choice made. | |
| Auto-resume to last screen | Direct navigation to last game screen. Fastest but potentially confusing. | |

**User's choice:** Home screen buttons (Recommended)
**Notes:** Consistent with Phase 1 D-01 quick start flow. Clean UX without blocking modals.

---

## Pause/Resume Controls

| Option | Description | Selected |
|--------|-------------|----------|
| Implicit pause only | App close/background auto-saves. No extra UI. Eyes-up design maintained. | ✓ |
| Pause button in header | Explicit pause button shows overlay with resume/end options. | ✓ |
| Back button confirmation | Confirmation dialog when navigating back from game screens. Prevents accidental exits. | ✓ |

**User's choice:** All three behaviors
**Notes:** Three-layer approach provides flexibility: implicit for app close, explicit for intentional breaks, confirmation for accidental exits.

---

## App Lifecycle Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-persist on state change | Zustand persist middleware saves on every state change. No additional AppState handling. | ✓ |
| Force-flush on background event | Listen to AppState 'background' and force-flush stores. More robust. | |
| State + screen position tracking | AppState listener saves state AND records exact screen/phase. Shows banner on resume. | |

**User's choice:** Auto-persist on state change (Recommended)
**Notes:** Simplest approach — Zustand already handles this. No additional complexity needed.

---

## Crash/Interruption Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Reset to safe state | Mid-die roll → rolling phase. Mid-question → question screen with answer hidden. Simple, predictable. | ✓ |
| Exact state restoration | Track animation/answer state precisely. More complex. | |
| Crash detection with message | Show "game was interrupted" message on resume. Extra reassurance. | |

**User's choice:** Reset to safe state (Recommended)
**Notes:** Fairness principle — don't show answer if interrupted mid-question. Simple recovery logic.

---

## Claude's Discretion

- Storage key naming (already established: `trivial-world-game`, `trivial-world-questions`)
- Pause overlay UI design (Tamagui Sheet or custom modal)
- Back button handler implementation
- Home screen layout with resume/new game buttons

---

## Deferred Ideas

- **Lifetime leaderboard for players** — Track historical game results, would require new persistence layer. Deferred to future phase for statistics/progression features.

---

*Discussion completed: 2026-06-08*