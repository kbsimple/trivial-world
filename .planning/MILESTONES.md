# Milestones

## v7.0: Per-Player Pack Customization — Completed 2026-06-13

**Goal:** Top-level Shared/Custom pack mode toggle on game setup screen

**Shipped:**
- `packMode: 'shared' | 'custom'` field in packStore with `setPackMode` action and persist support (Phase 19)
- Segmented control (Shared Pack / Per Player) on game setup screen, inserted below pack banner (Phase 19)
- Custom mode: full-width tappable source row + difficulty chip per player (Phase 19)
- `clearPlayerPackSources()` action clears all player packId/comboId when switching to Shared (Phase 19)
- 288 tests passing; human UAT converted to automated functional tests (Phase 19)

**Key Decisions:**
- packMode stays in packStore.ts as inline literal union — not promoted to @trivial-world/types (UI-only concern)
- Segmented control: two Pressable elements, no external library
- Custom→Shared transition clears player overrides atomically before setting mode
- Default 'shared' for backward compatibility

**Tech Debt:**
- Cosmetic: playerSourceRow label shows "Pack: …" for combo sources (display-only)
- Dead variable: chipLabel computed but not rendered in custom block

**Duration:** ~3 minutes execution time (1 phase, 1 plan)

Known deferred items at close: 10 (see STATE.md Deferred Items)

---

## v5.0: Content Generation Tooling — Completed 2026-06-13

**Goal:** CLI pipeline for bulk AI question generation with tidbits + per-player difficulty configuration

**Shipped:**
- `tidbits` field in QuestionSchema v3 + WatermelonDB migration 003 (Phase 16)
- `generate.ts` CLI: bulk generation from `--topic`, all 6 categories, incremental draft saves (Phase 16)
- `review.ts` CLI: interactive approve/edit/reject + pack publish to `public/packs/` and index (Phase 16)
- tidbits display in QuestionCard answer reveal screen (Phase 16)
- Per-player difficulty preference (Easy/Medium/Hard/Any) with `updatePlayerDifficulty` action (Phase 17)
- `playerDifficulties` snapshot at `startGame()` mirroring `playerPackIds` pattern (Phase 17)
- Difficulty chip per player in game setup; difficulty label in turn progress strip (Phase 17)

**Key Decisions:**
- Draft JSON workflow: generate writes immediately, review decouples inspection and publish
- `effectiveDifficulties = difficulty != null ? [difficulty] : enabledDifficulties` priority pattern
- playerDifficulties snapshotted at startGame() for immutable in-game state (mirrors playerPackIds)
- Per-player difficulty overrides game-level enabledDifficulties; null falls back to game default

**Tech Debt:**
- `questionProvider.getNextQuestionFromDatabase` is dead code on mobile with latent tidbits and packId bugs
- Starter pack has zero tidbits content (content gap, not code bug)

**Duration:** ~1 day

---

## v2.0: Question Packs & Game Configuration — Completed 2026-06-08

**Goal:** Custom question packs with AI generation and game configuration

**Shipped:**
- Monorepo structure with @trivial-world/types package (Phase 6)
- WatermelonDB pack storage with lazy-loading (Phase 6)
- Question generator web app with Ollama AI (Phase 7)
- 3-pass verification pipeline and confidence scoring (Phase 7)
- Human review UI for question approval (Phase 7)
- Pack export with SHA-256 checksums (Phase 7)
- Pack selection screen and game configuration (Phase 8)
- Category/difficulty filtering (Phase 8)

**Key Decisions:**
- Full monorepo with Turborepo, pnpm workspaces
- Zod-first schemas with JSON Schema exports
- Defer migration of existing 120 questions (D-02)
- Ollama-only for question generation
- Next.js App Router for generator web app
- Static export to Netlify
- Pack selection before setup screen (home → pack → setup → game)
- Built-in default pack bundled in app

**Duration:** ~2 days

---

## v1.0: Core Gameplay — Completed 2026-06-08

**Goal:** Mobile trivia game for in-person social play

**Shipped:**
- Game setup and conductor interface (Phase 1)
- Die rolls and turn management (Phase 2)
- Category-based question selection (Phase 3)
- Wedge scoring and win detection (Phase 4)
- State persistence and pause/resume (Phase 5)

**Key Decisions:**
- Quick start flow (no setup wizard)
- Conductor-centric design (app reads questions aloud)
- 6 adapted categories from Trivial Pursuit
- Zustand persist middleware for offline-first storage
- No user accounts (friction kills social gameplay)

**Duration:** ~65 minutes execution time

---
*Last updated: 2026-06-13*