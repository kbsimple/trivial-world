---
phase: 06-question-pack-structure
plan: 02
subsystem: database
tags: [watermelondb, schema, models, offline-first]
dependency_graph:
  requires: [06-01]
  provides: [question_packs_table, questions_table, QuestionPackModel, QuestionModel]
  affects: [pack-store, question-store]
tech_stack:
  added:
    - "@nozbe/watermelondb@^6.0.0"
  patterns:
    - WatermelonDB schema v2
    - Model associations (has_many, belongs_to)
    - Lazy loading queries
key_files:
  created:
    - apps/mobile/database/schema.ts
    - apps/mobile/database/models/QuestionPack.ts
    - apps/mobile/database/models/Question.ts
    - apps/mobile/database/models/index.ts
    - apps/mobile/database/index.ts
  modified:
    - apps/mobile/package.json
decisions:
  - Schema version 2 for question packs tables (incremented from v1)
  - asked_at column for tracking asked questions per pack
  - category_counts stored as JSON string in WatermelonDB (no native record type)
  - Lazy loading via WatermelonDB queries with Q.where() extensions
metrics:
  duration: 10 minutes
  tasks_completed: 2
  files_created: 5
  files_modified: 1
completed_date: 2026-06-08
---

# Phase 6 Plan 2: WatermelonDB Schema & Models Summary

## One-Liner

Created WatermelonDB schema version 2 with question_packs and questions tables, plus model classes with lazy-loading queries and type converters.

## Completed Tasks

### Task 1: Create WatermelonDB schema for question_packs and questions tables

**Files created:**
- `apps/mobile/database/schema.ts`

**Implementation:**
- Schema version 2 (incremented from v1 for game state)
- `question_packs` table with all PackMetadata fields:
  - pack_id (UUID from pack metadata)
  - name, description, version, author
  - downloaded_at, checksum, is_active
  - category_counts (JSON string)
  - total_questions, schema_version
- `questions` table with foreign key:
  - question_pack_id (FK to question_packs)
  - question_id, category, question_text, answer_text
  - difficulty, choices, correct_choice_index
  - asked_at (timestamp for tracking)

### Task 2: Create WatermelonDB models for QuestionPack and Question

**Files created:**
- `apps/mobile/database/models/QuestionPack.ts`
- `apps/mobile/database/models/Question.ts`
- `apps/mobile/database/models/index.ts`
- `apps/mobile/database/index.ts`

**Implementation:**
- `QuestionPackModel` with:
  - `@children('questions')` relation for lazy loading
  - `getQuestionsByCategory(category)` action for category filtering
  - `getAvailableQuestions(category)` for unasked questions
  - `toPackMetadata()` converter to types package interface
- `QuestionModel` with:
  - `@relation('question_packs', 'question_pack_id')` to pack
  - `getChoices()` for JSON choices parsing
  - `toQuestion()` converter to types package interface
  - `markAsAsked()` for tracking asked questions
- Model exports and database instance setup

## Deviations from Plan

None - plan executed exactly as written.

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/database/schema.ts` | Created | WatermelonDB schema v2 with question_packs and questions tables |
| `apps/mobile/database/models/QuestionPack.ts` | Created | Model for question packs with lazy-loading relations |
| `apps/mobile/database/models/Question.ts` | Created | Model for questions with pack relation and asked tracking |
| `apps/mobile/database/models/index.ts` | Created | Model class exports for WatermelonDB |
| `apps/mobile/database/index.ts` | Created | Database instance with schema and models |
| `apps/mobile/package.json` | Modified | Added @nozbe/watermelondb dependency |

## Integration Points

The models integrate with `@trivial-world/types` package:
- Import `Category`, `Difficulty`, `Question`, `PackMetadata` types
- Use Zod-validated types in `toQuestion()` and `toPackMetadata()` converters

## Threat Mitigations

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-06-05 | Checksum stored in question_packs table for integrity verification | Implemented |
| T-06-06 | asked_at timestamp for tracking (UI state, not audit trail) | Implemented |
| T-06-07 | Lazy loading via WatermelonDB queries prevents memory exhaustion | Implemented |

## Self-Check

- [x] Schema version is 2
- [x] question_packs table has all required columns
- [x] questions table has foreign key to question_packs
- [x] Models compile with WatermelonDB decorators
- [x] @relation and @children decorators correctly configured
- [x] TypeScript types from @trivial-world/types used in models

## Next Steps

Per ROADMAP.md, next plan (06-03) should:
- Create pack download service using schema
- Implement pack validation with Zod schemas
- Add checksum verification on download