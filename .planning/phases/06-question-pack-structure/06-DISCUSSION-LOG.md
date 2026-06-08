# Phase 6: Question Pack Structure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 06-question-pack-structure
**Areas discussed:** Monorepo structure, Existing question migration, Pack identity model, Multi-pack support

---

## Monorepo Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Full monorepo | Turborepo + pnpm workspaces + shared types package | ✓ |
| Simple shared folder | Keep simple Expo app, add types folder with relative imports | |
| Types in mobile app | Generator imports via npm package or git submodule | |

**User's choice:** Full monorepo (Recommended)
**Notes:** Clean separation between mobile and generator apps. Research recommends this for type safety across apps.

---

## Existing Question Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Create default pack | Convert all 120 questions to "Trivial World Classic" pack in WatermelonDB | |
| Keep as fallback | Hardcoded questions as fallback if no packs installed | |
| Defer migration | Leave questions in code, migrate in future phase | ✓ |

**User's choice:** Defer until later — user wants to review questions before deciding how to pack them
**Notes:** Schema will be designed to support any migration approach chosen after review.

---

## Pack Identity Model

| Option | Description | Selected |
|--------|-------------|----------|
| UUID | Standard UUID (e.g., '550e8400-e29b-41d4-a716-446655440000') | ✓ |
| Slug-based IDs | Human-readable IDs (e.g., 'pop-culture-2020s') | |
| Nano IDs | Short random strings (e.g., 'abc123') | |

**User's choice:** UUID (Recommended)
**Notes:** Universally unique, no collisions, works well with database primary keys.

---

## Multi-pack Support

| Option | Description | Selected |
|--------|-------------|----------|
| Single pack per game | One active pack per game session | ✓ |
| Multiple packs active | Multiple packs can be active, questions drawn from all | |

**User's choice:** Single pack per game (Recommended)
**Notes:** Simpler schema, easier to reason about. Players switch packs between games, not during.

---

## Claude's Discretion

- Turborepo configuration details (pipeline, caching)
- pnpm workspace setup
- WatermelonDB model field naming conventions
- Zod schema refinements (min/max lengths, patterns)
- JSON Schema export format (JSON Schema 7 or 2020-12)

## Deferred Ideas

- Migration of existing 120 hardcoded questions — user wants to review questions first