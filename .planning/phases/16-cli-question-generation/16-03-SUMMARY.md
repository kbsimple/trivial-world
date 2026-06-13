---
phase: 16-cli-question-generation
plan: "03"
subsystem: cli-generator
tags:
  - cli
  - commander
  - readline
  - review
  - publish
  - pack-index
dependency_graph:
  requires:
    - draft.ts helper library (plan 16-02)
    - DraftPack / DraftQuestion interfaces (plan 16-02)
    - tidbits field in QuestionSchema (plan 16-01)
    - calculateChecksum / generatePackId / getCurrentTimestamp (apps/generator/lib/pack/export.ts)
    - QuestionPackSchema / PackIndexEntrySchema (packages/types)
  provides:
    - review.ts CLI entrypoint (apps/generator/scripts/review.ts)
    - Interactive draft review: approve / edit / reject / skip per question
    - Pack publish: validated QuestionPack JSON written to public/packs/
    - Pack index registration: public/api/v1/packs.json mutated with new entry
  affects:
    - apps/generator/public/packs/ (new pack files written here at publish time)
    - apps/generator/public/api/v1/packs.json (mutated to add PackIndexEntry)
tech_stack:
  added: []
  patterns:
    - readline createInterface for interactive terminal prompts
    - Commander .argument() for positional CLI arg
    - Two-pass pack write (placeholder size then actual byte count)
    - Read-mutate-write for pack index update (idempotent by id)
key_files:
  created:
    - apps/generator/scripts/review.ts
  modified: []
decisions:
  - "Pack size computed as two-pass: write placeholder (0), stat for actual bytes, re-write with real size"
  - "checksum computed over JSON.stringify(approved) — matches packDownloader.ts verification logic"
  - "schemaVersion '1.0.0' preserved unchanged — tidbits optional so existing packs remain valid"
  - "NEXT_PUBLIC_OLLAMA_URL excluded — review.ts uses no env vars (no generation calls)"
  - "Pack index update is idempotent: replaces existing entry by id if present, else appends"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-13"
  tasks_completed: 1
  files_changed: 1
---

# Phase 16 Plan 03: CLI Review and Publish — Summary

## One-liner

Interactive terminal review CLI (`pnpm review <draft-file>`) presents each pending DraftQuestion for approve/edit/reject/skip, then publishes approved questions into a validated QuestionPack JSON written to public/packs/ and registers it in public/api/v1/packs.json.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create review.ts interactive CLI | 99a84ba | apps/generator/scripts/review.ts |

## What Was Built

### review.ts Interactive CLI (apps/generator/scripts/review.ts)

Full interactive review and publish pipeline:

```
pnpm review <draft-file>
```

Key behaviors:

**Review loop:**
- Reads draft with `readDraft(draftPath)` from plan 16-02's draft.ts
- Skips non-pending questions (resume-safe — already approved/rejected questions are shown in summary but not re-prompted)
- For each pending question: prints question text, answer, tidbits, difficulty, and verification confidence score
- Accepts `[a]pprove`, `[e]dit`, `[r]eject`, `[s]kip` (plus full words)
- Edit mode: prompts for questionText, answerText, tidbits; press Enter to keep current value; confirm with y/n; saves as `editedQuestion` on the DraftQuestion with status `'approved'`
- Calls `writeDraft(draftPath, draft)` after each question — partial review progress survives interruption

**Publish step:**
- Requires at least 20 approved questions (enforced in two places: pre-prompt check and inside publishDraft)
- Prompts for pack name (default: `${topic} Trivia Pack`), author, description
- Generates pack id via `generatePackId()`, timestamp via `getCurrentTimestamp()`
- Computes SHA-256 checksum via `calculateChecksum(JSON.stringify(approved))` — consistent with packDownloader.ts
- Builds slug and filename: `<slug>-<uuid8>.json`
- Constructs QuestionPack with `schemaVersion: '1.0.0'` and `contentEncoding: 'identity'`
- Validates via `QuestionPackSchema.safeParse()` before writing
- Two-pass write: write with size=0, stat for actual bytes, re-write with correct size
- Mutates `public/api/v1/packs.json`: reads index, replaces existing entry by id (idempotent) or appends, writes back
- Prints publish summary with pack file path, index path, question count, and download URL

### Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-16-03-01 | `calculateChecksum(JSON.stringify(approved))` — SHA-256 over questions JSON matching packDownloader.ts expectation |
| T-16-03-03 | Two-layer enforcement: `approved.length < 20` check in publishDraft + `approvedCount < 20` guard before publish prompt; `QuestionPackSchema.min(20)` provides third check via safeParse |

## Test Results

- 87 generator tests: all pass (no regressions)
- TypeScript: no errors in scripts/review.ts; pre-existing errors in verification.test.ts (unchanged file, OllamaProvider type mismatch) are acceptable per CLAUDE.md

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — review.ts is fully functional. The `draftPath` parameter in publishDraft is retained for future use (e.g., archiving the draft after publish) with a `void draftPath` suppression.

## Threat Flags

No new security surface beyond what was declared in the plan's threat model.

## Self-Check: PASSED

Files exist:
- apps/generator/scripts/review.ts — FOUND (262 lines)

Content checks:
- `grep "readDraft"` — FOUND (import line 27, usage line 219)
- `grep "writeDraft"` — FOUND (import line 27, usage line 239 inside review loop)
- `grep "calculateChecksum"` — FOUND (import line 26, usage line 127)
- `grep "QuestionPackSchema.safeParse"` — FOUND (line 159)
- `grep "packs.json"` — FOUND (comment line 18, INDEX_PATH line 33)
- `grep "trivial-world-generator.netlify.app"` — FOUND (line 31)
- `grep "schemaVersion.*1.0.0"` — FOUND (line 151)
- `grep "NEXT_PUBLIC"` — NOT FOUND (correct)

Commits exist:
- 99a84ba (feat 16-03 Task 1)
