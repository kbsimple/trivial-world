# Phase 5: State Persistence - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **game state persistence and recovery** — enabling games to be paused, resumed, and survive app interruptions without data loss.

**In scope:**
- Persisting all game state to local storage automatically
- Resuming interrupted games from where they left off
- Explicit pause/resume functionality for game conductor
- Handling app background/foreground transitions without data loss
- Player data persistence (names, colors, wedge progress)
- Recovery from mid-turn interruptions

**Out of scope:**
- Cloud sync or cross-device play (v2+)
- Game history/statistics tracking
- Multiple concurrent game sessions
- Lifetime leaderboard (deferred to future phase)

</domain>

<decisions>
## Implementation Decisions

### Player Persistence

- **D-01:** Add `persist` middleware to `playerStore` with AsyncStorage, matching the existing pattern used in `gameStore` and `questionStore`. Each store maintains its own storage key. This closes the critical gap where player data (names, colors, wedges) would be lost on app close.

### Resume Flow UX

- **D-02:** On home screen, show "Resume Game" button (primary, prominent) and "New Game" button (secondary) when a saved game exists. Clean, non-interruptive approach consistent with Phase 1's quick start flow (D-01). No modal prompts that block interaction.

### Pause/Resume Controls

- **D-03:** Three-layer pause approach:
  - **Implicit pause:** Closing the app or navigating to home automatically saves state via Zustand persist middleware
  - **Pause button in header:** During game screens (roll, move, question), a pause button shows overlay with "Resume Game" and "End Game" options — explicit control for intentional breaks
  - **Back button confirmation:** Prevents accidental exits from game screens with a confirmation dialog

### App Lifecycle Behavior

- **D-04:** Rely on Zustand persist middleware for auto-persistence. No additional `AppState` listener needed — state is saved on every change automatically.

- **D-05:** Reset to safe state on crash/interruption:
  - Interrupted mid-die roll → Reset to "rolling" phase, user rolls again
  - Interrupted mid-question (answer revealed) → Restore to question screen with answer hidden (default state)
  - Simple, predictable recovery behavior without complex state tracking

### Claude's Discretion

- Storage key naming for stores (suggest: `trivial-world-game`, `trivial-world-players`, `trivial-world-questions` — already in use for game and questions)
- Pause overlay UI design (Tamagui Sheet or custom modal)
- Back button handler implementation (Expo Router's `useNavigation` or gesture handler)
- Home screen layout with resume/new game buttons (follow existing Tamagui patterns)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, categories, constraints
- `.planning/REQUIREMENTS.md` — STAT-01 through STAT-04 requirements
- `.planning/ROADMAP.md` — Phase 5 definition and success criteria

### Prior Phase Context
- `.planning/phases/01-game-setup-conductor-interface/01-CONTEXT.md` — D-01 quick start flow, D-06 max 6 players, D-14 eyes-up design, D-15 implicit conductor model
- `.planning/STATE.md` — Accumulated context from Phases 1-4

### Research
- `.planning/research/STACK.md` — Zustand persist middleware, AsyncStorage patterns
- `.planning/research/ARCHITECTURE.md` — State machine pattern, unidirectional data flow, Pattern 4 (Local-First with Persistence)

### Key Code References
- `stores/gameStore.ts` — Existing persist middleware pattern (lines 32-191)
- `stores/questionStore.ts` — Persist with custom Set serialization (lines 43-120)
- `stores/playerStore.ts` — **Missing persistence** — this is the gap to fill
- `types/game.ts` — GameState interface, VALID_TRANSITIONS state machine

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Zustand persist middleware:** Already implemented in `gameStore.ts` and `questionStore.ts` with AsyncStorage — same pattern applies to `playerStore`
- **State machine:** `VALID_TRANSITIONS` in `types/game.ts` defines valid phase transitions — resume logic must respect this
- **Home screen:** `app/index.tsx` is the entry point — needs modification for resume/new game buttons

### Established Patterns
- **Persist middleware pattern:**
  ```typescript
  persist(
    (set, get) => ({ /* store */ }),
    { name: 'storage-key', storage: createJSONStorage(() => AsyncStorage) }
  )
  ```
- **Custom serialization:** `questionStore.ts` uses `partialize` and `onRehydrateStorage` for Set → array conversion
- **Cross-store references:** `gameStore` calls `usePlayerStore.getState()` and `useQuestionStore.getState()` — all stores must be hydrated before actions

### Integration Points
- **Home screen (`app/index.tsx`):** Add conditional buttons for resume/new game
- **Game layout (`app/game/_layout.tsx`):** Add pause button to header, handle back button
- **Root layout (`app/_layout.tsx`):** AppState listener if needed (decision: not needed per D-04)
- **Store initialization:** Ensure player store is hydrated before game store actions reference it

### Critical Gap
- **`playerStore.ts` lines 22-115:** No persist middleware — players array, wedges, and names are lost on app close. This breaks STAT-01 and STAT-02.

</code_context>

<specifics>
## Specific Ideas

- Resume button should feel like a natural extension of quick start flow (Phase 1 D-01)
- Pause overlay should be simple: just "Resume Game" and "End Game" options — no settings or extra chrome
- If game crashes mid-question, don't show the answer — fairness matters in a trivia game
- "New Game" button should warn if a game is in progress: "This will end your current game. Continue?"

</specifics>

<deferred>
## Deferred Ideas

### Lifetime Leaderboard for Players
- Track historical game results (wins, total wedges, games played)
- Would require new persistence layer for game history
- Belongs in a future phase focused on statistics/progression
- Not in scope for v1 which focuses on single-session gameplay

</deferred>

---

*Phase: 05-state-persistence*
*Context gathered: 2026-06-08*