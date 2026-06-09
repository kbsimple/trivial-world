---
phase: 06-question-pack-structure
fixed_at: 2026-06-09T16:27:15Z
review_path: .planning/phases/06-question-pack-structure/06-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 5
skipped: 2
status: partial
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-06-09T16:27:15Z
**Source review:** .planning/phases/06-question-pack-structure/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 5
- Skipped: 2

## Fixed Issues

### WR-01: Missing error handling for JSON.parse

**Files modified:** `apps/mobile/database/models/QuestionPack.ts`
**Commit:** 90233fa
**Applied fix:** Added try/catch block around `JSON.parse()` in `getCategoryCounts()` method. Returns default empty counts for all categories on parse error, with console.error logging for debugging.

### WR-02: Missing error handling for JSON.parse in Question model

**Files modified:** `apps/mobile/database/models/Question.ts`
**Commit:** 90233fa
**Applied fix:** Added try/catch block around `JSON.parse()` in `getChoices()` method. Returns `undefined` on parse error with console.error logging.

### WR-03: Invalid PackMetadata created by toPackMetadata()

**Files modified:** `apps/mobile/database/models/QuestionPack.ts`
**Commit:** 90233fa
**Applied fix:** Changed `size: 0` to `size: this.totalQuestions * 200` (estimated ~200 bytes per question). Added TODO comment recommending adding a proper size column to the schema. Added comment documenting that timestamps are set to downloadedAt since original timestamps aren't stored in DB.

### WR-04: Unsafe type assertion for schemaVersion

**Files modified:** `apps/mobile/database/models/QuestionPack.ts`
**Commit:** 90233fa
**Applied fix:** Added runtime validation for `schemaVersion` at the start of `toPackMetadata()`. Throws descriptive error if version is not '1.0.0'. Removed unsafe `as '1.0.0'` type assertion since runtime validation ensures type safety.

### IN-01: Missing .js extension in import

**Files modified:** `apps/mobile/database/models/Question.ts`
**Commit:** 90233fa
**Applied fix:** Changed import from `'./QuestionPack'` to `'./QuestionPack.js'` for ES module resolution consistency with other files in the codebase.

## Skipped Issues

### CR-01: Runtime dependency not declared for JSON Schema conversion

**File:** `packages/types/src/json-schema.ts:11-17`
**Reason:** False positive - Zod v4 has built-in JSON Schema conversion
**Original issue:** The code uses `z.toJSONSchema()` which requires the `zod-to-json-schema` package as a runtime dependency.

**Analysis:** Verified that Zod v4.0.0 (installed in package.json) includes `z.toJSONSchema()` as a built-in method. TypeScript compilation passes without errors, confirming the API is available. The comment in the source file correctly states "Zod v4 includes built-in JSON Schema conversion via z.toJSONSchema()". No fix required.

### IN-02: Unused import in QuestionPack model

**File:** `apps/mobile/database/models/QuestionPack.ts:1`
**Reason:** False positive - import is used correctly
**Original issue:** `Q` is imported from WatermelonDB but not used.

**Analysis:** The REVIEW.md correctly identified this as a false positive. The `Q` import IS used on lines 41, 48-50 in methods like `getQuestionsByCategory()` and `getAvailableQuestions()`. No fix required.

---

_Fixed: 2026-06-09T16:27:15Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_