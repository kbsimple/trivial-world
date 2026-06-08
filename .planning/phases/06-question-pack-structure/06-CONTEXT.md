# Phase 6: Question Pack Structure - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **question pack data structure with versioning and validation** — TypeScript types, Zod schemas, JSON Schema export, and WatermelonDB schema for offline pack storage.

**In scope:**
- Zod schemas for question packs with versioning
- TypeScript types derived from Zod schemas
- JSON Schema export for non-TypeScript validation
- WatermelonDB tables for question_packs and questions
- Monorepo structure with shared `@trivial-world/types` package
- Schema versioning strategy (additive-only changes)

**Out of scope:**
- Question generator web app (Phase 7)
- Pack download/sync service (Phase 7)
- Game configuration UI (Phase 8)
- Migration of existing 120 hardcoded questions (deferred)
- AI question generation (Phase 7)

</domain>

<decisions>
## Implementation Decisions

### Monorepo Structure

- **D-01:** Full monorepo with Turborepo, pnpm workspaces, and shared `@trivial-world/types` package. Clean separation between mobile app (`apps/mobile`) and generator web app (`apps/generator`). Both apps depend on the shared types package for single source of truth.

### Existing Question Migration

- **D-02:** Defer migration decision until user reviews existing 120 questions. The schema will be designed to support any migration approach. Options after review: (a) create "Trivial World Classic" default pack, (b) keep as fallback, (c) migrate incrementally.

### Pack Identity Model

- **D-03:** UUID-based pack identifiers (`pack_id: string (UUID)`). Standard UUID v4 format for database primary keys and API references. Individual questions use URL-safe IDs (`id: string` matching pattern `^[a-z0-9-]+$`).

### Multi-pack Support

- **D-04:** Single active pack per game session. Schema tracks `is_active: boolean` on pack model. Simpler asked-tracking (one active pack = one asked set). Players switch packs between games, not during.

### Schema Versioning

- **D-05:** Schema version field in every pack (`schemaVersion: "1.0.0"`). Additive-only changes — never remove fields, only add optional ones. Breaking changes require new major version with migration guide.

### Claude's Discretion

- Turborepo configuration details (pipeline, caching)
- pnpm workspace setup
- WatermelonDB model field naming conventions
- Zod schema refinements (min/max lengths, patterns)
- JSON Schema export format (JSON Schema 7 or 2020-12)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, categories, v2.0 milestone goals
- `.planning/REQUIREMENTS.md` — PACK-01 through PACK-05 requirements
- `.planning/ROADMAP.md` — Phase 6 definition and success criteria

### Research
- `.planning/research/ARCHITECTURE.md` — Monorepo structure, Zod schemas, WatermelonDB schema, contract-first development pattern
- `.planning/research/STACK.md` — Zod 4.x, WatermelonDB, Turborepo configuration
- `.planning/research/SUMMARY.md` — Phase ordering rationale, critical pitfalls

### Prior Phase Context
- `.planning/phases/05-state-persistence/05-CONTEXT.md` — Zustand persist patterns, offline-first principles

### Key Code References
- `types/question.ts` — Current Question interface (to be replaced by Zod schema)
- `data/questions/index.ts` — Current hardcoded question structure (migration source)
- `stores/questionStore.ts` — Current question selection logic (will query WatermelonDB)
- `constants/categories.ts` — PlayerColor type and CATEGORY_NAMES (shared with pack schema)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **PlayerColor type:** Already defined in `constants/categories.ts` — can be imported into pack schema
- **CATEGORY_NAMES:** Human-readable category names already exist — pack schema should reference these
- **Zustand persist pattern:** Established in `questionStore.ts` — WatermelonDB will replace for pack storage

### Established Patterns
- **Question interface:** Simple structure with `id`, `category`, `questionText`, `answerText`, optional `difficulty`
- **Category filtering:** `enabledCategories` in questionStore — pack schema should support category enable/disable
- **Asked tracking:** Set<string> in questionStore — will need pack-scoped tracking

### Integration Points
- **Monorepo migration:** Current single-package app needs restructuring into `apps/mobile/`, `apps/generator/`, `packages/types/`
- **WatermelonDB setup:** New dependency — `database/schema.ts`, `database/models/`, `database/index.ts`
- **Types package:** New `packages/types/` with Zod schemas, TypeScript exports, JSON Schema

### Critical Changes
- **`types/question.ts`:** Will be replaced by Zod schema in `packages/types/src/question-pack.ts`
- **`data/questions/`:** Will remain as-is for now (migration deferred per D-02)
- **`stores/questionStore.ts`:** Will query WatermelonDB instead of `getQuestionsByCategory()`

</code_context>

<specifics>
## Specific Ideas

- Pack metadata should include author name, version, and creation date for browsing
- Category counts in pack metadata help users understand pack composition
- Checksum (SHA-256) in pack metadata ensures download integrity
- Questions should support optional difficulty field (existing pattern)
- Pack version uses SemVer (e.g., "1.0.0", "1.1.0")

</specifics>

<deferred>
## Deferred Ideas

### Migration of Existing Questions
- User wants to review the 120 existing questions before deciding how to package them
- Options after review: "Classic" default pack, fallback source, or incremental migration
- Schema design must support any chosen migration approach

</deferred>

---

*Phase: 06-question-pack-structure*
*Context gathered: 2026-06-08*