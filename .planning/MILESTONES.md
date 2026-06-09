# Milestones

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
*Last updated: 2026-06-08*