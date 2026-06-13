---
gsd_state_version: 1.0
milestone: v9.0
milestone_name: Per-Player Pack Selection Redesign
status: planned
last_updated: "2026-06-13T23:38:00.000Z"
stopped_at: null
resume_file: null
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 2
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-13)

**Core value:** Enable in-person social trivia gameplay where the app supports (not replaces) human interaction — the game conductor reads questions aloud and players move together.
**Current focus:** v8.0 Pack Selection UX Overhaul — COMPLETE. Archived 2026-06-13.

## Current Position

Milestone v9.0 started 2026-06-13. Phase 21 planned (2 plans ready).
21 total phases across 9 milestones. 288 tests passing.
Ready to execute Phase 21.

Progress: [░░░░░░░░░░░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 47
- v1.0: 10 plans (~65 min execution)
- v2.0: 11 plans (~48 hours)
- v3.0 + v4.0 + v5.0: combined ~1 day execution
- v6.0: 4 plans (~1 session execution)
- v7.0: 1 plan (~3 min execution)
- v8.0: 2 plans (~1 session execution)
- Milestone archive: .planning/milestones/

## Accumulated Context

### Roadmap Evolution

- Phase 18 added: Pack Combos — allow mixing and matching multiple question packs; a combo is a named blend selectable at game or per-player level
- Phase 18 completed 2026-06-13
- Phase 19 added: Per-Player Pack Customization — top-level "Shared Pack" vs "Custom Per Player" toggle; replaces implicit per-player chips with an explicit intentional flow
- Phase 19 completed 2026-06-13; v7.0 archived
- Phase 20 added: Pack Selection UX Overhaul — per-player Shared/Custom chip on player row, unified picker flow, conditional shared pack requirement
- Phase 20 completed 2026-06-13; v8.0 archived
- Phase 21 added: Per-Player Pack Selection Redesign — inline Shared/Custom toggle on player row, Custom navigates to /packs for that player's pack config, remove inline Alert/Modal pickers for packs and difficulty
- **v8.0 UX changes:** packMode removed from packStore; setup.tsx segmented control removed; per-player pack chip always visible alongside difficulty chip; allPlayersCustom bypass skips CONF-01 shared pack requirement

### Key Architectural Decisions

- Monorepo: Turborepo + pnpm workspaces (apps/mobile, apps/generator, packages/types)
- Zod-first schemas: single source of truth, TypeScript types derived automatically
- WatermelonDB: offline-first pack caching, schema v3 with tidbits migration
- Zustand 5.x: persist middleware, per-player state snapshotted at startGame()
- Expo Router: file-based navigation for mobile + web export
- Question provider abstraction: WatermelonDB (mobile) vs bundled questions (web)
- Per-player pack + difficulty: playerPackIds + playerDifficulties snapshotted at startGame()
- effectiveDifficulties pattern: per-player difficulty overrides game-level; null falls back
- **Pack Combos (v6.0):** packId ↔ comboId mutual exclusion at player level; playerPackIdLists drives multi-pack question pooling at runtime; savedCombos + activeComboId persisted in packStore
- **Per-Player Pack Mode (v7.0 → v8.0):** packMode removed in v8.0; setup screen now shows per-player pack chip always (not gated by a toggle); allPlayersCustom bypass in gameStore.startGame() skips CONF-01 if every player has a non-null packId or comboId

### Pending Todos

From Phase 18 code review (18-REVIEW.md):

- F-01 HIGH: deleteCombo leaves stale player.comboId in playerStore
- F-02 HIGH: resetAskedQuestions loop leaves activePackId corrupted on throw
- F-03 MEDIUM: combos.tsx has no ScrollView — Back button unreachable with many items

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260613-7a | Question screen vertical layout: top-anchor badge+question, footer-anchor reveal button | 2026-06-13 | e9025fa | [260613-7a-question-screen-vertical-layout](./quick/260613-7a-question-screen-vertical-layout/) |

### Blockers/Concerns

None blocking next milestone.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-06-13:

| Category | Item | Status | Notes |
|----------|------|--------|-------|
| uat | Phase 10: 10-HUMAN-UAT.md [automated] — 0 pending scenarios | pre-existing | From v3.0 |
| verification | Phase 10: 10-VERIFICATION.md [human_needed] | pre-existing | Netlify UAT deferred |
| verification | Phase 15: 15-VERIFICATION.md [human_needed] | pre-existing | Per-player pack manual testing |
| quick_task | 260613-7a-question-screen-vertical-layout [missing] | pre-existing | Quick task summary file missing |
| todo | 2026-06-10-add-e2e-tests-mobile-generator.md [testing] | pending | E2E test setup |
| todo | 2026-06-10-fix-e2e-console-listener-timing.md [testing] | pending | Test timing issue |
| todo | 2026-06-10-fix-netlify-transpilepackages.md [deployment] | pending | Netlify build config |
| todo | 2026-06-10-metro-resolver-watermelondb-mock.md [mobile] | pending | Metro resolver fix |
| todo | 2026-06-10-remove-nextjs-plugin-game-site.md [deployment] | pending | Next.js plugin cleanup |
| review | Phase 18: F-01 deleteCombo stale comboId [combo] | pending | High: clear player.comboId on deleteCombo |
| review | Phase 18: F-02 resetAskedQuestions corrupts activePackId on throw [combo] | pending | High: add try/finally restore |
| review | Phase 18: F-03 combos.tsx missing ScrollView [combo] | pending | Medium: wrap in ScrollView |
