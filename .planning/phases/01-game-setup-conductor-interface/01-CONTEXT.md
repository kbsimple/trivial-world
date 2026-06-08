# Phase 1: Game Setup & Conductor Interface - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the **game creation and conductor interface** — enabling a game conductor to set up a new game, add participants, and display questions clearly for reading aloud.

**In scope:**
- Creating a new game session
- Adding/removing/naming participants
- Starting the game
- Question display with category identification
- Answer reveal/hide mechanism
- Marking answers correct/incorrect

**Out of scope:**
- Die roll simulation (Phase 2)
- Move validation and board position (Phase 2-3)
- Question selection logic (Phase 3)
- Scoring and wedge tracking (Phase 4)
- State persistence (Phase 5)

</domain>

<decisions>
## Implementation Decisions

### Game Creation Flow

- **D-01:** Quick start flow — single "New Game" button from home screen leads directly to participant setup. No setup wizard, no configuration screens before players can start.
- **D-02:** No game mode selection in v1 — single game mode (standard Trivial Pursuit rules). Custom modes deferred to v1.x.
- **D-03:** No game ID or shareable link in v1 — local single-device play only. Online features are v2+.

### Participant Management

- **D-04:** Inline participant entry — add players on the same screen as game creation. No separate "lobby" screen.
- **D-05:** Auto-assign player colors from the 6 Trivial World category colors (Blue, Pink, Yellow, Purple, Green, Orange) in order. First player gets Blue, second gets Pink, etc.
- **D-06:** Minimum 1 player, maximum 6 players (limited by category colors). Support for solo practice mode.
- **D-07:** Player names are optional — if not entered, use "Player 1", "Player 2", etc. as defaults.
- **D-08:** Remove participant with swipe-left gesture or long-press confirmation. No complex reordering UI.

### Question Display Design

- **D-09:** Large centered text for question — optimized for reading aloud at arm's distance. Font size minimum 24pt, scale up on larger screens.
- **D-10:** Category badge displayed prominently — colored pill/badge with category name (e.g., "Pop Culture & Streaming" with pink background). Heritage from Trivial Pursuit.
- **D-11:** Question number shown in format "Q1", "Q2", etc. — helps conductor track progress.
- **D-12:** Answer hidden by default — large "Reveal Answer" button. Tap to show answer below question.
- **D-13:** After answer reveal — two large buttons appear: "✓ Correct" (green) and "✗ Incorrect" (red). Both buttons are 50% width, full-height for easy thumb tapping.
- **D-14:** Minimal chrome during question display — no scores, no player list, no board. Maximum screen space for question text. Eyes-up design principle.

### Conductor Interface

- **D-15:** "Conductor mode" is implicit — the person holding the phone is always the conductor. No explicit role selection or mode toggle.
- **D-16:** After marking correct/incorrect — automatically advance to next player's turn. No manual "next turn" button.
- **D-17:** Current player indicator — small name/avatar at top of screen. Tap to see all players and scores (Phase 4 overlay).

### Visual Design

- **D-18:** Dark theme by default — reduces eye strain in social/party settings, improves text readability.
- **D-19:** High contrast text — white on dark background for question text. Accessibility-first design.
- **D-20:** Haptic feedback on answer reveal and correct/incorrect marking — tactile confirmation for conductor.

### Claude's Discretion

- Typography scale and spacing — follow Tamagui design system defaults, ensure minimum 24pt for question text.
- Exact button placement — conductor experience research shows large bottom-aligned action buttons work best.
- Animation timing for transitions — standard 300ms for screen transitions, instant for answer reveal (no delay).
- Error handling for edge cases — graceful defaults (empty name = "Player N"), max players = hard limit with message.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, categories, constraints
- `.planning/REQUIREMENTS.md` — v1 requirements with REQ-IDs and traceability
- `.planning/ROADMAP.md` — Phase structure and dependencies

### Research
- `.planning/research/FEATURES.md` — Table stakes, differentiators, anti-features for mobile trivia
- `.planning/research/ARCHITECTURE.md` — Component structure, data flow, patterns
- `.planning/research/STACK.md` — Expo SDK 55, Zustand, WatermelonDB, Tamagui recommendations
- `.planning/research/PITFALLS.md` — Critical mistakes to avoid (screen attention, question quality)

### Key Research Findings
- Game conductor model is core differentiator — app supports social play, doesn't replace it
- Instant play is table stakes — no friction, no accounts, no tutorial
- Eyes-up design — minimal on-screen info during active play
- Category colors are Trivial Pursuit heritage — Blue, Pink, Yellow, Purple, Green, Orange

</canonical_refs>

<code_context>
## Existing Code Insights

**Project Status:** Greenfield — no existing code. This is the first implementation phase.

**Recommended Stack (from STACK.md):**
- Framework: Expo SDK 55 + React Native 0.83
- State: Zustand 5.x with persist middleware
- UI: Tamagui 2.x for components and theming
- Navigation: Expo Router (file-based routing)
- Animations: react-native-reanimated 3.x

**Key Patterns (from ARCHITECTURE.md):**
- Zustand slices pattern — separate stores for Game, Players, Questions, Settings
- State machine for game phases — setup → rolling → moving → answering → scoring → finished
- Local-first architecture — all state on device, no backend dependency

</code_context>

<specifics>
## Specific Ideas

- Question display should feel like reading from a cue card — clean, large text, nothing to distract
- Conductor experience is paramount — they're the host, the app is their assistant
- Category colors should be vibrant and immediately recognizable (Trivial Pursuit heritage)
- "Eyes-up" moments — when question is displayed, everyone should be looking at the conductor, not the screen

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-game-setup-conductor-interface*
*Context gathered: 2026-06-08*