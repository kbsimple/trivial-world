# Phase 8: Game Configuration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 08-game-configuration
**Areas discussed:** Pack Selection Flow, Pack Source Strategy, Game Settings Scope, Pack Details UI, Download Experience, Update Notifications, Category Filtering UI

---

## Pack Selection Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Before setup (Recommended) | User picks pack on home screen before setup. Clean separation: home → pack → setup → game | ✓ |
| In setup screen | Pack selection becomes first step on setup screen, then participants. Same screen, more crowded | |
| After setup | New screen between setup and game roll. Participants ready, then pack selection, then start | |

**User's choice:** Before setup (Recommended)
**Notes:** Clean separation where user picks content before adding participants. Flow: Home → Pack Selection → Setup → Game.

---

## Default Pack Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Show empty state (Recommended) | Show empty state with instructions to download a pack. Forces user to get content first | |
| Built-in default pack | Include a built-in default pack with 120 existing questions. Works offline immediately, but increases app size | ✓ |
| Require download | Show empty state, but button to download from generator URL is prominent. User must download first | |

**User's choice:** Built-in default pack
**Notes:** Bundle the 120 existing questions as a default pack. Users can play immediately without downloading anything.

---

## Pack Source URL

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded URL (Recommended) | Generator URL configured in code. Simple, works for single generator instance. User cannot change | ✓ |
| Configurable URL | Settings screen lets user enter custom generator URL. Flexible but adds complexity | |
| Both options | Hardcoded default + configurable override in settings. Best of both for power users | |

**User's choice:** Hardcoded URL (Recommended)
**Notes:** Keep it simple. Generator URL is configured in code, not changeable by users.

---

## Time Limits Per Question

| Option | Description | Selected |
|--------|-------------|----------|
| No time limits (Recommended) | No time limit. Conductor controls pacing. Simple, social, no pressure | ✓ |
| Optional timer | Optional countdown timer per question. Skip/reveal if time runs out. Adds optional pressure | |
| Enforced timer | Always-on countdown with configurable duration. Enforces faster gameplay | |

**User's choice:** No time limits (Recommended)
**Notes:** Conductor controls pacing. Keeps the social, eyes-up experience without time pressure.

---

## Difficulty Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Filter by difficulty (Recommended) | All difficulty levels included. Conductor can filter by difficulty if desired before game | ✓ |
| Display only | Difficulty shown in question list only, not configurable. Simpler but less control | |
| Game modes by difficulty | Game variants like 'Easy mode' (only easy/medium), 'Expert mode' (only hard). More structured | |

**User's choice:** Filter by difficulty (Recommended)
**Notes:** Conductor can choose which difficulty levels to include before the game starts. Pairs with category filtering on same UI.

---

## Game Variants

| Option | Description | Selected |
|--------|-------------|----------|
| No variants for v2.0 (Recommended) | No game variants in v2.0. Category filtering and difficulty filtering are sufficient for now | ✓ |
| Game length variants | Short game: half the questions, fewer wedges to win. Adds a game length option | |
| Win condition variants | Custom win condition: collect X wedges, or first to Y points. More complex rules | |

**User's choice:** No variants for v2.0 (Recommended)
**Notes:** Keep it simple. Category and difficulty filtering provide sufficient configurability for v2.0.

---

## Pack Details UI

| Option | Description | Selected |
|--------|-------------|----------|
| Modal overlay (Recommended) | Tap pack to see details in a modal overlay. Quick, doesn't leave list context | ✓ |
| Separate screen | Separate screen when tapping pack. More room for content but more navigation | |
| Inline expansion | Inline expansion in the pack list. Tap to expand row with details | |

**User's choice:** Modal overlay (Recommended)
**Notes:** Quick to open, easy to dismiss, stays in pack selection context.

---

## Pack Details Content

| Content Item | Selected |
|--------------|----------|
| Category distribution (Recommended) | ✓ |
| Question counts (Recommended) | ✓ |
| Difficulty breakdown | ✓ |
| Pack metadata | ✓ |

**User's choice:** All four items selected
**Notes:** Comprehensive pack details showing visual category distribution, question counts, difficulty breakdown, and pack metadata (version, author, etc.)

---

## Download Progress Display

| Option | Description | Selected |
|--------|-------------|----------|
| Show progress bar (Recommended) | Progress bar during download. User sees completion status. More informative | ✓ |
| Spinner only | Spinner during download. Simpler UI but less feedback | |
| Background download | Background download with notification when complete. Non-blocking but less visible | |

**User's choice:** Show progress bar (Recommended)
**Notes:** User sees download progress with percentage/bytes. No background download — user waits for completion.

---

## Download Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Alert with retry (Recommended) | Show error alert with retry button. Clear feedback, user can retry immediately | ✓ |
| Auto-retry | Silent retry with exponential backoff. User doesn't see transient failures | |
| Failed state in list | Show error in pack list with 'failed' badge. User can retry from list | |

**User's choice:** Alert with retry (Recommended)
**Notes:** Clear feedback with immediate recovery path.

---

## Update Notifications

| Option | Description | Selected |
|--------|-------------|----------|
| Badge on pack (Recommended) | 'Update available' badge on pack in list. Non-intrusive, user can update when ready | ✓ |
| Modal prompt | Modal prompt when update detected. More aggressive but ensures update | |
| Toast on launch | Check updates on app launch, show toast if found. Proactive but may interrupt | |

**User's choice:** Badge on pack (Recommended)
**Notes:** Non-intrusive notification. User can update when ready.

---

## Category Filtering UI

| Option | Description | Selected |
|--------|-------------|----------|
| In pack selection flow (Recommended) | On pack selection screen, before starting game. Tap categories to toggle before hitting 'Start' | ✓ |
| Settings screen | Separate settings screen with category toggles. More formal, separate from gameplay | |
| In-game menu | Game conductor can toggle categories mid-game from a menu. More flexible but potentially confusing | |

**User's choice:** In pack selection flow (Recommended)
**Notes:** Category and difficulty toggles on the pack selection screen. Conductor configures before starting game.

---

## Claude's Discretion

Areas where the user said "you decide" or deferred to Claude:
- Exact visual design of category distribution chart (bar vs pie vs colored dots)
- Animation for download progress bar
- Exact wording for download error messages
- Badge styling for "Update available"
- How to handle major version mismatches (blocking vs warning)

## Deferred Ideas

Ideas mentioned during discussion that were noted for future phases:
- Time limits per question (deferred to future version if user feedback requests)
- Game variants like short game mode (deferred)
- Configurable generator URL for power users (deferred — single hardcoded URL keeps v2.0 simple)
- Pack storage management like delete packs UI (deferred)

---

*Discussion completed: 2026-06-08*