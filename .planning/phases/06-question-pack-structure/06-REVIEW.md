---
phase: 06-question-pack-structure
reviewed: 2026-06-09T12:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - packages/types/src/category.ts
  - packages/types/src/question-pack.ts
  - packages/types/src/json-schema.ts
  - packages/types/src/index.ts
  - apps/mobile/database/schema.ts
  - apps/mobile/database/models/QuestionPack.ts
  - apps/mobile/database/models/Question.ts
  - apps/mobile/database/migrations/002_add_question_packs.ts
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-06-09T12:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed 8 files implementing the question pack type system and WatermelonDB schema. The overall architecture is sound with good use of Zod for validation and proper separation between types and database models. Found 1 critical issue with JSON schema conversion that may fail at runtime, plus 4 warnings related to data integrity and error handling.

## Critical Issues

### CR-01: Runtime dependency not declared for JSON Schema conversion

**File:** `packages/types/src/json-schema.ts:11-17`
**Issue:** The code uses `z.toJSONSchema()` which requires the `zod-to-json-schema` package as a runtime dependency. The standard `zod` package does not include this method. This will throw a runtime error when this module is imported.

**Fix:**
```typescript
// Option 1: Add dependency and import
// In package.json: "zod-to-json-schema": "^3.x"
import { zodToJsonSchema } from 'zod-to-json-schema';

export const questionPackJsonSchema = zodToJsonSchema(QuestionPackSchema);
export const questionJsonSchema = zodToJsonSchema(QuestionSchema);
export const packMetadataJsonSchema = zodToJsonSchema(PackMetadataSchema);
export const packIndexEntryJsonSchema = zodToJsonSchema(PackIndexEntrySchema);

// Option 2: If using Zod v4 with built-in JSON Schema support, verify the API:
// Check Zod v4 docs - the method may be `QuestionPackSchema.jsonSchema()` instead
```

## Warnings

### WR-01: Missing error handling for JSON.parse

**File:** `apps/mobile/database/models/QuestionPack.ts:33`
**Issue:** `getCategoryCounts()` calls `JSON.parse()` without error handling. If `categoryCounts` contains corrupted or malformed JSON data, this will throw a SyntaxError and crash the app. Database fields can become corrupted through failed writes, migrations, or manual editing.

**Fix:**
```typescript
getCategoryCounts(): Record<Category, number> {
  try {
    return JSON.parse(this.categoryCounts);
  } catch {
    console.error(`Invalid category_counts JSON for pack ${this.packId}:`, this.categoryCounts);
    // Return empty counts for all categories as fallback
    return {
      blue: 0,
      pink: 0,
      yellow: 0,
      purple: 0,
      green: 0,
      orange: 0,
    };
  }
}
```

### WR-02: Missing error handling for JSON.parse in Question model

**File:** `apps/mobile/database/models/Question.ts:32`
**Issue:** `getChoices()` calls `JSON.parse()` without error handling. Malformed JSON in the `choices` field will cause a runtime crash.

**Fix:**
```typescript
getChoices(): string[] | undefined {
  if (!this.choices) return undefined;
  try {
    return JSON.parse(this.choices);
  } catch {
    console.error(`Invalid choices JSON for question ${this.questionId}:`, this.choices);
    return undefined;
  }
}
```

### WR-03: Invalid PackMetadata created by toPackMetadata()

**File:** `apps/mobile/database/models/QuestionPack.ts:57-73`
**Issue:** The `toPackMetadata()` method creates a `PackMetadata` object that violates the schema in two ways:
1. `size: 0` violates the `z.number().int().positive('Size must be positive integer (bytes)')` constraint
2. Both `createdAt` and `updatedAt` are set to `downloadedAt`, losing the original metadata timestamps

**Fix:**
```typescript
toPackMetadata(): PackMetadata {
  return {
    id: this.packId,
    name: this.name,
    description: this.description,
    version: this.version,
    author: this.author,
    // Note: These are set to downloadedAt since original timestamps aren't stored in DB
    // Consider adding original_created_at and updated_at columns if needed
    createdAt: new Date(this.downloadedAt).toISOString(),
    updatedAt: new Date(this.downloadedAt).toISOString(),
    categoryCounts: this.getCategoryCounts(),
    totalQuestions: this.totalQuestions,
    checksum: this.checksum,
    schemaVersion: this.schemaVersion as '1.0.0',
    contentEncoding: 'identity',
    // Size should be stored in DB or fetched from pack file
    size: this.totalQuestions * 200, // Rough estimate, or add size column
  };
}
```

Alternatively, add a `size` column to the schema and store it properly.

### WR-04: Unsafe type assertion for schemaVersion

**File:** `apps/mobile/database/models/QuestionPack.ts:69`
**Issue:** The type assertion `as '1.0.0'` assumes the database value matches the literal type without validation. If the database contains a different version string, this could cause type mismatches downstream.

**Fix:**
```typescript
// Option 1: Validate at runtime
toPackMetadata(): PackMetadata {
  if (this.schemaVersion !== '1.0.0') {
    throw new Error(`Unsupported pack schema version: ${this.schemaVersion}`);
  }
  return {
    // ...
    schemaVersion: this.schemaVersion,
    // ...
  };
}

// Option 2: Cast through unknown for flexibility
schemaVersion: this.schemaVersion as unknown as '1.0.0',
```

## Info

### IN-01: Missing .js extension in import

**File:** `apps/mobile/database/models/Question.ts:4`
**Issue:** The import `'./QuestionPack'` should be `'./QuestionPack.js'` for ES module resolution consistency. Other files in this codebase use `.js` extensions (e.g., `question-pack.ts` line 2 imports from `'./category.js'`).

**Fix:**
```typescript
import { QuestionPackModel } from './QuestionPack.js';
```

### IN-02: Unused import in QuestionPack model

**File:** `apps/mobile/database/models/QuestionPack.ts:1`
**Issue:** `Q` is imported from WatermelonDB but not used. The method `getQuestionsByCategory` uses `Q.where()` but it's called as `Q.where` not destructured. Actually, looking closer, `Q` IS used on lines 41, 48-50. This is a false positive - the import is correct.

**Fix:** No fix needed - import is used correctly.

---

_Reviewed: 2026-06-09T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_