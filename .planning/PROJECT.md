# Trivial World

## What This Is

Trivial World is a mobile trivia game for in-person social play, with a CLI-based question generation pipeline for creating custom question packs. One person acts as the **game conductor**, reading questions from the app to participants. Each player can independently configure their question pack and difficulty level. The mobile app handles category selection, question management, per-player pack/difficulty routing, championship mode, and scoring, while players engage in a shared physical space around the mobile device.

## Core Value

Enable in-person social trivia gameplay where the app supports (not replaces) human interaction — the game conductor reads questions aloud and players move together.

## Current State: v5.0 Complete

**Shipped:** 2026-06-13
**Phases:** 1–17 (17 phases across 5 milestones)
**Tech stack:** Expo SDK 55 + React Native 0.83, Zustand 5.x, WatermelonDB, Tamagui 2.x, Expo Router

### What's Working

- Full game loop: setup → category selection → question → scoring → championship → win
- Per-player pack + difficulty configuration (native only; web uses bundled pool)
- CLI question generation: `pnpm generate --topic <topic>` → draft JSON → `pnpm review <draft>` → published pack
- `tidbits` field in QuestionSchema v3 displayed in answer reveal screen
- WatermelonDB offline pack caching with schema v3 (tidbits migration)
- Web export via Expo static export (game plays in browser)
- AI question generation via Ollama (local dev only)

### Known Technical Debt

- `questionProvider.getNextQuestionFromDatabase` is dead code on mobile with two latent bugs (drops tidbits, ignores packId) — safe today, risky if refactored
- Starter pack `trivial-world-starter-7f3a9c2e.json` has zero tidbits content
- `effectiveDifficulties` derivation logic duplicated in `questionStore.ts` and `questionProvider.ts`

---

## Requirements

### Validated

- ✓ Game conductor can start a new game session — v1.0
- ✓ Game conductor can add 1 or more participants to the game — v1.0
- ✓ App simulates die roll and displays result — v1.0 (removed in v4.0: streak-based turns)
- ✓ App indicates valid move choices based on die roll — v1.0 (removed in v4.0)
- ✓ App presents questions from 6 categories to game conductor — v1.0
- ✓ Questions are created electronically with category metadata — v2.0
- ✓ Game tracks scoring progress per participant — v1.0
- ✓ Question pack data structure with versioning and validation — v2.0
- ✓ AI-powered question generation from topics and source material — v2.0
- ✓ Pack selection UI with category/difficulty filtering — v2.0
- ✓ Pack download with checksum verification — v2.0
- ✓ Category completion tracking per player (replaces wedges) — v4.0
- ✓ Streak-based turns: correct keeps turn, incorrect passes — v4.0
- ✓ Championship mode on all 6 categories complete — v4.0
- ✓ Per-player pack selection (native; each player uses a different pack) — v4.0
- ✓ CLI bulk question generation with tidbits field — v5.0
- ✓ Interactive draft review and pack publish CLI — v5.0
- ✓ Per-player difficulty configuration (Easy/Medium/Hard/Any) — v5.0
- ✓ tidbits field displayed in question reveal screen — v5.0

### Active (Deferred from v3.0)

- [ ] WEBG-02: Session storage persists game state during browser session (no IndexedDB)
- [ ] WEBG-04: Visual parity between mobile and web
- [ ] GEN-01/GEN-02: Generator app deployed to Netlify as static web app
- [ ] NETL-01/NETL-02/NETL-03: Auto-deploy from main branch, SPA redirects, two separate Netlify sites
- [ ] PWA-01/PWA-02/PWA-03: PWA manifest, HTTPS, Add to Home Screen

### Out of Scope

| Feature | Reason |
|---------|--------|
| Online multiplayer (remote play) | In-person only — breaks core social value |
| User accounts/authentication | Friction kills social gameplay |
| Real-time leaderboards | Not needed for in-person play |
| In-app purchases | Free-to-play model |
| Cloud AI for generation | Dev-only Ollama (D-01) |
| IndexedDB persistence | Session-only storage for web (D-02) |
| Service worker caching | Deferred |
| Time limits per question | Conductor controls pacing (D-04) |
| Custom win condition | Fixed at 6+1 categories |
| Difficulty selection on web | Native-only for per-player difficulty (web uses bundled pool) |

---

## Context

**Inspiration:** Trivial Pursuit board game with mobile adaptations for convenience and modern gameplay.

**Categories:**

| Color | Category | Core Focus |
|-------|----------|------------|
| Blue | The World Outside | Game maps, landmarks, anime settings |
| Pink | Pop Culture & Streaming | Streamers, memes, Marvel, YouTubers |
| Yellow | Milestones & Myths | Tech history, ancient warriors, battles |
| Purple | Animation and Artwork | Comics, graphic novels, artists |
| Green | Tech, Space & Logic | AI, astronomy, apex predators |
| Orange | Sports & Gaming | Pro sports, college sports, esports |

**Architecture:** Monorepo (Turborepo + pnpm workspaces) — `apps/mobile` (Expo), `apps/generator` (Next.js), `packages/types` (shared Zod schemas).

---

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Game conductor model | Enables social, screen-sharing gameplay without everyone having a device | ✓ Good |
| 6 adapted categories | Familiar structure from Trivial Pursuit, themed for modern interests | ✓ Good |
| Monorepo structure | Contract-first development, shared types between mobile and web | ✓ Good |
| Zod-first schemas | Single source of truth for validation, TypeScript types derived automatically | ✓ Good |
| WatermelonDB for packs | Offline-first pack caching, lazy-loading queries | ✓ Good |
| Ollama-only generation | Simple single-provider setup, AI SDK for future swap | ✓ Good |
| Pack selection before setup | Clear flow: home → pack → setup → game | ✓ Good |
| Built-in default pack | 120 questions bundled, no download required to start | ✓ Good |
| Streak-based turns (v4.0) | Correct continues turn, incorrect passes — removes die/board complexity | ✓ Good |
| Championship mode (v4.0) | All 6 categories → 1 final question to win — clear win condition | ✓ Good |
| Per-player pack (v4.0) | Each player uses different pack; questions drawn from player's pack | ✓ Good |
| Die roll removed (v4.0) | Category selection replaces die roll; simplified game flow | ✓ Good |
| Draft JSON workflow (v5.0) | generate writes immediately, review decouples inspection and publish | ✓ Good |
| effectiveDifficulties pattern (v5.0) | Per-player difficulty overrides game-level; null falls back to game default | ✓ Good |
| playerDifficulties snapshot (v5.0) | Mirrors playerPackIds pattern — immutable in-game state | ✓ Good |

## Constraints

- **Platform:** Mobile-first design (phone screen size)
- **Social:** Designed for in-person group play, not solo or remote play
- **Simplicity:** Low friction to start playing — minimal setup
- **Offline-first:** No network dependency for core gameplay

---
*Last updated: 2026-06-13 after v5.0 milestone*
