---
phase: 03-question-system
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - apps/mobile/stores/questionStore.ts
  - apps/mobile/data/questions/index.ts
  - apps/mobile/data/questions/world-outside.ts
  - apps/mobile/data/questions/pop-culture.ts
  - apps/mobile/data/questions/milestones-myths.ts
  - apps/mobile/data/questions/animation-artwork.ts
  - apps/mobile/data/questions/tech-space-logic.ts
  - apps/mobile/data/questions/sports-gaming.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-06-09T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the question system implementation including the Zustand store for question management and static question data files for all six categories. Found one critical issue related to type safety, three warnings related to error handling and potential bugs, and two informational items. The question data files are well-structured, but the store implementation has some concerns around type handling and error scenarios.

## Critical Issues

### CR-01: Unsafe Type Assertion with `any` in Query Results

**File:** `apps/mobile/stores/questionStore.ts:94-111`
**Issue:** The code uses `any[]` for the questions array and then casts query results with `(q as any).difficulty`. This bypasses TypeScript's type checking and could lead to runtime errors if the WatermelonDB schema changes or returns unexpected data. The `difficulty` property access could return `undefined` unexpectedly, and the filter logic could silently fail or behave incorrectly.

```typescript
// Current problematic code:
let questions: any[] = [];
// ...
questions = questions.filter(q => {
  const qDifficulty = (q as any).difficulty;
  return qDifficulty && enabledDifficulties.includes(qDifficulty as Difficulty);
});
```

**Fix:**
Define a proper type for WatermelonDB question records or use the QuestionModelType consistently:

```typescript
// Use the already-defined QuestionModelType
const questions: QuestionModelType[] = await query.fetch();

// Then access properties through the model instance
if (enabledDifficulties && enabledDifficulties.length > 0) {
  questions = questions.filter(q => {
    const qDifficulty = q.difficulty;
    return qDifficulty && enabledDifficulties.includes(qDifficulty as Difficulty);
  });
}
```

## Warnings

### WR-01: Inconsistent Type Usage Between PlayerColor and Category

**File:** `apps/mobile/stores/questionStore.ts:76`
**Issue:** The `selectQuestion` function accepts `PlayerColor` as its parameter, but then casts it to `Category` when checking against `enabledCategories`. While `PlayerColor` and `Category` appear to have overlapping values (both include 'blue', 'pink', etc.), this type mismatch could cause issues if the types diverge. The cast `category as Category` silently assumes the types are compatible.

**Fix:**
Either unify the types or add explicit validation:

```typescript
// Option 1: Validate category is valid Category value
import { Category } from '@trivial-world/types';

// At the top with other validation:
const validCategory = category as Category; // Explicit after confirming types align
if (enabledCategories && !enabledCategories.includes(validCategory)) {
  console.warn(`Category ${category} is disabled`);
  return null;
}
```

### WR-02: Silent Failure When Marking Non-Existent Questions

**File:** `apps/mobile/stores/questionStore.ts:156-164`
**Issue:** The `markAsked` function silently does nothing if the question is not found in the database (`questions.length === 0`). This could mask bugs where a question ID is incorrect or the question was deleted. The function should either throw an error or return a boolean indicating success/failure.

**Fix:**
Return a boolean to indicate success:

```typescript
markAsked: async (questionId: string): Promise<boolean> => {
  // ... existing code ...
  
  if (questions.length === 0) {
    console.warn(`Question ${questionId} not found when attempting to mark as asked`);
    return false;
  }
  
  // ... mark logic ...
  return true;
}
```

### WR-03: Missing Null Check in resetAskedQuestions

**File:** `apps/mobile/stores/questionStore.ts:195-200`
**Issue:** The `resetAskedQuestions` function iterates over `allQuestions` and calls `update` on each, but doesn't handle the case where the update fails for individual questions. If the database write fails partway through, some questions will have `askedAt` reset while others won't, leaving the game in an inconsistent state.

**Fix:**
Consider wrapping in a transaction or adding error recovery:

```typescript
await database.write(async () => {
  for (const q of allQuestions) {
    try {
      await (q as QuestionModelType).update((question: any) => {
        question.askedAt = undefined;
      });
    } catch (error) {
      console.error(`Failed to reset question ${q.questionId}:`, error);
      // Decide: continue or abort?
    }
  }
});
```

## Info

### IN-01: Dynamic Imports in Every Function Call

**File:** `apps/mobile/stores/questionStore.ts:61-64, 147-150, 172-175`
**Issue:** Each function (`selectQuestion`, `markAsked`, `resetAskedQuestions`) performs dynamic imports on every invocation. While this avoids circular dependencies, it adds overhead to each call. For a game that may call these frequently, this could impact performance.

**Fix:**
Consider moving the imports to module scope with a lazy initialization pattern, or accept the trade-off if circular dependency prevention is the priority. This is informational since the current approach works correctly.

### IN-02: Console Usage Instead of Proper Logging

**File:** `apps/mobile/stores/questionStore.ts:71, 77, 88, 116, 140, 166, 203`
**Issue:** The code uses `console.error` and `console.warn` throughout. In production, these should ideally be replaced with a proper logging mechanism that can be configured for different environments (development vs production) and potentially send errors to a monitoring service.

**Fix:**
Consider creating a logger utility:

```typescript
// utils/logger.ts
export const logger = {
  error: (message: string, error?: unknown) => {
    if (__DEV__) console.error(message, error);
    // In production: send to monitoring service
  },
  warn: (message: string) => {
    if (__DEV__) console.warn(message);
  },
};
```

---

_Reviewed: 2026-06-09T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_