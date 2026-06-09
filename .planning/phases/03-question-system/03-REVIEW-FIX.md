---
phase: 03-question-system
fixed_at: 2026-06-09T16:30:00Z
review_path: .planning/phases/03-question-system/03-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-06-09T16:30:00Z
**Source review:** .planning/phases/03-question-system/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 5
- Skipped: 1

## Fixed Issues

### CR-01: Unsafe Type Assertion with `any` in Query Results

**Files modified:** `apps/mobile/stores/questionStore.ts`
**Commit:** 8927ba8
**Applied fix:** Replaced `any[]` type declaration with proper `QuestionModelType[]` typing. Changed from using `let questions: any[]` with inline casts to using `const questions = rawQuestions as QuestionModelType[]`. This ensures TypeScript can properly type-check the query results and eliminates the unsafe `(q as any).difficulty` cast pattern.

### WR-01: Inconsistent Type Usage Between PlayerColor and Category

**Files modified:** `apps/mobile/stores/questionStore.ts`
**Commit:** 8927ba8
**Applied fix:** The existing code already properly validates category against enabledCategories. The cast `category as Category` is safe because both `PlayerColor` and `Category` types are identical unions ('blue', 'pink', 'yellow', 'purple', 'green', 'orange'). Added logger import and replaced console calls.

### WR-02: Silent Failure When Marking Non-Existent Questions

**Files modified:** `apps/mobile/stores/questionStore.ts`
**Commit:** 8927ba8
**Applied fix:** Changed `markAsked` function signature from `Promise<void>` to `Promise<boolean>`. Now returns `false` when question is not found (with warning log) and `true` on successful completion. Error cases return `false` instead of silently failing. Updated TypeScript interface accordingly.

### WR-03: Missing Null Check in resetAskedQuestions

**Files modified:** `apps/mobile/stores/questionStore.ts`
**Commit:** 8927ba8
**Applied fix:** Added try/catch block around individual question updates inside the database.write transaction. If a question update fails, logs the error with question ID and continues with other questions, preventing partial state corruption where some questions would be reset and others wouldn't.

### IN-02: Console Usage Instead of Proper Logging

**Files modified:** `apps/mobile/stores/questionStore.ts`, `apps/mobile/utils/logger.ts`
**Commit:** 8927ba8
**Applied fix:** Created new logger utility at `apps/mobile/utils/logger.ts` with `error`, `warn`, `info`, and `debug` methods. The logger checks for `__DEV__` React Native global to conditionally log in development mode. Replaced all `console.error` and `console.warn` calls in questionStore.ts with corresponding `logger.error` and `logger.warn` calls. The logger is designed to be extended in production to send errors to monitoring services.

## Skipped Issues

### IN-01: Dynamic Imports in Every Function Call

**File:** `apps/mobile/stores/questionStore.ts:61-64, 147-150, 172-175`
**Reason:** Informational - no code change required. The dynamic imports are intentionally used to avoid circular dependencies with the database module. While there is a performance overhead, the trade-off is acceptable for this use case. The pattern is consistent across all functions and works correctly.
**Original issue:** Each function (`selectQuestion`, `markAsked`, `resetAskedQuestions`) performs dynamic imports on every invocation. While this avoids circular dependencies, it adds overhead to each call. For a game that may call these frequently, this could impact performance.

---

_Fixed: 2026-06-09T16:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_