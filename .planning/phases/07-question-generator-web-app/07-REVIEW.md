---
phase: 07-question-generator-web-app
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - apps/generator/app/page.tsx
  - apps/generator/app/review/page.tsx
  - apps/generator/app/packs/page.tsx
  - apps/generator/lib/ollama/client.ts
  - apps/generator/lib/ollama/prompts.ts
  - apps/generator/lib/ollama/verification.ts
  - apps/generator/lib/storage/local.ts
  - apps/generator/lib/pack/export.ts
  - apps/generator/hooks/useGenerator.ts
  - apps/generator/components/GeneratorForm.tsx
  - apps/generator/components/VerificationProgress.tsx
  - apps/generator/components/ConfidenceBadge.tsx
  - apps/generator/components/QuestionReviewCard.tsx
  - apps/generator/components/PackMetadataForm.tsx
  - apps/generator/components/DownloadPackButton.tsx
  - apps/generator/components/CategoryDistribution.tsx
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-06-09
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed 15 source files for the question generator web app. The codebase is generally well-structured with good TypeScript types, proper schema validation, and clear separation of concerns. Found 5 warnings (logic issues and edge cases) and 4 info-level suggestions (code quality improvements).

The app implements question generation via Ollama, verification passes, human review workflow, and pack export functionality. Key concerns include navigation logic issues, potential race conditions with localStorage, and incomplete error handling.

## Warnings

### WR-01: Navigation Logic Bug in Review Page

**File:** `apps/generator/app/review/page.tsx:40-49`
**Issue:** The `useEffect` that redirects on empty queue has a logic error. The effect checks `pendingQuestions.length === 0` inside an effect that only runs when `!isLoading && queue.length === 0`. The `pendingQuestions` calculation uses `queue.filter()` on an empty queue, which will always be empty. The commented intent suggests checking for no pending questions, but the condition `queue.length === 0` is checking total queue (including approved/rejected), not pending only.

**Fix:**
```tsx
// Current problematic logic:
useEffect(() => {
  if (!isLoading && queue.length === 0) {
    const pendingQuestions = queue.filter((q) => q.status === 'pending');
    if (pendingQuestions.length === 0) {
      // This block never executes meaningfully
    }
  }
}, [isLoading, queue]);

// Should be simplified - the check is redundant:
useEffect(() => {
  // No redirect needed - empty state is handled in render
  // This entire useEffect can be removed
}, [isLoading, queue]);
```

### WR-02: localStorage Race Condition in useGenerator Hook

**File:** `apps/generator/hooks/useGenerator.ts:112-121`
**Issue:** The `generateBatch` function writes to localStorage after each batch completes, but multiple simultaneous batches could interleave. The pattern reads existing, appends new, then writes - this is a classic race condition. If two batches complete simultaneously, one could overwrite the other's data.

**Fix:**
```ts
// Current problematic pattern:
const stored = localStorage.getItem('trivial-world-generator-queue');
const existing = stored ? JSON.parse(stored) : [];
localStorage.setItem(
  'trivial-world-generator-queue',
  JSON.stringify([...existing, ...newQuestions])
);

// Better: Use a queue manager or lock mechanism
// For simplicity, ensure only one batch at a time (already done with isGenerating)
// But the loadQueue function should also be called before batch starts
```

### WR-03: localStorage Write in approve/reject/edit Without Error Handling

**File:** `apps/generator/hooks/useGenerator.ts:157-203`
**Issue:** The `approve`, `reject`, and `edit` functions write to localStorage synchronously but don't have try-catch blocks for quota errors. The `saveApprovedQuestion` function in `local.ts` has proper error handling, but these functions do not.

**Fix:**
```ts
const approve = useCallback((id: string) => {
  setQueue((prev) => {
    const updated = prev.map((q) =>
      q.question.id === id ? { ...q, status: 'approved' as const } : q
    );
    // Add try-catch for localStorage operations
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('trivial-world-generator-queue', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to save queue state:', err);
      // Consider notifying user or recovering
    }
    return updated;
  });
}, []);
```

### WR-04: Potential XSS via Question Text/Answer in QuestionReviewCard

**File:** `apps/generator/components/QuestionReviewCard.tsx:268-277, 315-326`
**Issue:** User-generated content (question text, answer text) is rendered directly without sanitization. While React escapes by default, the content comes from LLM output which could potentially contain unexpected characters. The `sanitizeInput` function exists for prompts but not for displayed content.

**Fix:**
```tsx
// Consider adding a display sanitizer for extra safety
// Or use textContent pattern to ensure no HTML interpretation
// At minimum, document the assumption that LLM output is trusted
```
Note: This is a low-severity issue since React escapes by default. Only flagging for defense-in-depth consideration.

### WR-05: Memory Leak Potential with setTimeout in generateBatch

**File:** `apps/generator/hooks/useGenerator.ts:131`
**Issue:** `setTimeout(() => setProgress(null), 500)` is called without storing the timeout ID. If the component unmounts before the timeout fires, React will warn about setting state on unmounted component.

**Fix:**
```ts
// Store timeout ID and clear on unmount
const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// In generateBatch:
if (progressTimeoutRef.current) {
  clearTimeout(progressTimeoutRef.current);
}
progressTimeoutRef.current = setTimeout(() => setProgress(null), 500);

// Add useEffect cleanup:
useEffect(() => {
  return () => {
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
    }
  };
}, []);
```

## Info

### IN-01: Unused Variable in PackMetadataForm useEffect

**File:** `apps/generator/components/PackMetadataForm.tsx:92`
**Issue:** The `useEffect` dependency array lists `formValues.name, formValues.description, formValues.author, formIsValid` but the ESLint exhaustive-deps rule may warn. The function references `formValues` directly in conditions but uses individual properties in deps.

**Fix:**
```tsx
// Simplify by using the formValues object directly
useEffect(() => {
  onNameChange(formValues.name ?? '');
  onDescriptionChange(formValues.description ?? '');
  onAuthorChange(formValues.author ?? '');
  onValidityChange(formIsValid);
}, [formValues, formIsValid, onNameChange, onDescriptionChange, onAuthorChange, onValidityChange]);
```

### IN-02: Hardcoded Magic Number for Minimum Pack Size

**File:** `apps/generator/lib/pack/export.ts:79`
**Issue:** The minimum pack size of 20 questions is hardcoded in the export function. This value is also duplicated in `apps/generator/app/packs/page.tsx:116`. Consider centralizing this constant.

**Fix:**
```ts
// In a shared constants file:
export const MIN_PACK_QUESTIONS = 20;

// Then import and use consistently
if (approvedQuestions.length < MIN_PACK_QUESTIONS) {
  throw new Error(`Pack must have at least ${MIN_PACK_QUESTIONS} questions...`);
}
```

### IN-03: Console.log in Production Code

**File:** `apps/generator/app/packs/page.tsx:51-52`
**Issue:** `console.log` statements left in production code for `handleExportSuccess` and `handleExportError`. These should be removed or replaced with proper logging.

**Fix:**
```tsx
const handleExportSuccess = () => {
  // Consider: toast notification or success state instead
  // Or remove if no action needed
};
```

### IN-04: Incomplete Dependency Array in useGenerator useCallback

**File:** `apps/generator/hooks/useGenerator.ts:218-220, 225-227, 232-238`
**Issue:** `getPendingQuestions`, `getApprovedQuestions`, and `getQueueStats` use `queue` in their dependency arrays but they return computed values from `queue`. These functions recreate on every queue change, which may cause unnecessary re-renders in consuming components.

**Fix:**
```ts
// Consider using useMemo for computed values instead:
const pendingCount = useMemo(() => 
  queue.filter((q) => q.status === 'pending').length,
  [queue]
);

const approvedCount = useMemo(() => 
  queue.filter((q) => q.status === 'approved').length,
  [queue]
);
```

---

_Reviewed: 2026-06-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_