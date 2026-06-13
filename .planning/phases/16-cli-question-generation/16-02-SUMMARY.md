---
phase: 16-cli-question-generation
plan: "02"
subsystem: cli-generator
tags:
  - cli
  - commander
  - tsx
  - draft
  - question-generation
dependency_graph:
  requires:
    - tidbits field in QuestionSchema (plan 16-01)
  provides:
    - generate.ts CLI entrypoint (apps/generator/scripts/generate.ts)
    - draft.ts helper library (apps/generator/scripts/lib/draft.ts)
    - DraftPack / DraftQuestion interfaces for draft file format
    - npm scripts: generate, review in apps/generator/package.json
  affects:
    - apps/generator/package.json (new scripts + devDeps)
    - apps/generator/tsconfig.json (scripts/** added to include)
tech_stack:
  added:
    - commander@^15.0.0 (CLI argument parsing)
    - tsx@^4.22.4 (TypeScript CLI runner)
  patterns:
    - Incremental draft file writes (append per question, not batch)
    - OLLAMA_URL env var (not NEXT_PUBLIC_) for Node.js CLI context
    - ESM .js extensions for Node.js import resolution under tsx
key_files:
  created:
    - apps/generator/scripts/generate.ts
    - apps/generator/scripts/lib/draft.ts
    - apps/generator/scripts/drafts/.gitkeep
    - apps/generator/.gitignore
  modified:
    - apps/generator/package.json
    - apps/generator/tsconfig.json
decisions:
  - Use OLLAMA_URL (not NEXT_PUBLIC_OLLAMA_URL) — NEXT_PUBLIC_ is Next.js build-time only
  - Default model is qwen3.5 (not llama3.2 — llama3.2 not installed locally)
  - Draft files gitignored via scripts/drafts/*.json — drafts are transient dev artifacts
  - appendDraftQuestion called inside per-question loop for incremental writes
  - scripts/**/* added to tsconfig.json include so CLI files are type-checked
metrics:
  duration_minutes: 3
  completed_date: "2026-06-13"
  tasks_completed: 2
  files_changed: 7
---

# Phase 16 Plan 02: CLI Bulk Question Generation — Generate + Draft Summary

## One-liner

CLI entrypoint (`pnpm generate --topic <topic>`) generates trivia questions for all 6 categories via Ollama and incrementally appends each to a draft JSON file in scripts/drafts/.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install deps and create draft.ts helper | 4eaebb8 | apps/generator/package.json, apps/generator/.gitignore, apps/generator/scripts/lib/draft.ts, apps/generator/scripts/drafts/.gitkeep |
| 2 | Create generate.ts CLI entrypoint | 7724ffd | apps/generator/scripts/generate.ts, apps/generator/tsconfig.json |

## What Was Built

### draft.ts Helper Library (apps/generator/scripts/lib/draft.ts)

Provides the draft file I/O layer for the CLI pipeline:

- `DraftQuestion` interface: `{ question: Question; verification: ConfidenceScore; status: 'pending'|'approved'|'rejected'; editedQuestion?: Question }`
- `DraftPack` interface: `{ status: 'draft'; topic: string; generatedAt: string; questions: DraftQuestion[] }`
- `initDraft(topic, outputDir)` — creates empty draft JSON file immediately (visible before any questions arrive)
- `appendDraftQuestion(filePath, draftQuestion)` — read-modify-write to add one question; called inside generation loop
- `readDraft(filePath)` and `writeDraft(filePath, draft)` — for future review command use

### generate.ts CLI Entrypoint (apps/generator/scripts/generate.ts)

Full CLI with commander:

```
pnpm generate --topic "anime" [--count 10] [--model qwen3.5] [--ollama-url http://localhost:11434] [--output ./scripts/drafts]
```

Key behaviors:
- `--topic` is required (`requiredOption`)
- Generates all 6 categories: `['blue', 'pink', 'yellow', 'purple', 'green', 'orange']`
- Calls `generateAndVerifyQuestion(topic, category, undefined, undefined, model, ollamaUrl)` per question
- `sanitizeInput(opts.topic, 100)` applied before passing to prompt builder (T-16-02-01 mitigation)
- `--count` validated: integer 1-20 (T-16-02-03 mitigation)
- Uses `process.env.OLLAMA_URL` (not `NEXT_PUBLIC_OLLAMA_URL`) for CLI env var
- Draft file created via `initDraft` before any generation starts
- Each question appended via `appendDraftQuestion` immediately after it finishes
- Per-question failures are caught and counted (totalFailed); generation continues

### Package Updates (apps/generator/package.json)

Added devDependencies:
- `commander@^15.0.0`
- `tsx@^4.22.4`

Added npm scripts:
- `"generate": "tsx scripts/generate.ts"`
- `"review": "tsx scripts/review.ts"`

### TypeScript Coverage (apps/generator/tsconfig.json)

Added `"scripts/**/*"` to the tsconfig `include` array so generator's own `tsc --noEmit` covers CLI files. Pre-existing errors in `app/` (TS17004 JSX, TS2307 path aliases) are unchanged; no new errors in scripts files.

## Test Results

- 87 generator tests: all pass (no regressions)
- 211 mobile tests: all pass (no regressions)
- TypeScript: no new errors in scripts/ files
- Note: building `packages/types` (pnpm build) was required for tests to resolve @trivial-world/types; the dist/ directory is not committed to git

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added scripts/**/* to tsconfig include**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Generator's tsconfig.json did not include `scripts/**/*`, so CLI files were not type-checked by `tsc --noEmit` at all
- **Fix:** Added `"scripts/**/*"` to the `include` array in apps/generator/tsconfig.json
- **Files modified:** apps/generator/tsconfig.json
- **Commit:** 7724ffd

**2. [Rule 1 - Bug] Build packages/types before running generator tests**
- **Found during:** Task 2 test verification
- **Issue:** `packages/types/dist/` did not exist, causing 2 generator test suites to fail with "Failed to resolve entry for package @trivial-world/types"
- **Fix:** Ran `pnpm build` in packages/types to generate dist/. This restores the pre-existing 87-test pass state documented in Plan 01 SUMMARY
- **Files modified:** packages/types/dist/ (generated, not committed)
- **Note:** dist/ is not tracked in git; this is a build step required before running tests

## Known Stubs

None — no placeholder values or TODO fields. The CLI is fully functional pending an Ollama instance with qwen3.5 model available.

## Threat Flags

No new security surface beyond what was declared in the plan's threat model:

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-16-02-01 | sanitizeInput(opts.topic, 100) called before generateAndVerifyQuestion |
| T-16-02-02 | scripts/drafts/*.json added to .gitignore |
| T-16-02-03 | Count validated: parseInt + isNaN check + range 1-20 + process.exit(1) |

## Self-Check: PASSED

Files exist:
- apps/generator/scripts/generate.ts — contains `requiredOption('--topic`
- apps/generator/scripts/lib/draft.ts — contains `export interface DraftPack`
- apps/generator/scripts/drafts/.gitkeep — exists
- apps/generator/.gitignore — contains `scripts/drafts/*.json`
- apps/generator/package.json — contains `"generate": "tsx scripts/generate.ts"`

Commits exist:
- 4eaebb8 (feat Task 1)
- 7724ffd (feat Task 2)
