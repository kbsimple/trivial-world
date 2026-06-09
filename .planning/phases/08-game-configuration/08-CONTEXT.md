# Phase 8: Game Configuration - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **pack selection, game configuration, and pack management UI in the mobile app** — enabling game conductors to choose question packs, filter categories, and manage downloaded packs.

**In scope:**
- Pack selection UI showing available packs with metadata
- Game settings UI (category filtering, difficulty filtering)
- Pack details view with category distribution and question counts
- Pack download with checksum verification and progress indication
- Pack version tracking for update notifications
- Built-in default pack with existing 120 questions

**Out of scope:**
- Question generation (Phase 7 complete)
- Cloud hosting infrastructure (Phase 7 complete)
- Online multiplayer features (future)
- Time limits per question (deferred)
- Game variants beyond category/difficulty filtering (future)

</domain>

<decisions>
## Implementation Decisions

### Pack Selection Flow

- **D-01:** Pack selection screen BEFORE setup screen. Flow: Home → Pack Selection → Setup → Game. Clean separation where user picks content before adding participants.
- **D-02:** Built-in default pack included with app. The 120 existing questions are bundled as a default pack so new users can play immediately without downloading. This pack is immutable and always present.
- **D-03:** Hardcoded generator URL for pack index. The app fetches available packs from a known endpoint (configured in code). Users cannot change this URL in v2.0.

### Game Settings

- **D-04:** No time limits per question. The conductor controls pacing — no countdown timers, no auto-skip. Keeps the social, eyes-up experience.
- **D-05:** Category filtering before game start. On the pack selection screen, conductor can toggle which categories (blue, pink, yellow, purple, green, orange) are included. This is the existing `setEnabledCategories` pattern from questionStore, now surfaced in UI.
- **D-06:** Difficulty filtering as optional pre-game setting. Conductor can filter by easy/medium/hard or include all difficulties. Implemented alongside category filtering on the same UI.
- **D-07:** No game variants for v2.0. Category filtering and difficulty filtering are sufficient configurability. Win condition remains "collect all 6 wedges + center question."

### Pack Details UI

- **D-08:** Modal overlay for pack details. Tapping a pack in the list opens a modal overlay (not a separate screen or inline expansion). Quick to dismiss, stays in selection context.
- **D-09:** Pack details modal shows: (1) Category distribution visual (bar chart or pie), (2) Question counts per category and total, (3) Difficulty breakdown (easy/medium/hard counts or visual), (4) Pack metadata (version, author, download date, checksum status).

### Download Experience

- **D-10:** Progress bar during pack download. User sees download progress with percentage/bytes. No background download — user waits for completion before continuing.
- **D-11:** Alert with retry on download failure. If download fails, show an alert explaining the error with a "Retry" button. Clear feedback, immediate recovery path.
- **D-12:** Checksum verification is silent on success. If checksum matches, proceed normally. If mismatch, show error alert with "Retry download" option.

### Update Notifications

- **D-13:** Badge on pack for available updates. When a newer version of a downloaded pack is detected, show "Update available" badge on that pack in the list. Non-intrusive — user can update when ready.
- **D-14:** Version comparison uses semver. Pack version in metadata compared against downloaded version. Major version bumps may indicate breaking changes.

### Pack Storage

- **D-15:** Only one active pack at a time (per D-04 from Phase 6). Selecting a new pack deactivates the previous. Asked questions are tracked per-pack via `askedAt` timestamp.
- **D-16:** Downloaded packs persist in WatermelonDB. Pack metadata stored in `question_packs` table, questions in `questions` table with foreign key to pack.

### Claude's Discretion

- Exact visual design of category distribution chart (bar vs pie vs colored dots)
- Animation for download progress bar
- Exact wording for download error messages
- Badge styling for "Update available"
- How to handle major version mismatches (blocking vs warning)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, categories
- `.planning/REQUIREMENTS.md` — CONF-01 through CONF-04, CLOUD-02, CLOUD-03 requirements
- `.planning/ROADMAP.md` — Phase 8 definition and success criteria

### Prior Phase Context
- `.planning/phases/06-question-pack-structure/06-CONTEXT.md` — Pack schema, WatermelonDB models, single active pack
- `.planning/phases/07-question-generator-web-app/07-CONTEXT.md` — Generator app, pack export, Netlify hosting

### Research
- `.planning/research/ARCHITECTURE.md` — Pack download flow, presigned URLs, offline-first caching

### Key Code References
- `apps/mobile/app/index.tsx` — Home screen entry point (where pack selection integrates)
- `apps/mobile/app/game/setup.tsx` — Current setup screen (participants only)
- `apps/mobile/stores/questionStore.ts` — Category filtering pattern (`setEnabledCategories`), asked tracking
- `apps/mobile/database/models/QuestionPack.ts` — WatermelonDB pack model with `isActive` field
- `apps/mobile/database/models/Question.ts` — WatermelonDB question model with `askedAt` field
- `packages/types/src/question-pack.ts` — Zod schemas for pack validation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **questionStore.setEnabledCategories()**: Already exists — pattern for category filtering
- **questionStore.askedQuestions**: Set<string> for tracking asked questions — works per-pack
- **QuestionPackModel.isActive**: Single active pack enforcement — already implemented
- **QuestionPackModel.getAvailableQuestions(category)**: Returns unasked questions by category
- **QuestionModel.markAsAsked()**: Marks question as used — ready for gameplay
- **Home screen navigation pattern**: Entry point for pack selection integration

### Established Patterns
- **Zustand stores with persist middleware**: Used in gameStore, playerStore, questionStore
- **WatermelonDB offline-first**: Pack storage in local database
- **Expo Router navigation**: File-based routing with `router.push()` and `router.replace()`
- **Category colors**: `CATEGORY_COLORS` constant for visual category display
- **PlayerColor type**: Category enum already defined in types

### Integration Points
- **Pack selection screen**: New screen at `apps/mobile/app/packs/index.tsx`
- **Pack details modal**: Component in `apps/mobile/components/` or inline in pack screen
- **Pack download service**: New `apps/mobile/services/packDownloader.ts`
- **Pack store**: New Zustand store `apps/mobile/stores/packStore.ts` for pack state
- **Game setup modification**: Add pack reference to game state

### Critical Changes
- **Home screen**: Add navigation to pack selection screen
- **Setup screen**: Receives selected pack from navigation state
- **questionStore**: Query WatermelonDB instead of `getQuestionsByCategory()`
- **gameStore**: Track `activePackId` for current game session

</code_context>

<specifics>
## Specific Ideas

- Pack list shows downloaded packs with: name, author, question count, "Update available" badge if applicable
- Pack details modal: visual category distribution (colored bars), per-category counts, difficulty breakdown
- Download progress: percentage and bytes transferred
- Category filtering: 6 toggles (blue, pink, yellow, purple, green, orange) with visual category indicators
- Difficulty filtering: easy/medium/hard toggles, default all enabled
- Built-in default pack: named "Trivial World Classic" with 120 questions from `data/questions/`
- Error handling: friendly error messages with retry buttons

</specifics>

<deferred>
## Deferred Ideas

### Time Limits Per Question
- Countdown timer with configurable duration
- Auto-skip or auto-reveal when time runs out
- Per-question time pressure mode
- Deferred to future version if user feedback requests it

### Game Variants
- Short game (fewer wedges, half questions)
- Point-based scoring (alternative to wedge collection)
- Custom win conditions
- Deferred — category and difficulty filtering provide sufficient configurability

### Configurable Generator URL
- Settings screen for power users to change pack source
- Multi-source pack discovery (marketplace concept)
- Deferred — single hardcoded URL keeps v2.0 simple

### Pack Storage Management
- Delete downloaded packs UI
- Storage usage display
- Automatic cleanup of old versions
- Deferred — basic pack management in scope, advanced storage features later

</deferred>

---

*Phase: 08-game-configuration*
*Context gathered: 2026-06-08*