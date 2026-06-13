---
phase: 15-per-player-pack-selection
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - apps/mobile/types/player.ts
  - apps/mobile/types/game.ts
  - apps/mobile/stores/playerStore.ts
  - apps/mobile/stores/gameStore.ts
  - apps/mobile/stores/questionStore.ts
  - apps/mobile/app/game/setup.tsx
  - apps/mobile/app/game/turn.tsx
  - apps/mobile/stores/playerStore.test.ts
  - apps/mobile/stores/gameStore.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This phase adds per-player pack selection: a `packId` field on `Player`, snapshotted `playerPackIds` and `playerCategories` arrays in `GameState`, and the plumbing to derive per-player question pools at game start. The `setup.tsx` screen gains a per-player pack chip for native, and `turn.tsx` uses the snapshotted `playerCategories` for the category grid and progress strip.

The overall design is sound. Four warnings stand out: (1) `startGame` navigates the router before `await`ing the async store action, so errors are silently swallowed and the player lands on the turn screen with a half-initialized game state; (2) `questionStore.resetAskedQuestions` only resets the game-level `activePackId` pack on the web path — per-player packs are never cleared there; (3) the web path in `selectQuestion` ignores the `packId` argument entirely, so per-player packs have no effect on web; and (4) championship detection in `markAnswer` reads `playerCategories` from a second `get()` call, creating a stale-read window. Three info items cover dead-code in the type definition, a whitespace-only name edge case, and a missing `packId` field on the mock player factory in the game store tests.

## Warnings

### WR-01: Router navigates before async `startGame` resolves

**File:** `apps/mobile/app/game/setup.tsx:132-133`

**Issue:** `handleStartGame` calls `startGame()` (an `async` function returning a `Promise<void>`) without `await`, then immediately calls `router.replace('/game/turn')`. If `startGame` rejects (e.g., `resetAskedQuestions` throws) the game falls through to the error handler in `gameStore.ts:113` and sets `phase` back to `'setup'`, but the user is already on the turn screen staring at an unpopulated game. The `catch` branch inside `startGame` also suppresses the error, so the UI shows no feedback.

**Fix:**
```tsx
// setup.tsx handleStartGame — await the action
const handleStartGame = async () => {
  if (!activePackId) { /* ... existing alert ... */ return; }
  if (players.length === 0) { /* ... existing alert ... */ return; }

  await startGame();

  // Only navigate if the game actually started
  if (useGameStore.getState().phase === 'selecting') {
    router.replace('/game/turn');
  } else {
    Alert.alert('Error', 'Failed to start game. Please try again.');
  }
};
```

### WR-02: Web path in `questionStore.resetAskedQuestions` ignores per-player packs

**File:** `apps/mobile/stores/questionStore.ts:193-196`

**Issue:** The web branch of `resetAskedQuestions` unconditionally clears the single `askedQuestionIds` array and returns. However, `gameStore.startGame` (lines 86-91) only calls `resetAskedQuestions` once for each unique `packId` used in the game. On web the `askedQuestionIds` array is shared across all packs — there is only one list — so this is technically correct structurally, but the loop in `gameStore` still calls `usePackStore.setState({ activePackId: pid })` to temporarily swap the active pack even on web, where it has no effect on the reset. This is a latent correctness issue: if a second game starts and players use different packs, previously-asked question IDs from pack A remain in the list when pack B questions are being looked up. Because the web path filters by `askedQuestionIds` regardless of pack (see `getNextQuestion` usage at line 67), exhausted IDs from another pack can never be selected again.

The real fix requires the web `askedQuestionIds` to be keyed by `packId`:

**Fix:** Track asked IDs per pack on web, e.g.:
```ts
// In QuestionState (web-only)
askedQuestionIds: Record<string, string[]>;  // packId → id[]

// selectQuestion web path
const question = await getNextQuestion(
  category,
  get().askedQuestionIds[resolvedPackId ?? ''] ?? []
);

// markAsked web path
set((state) => ({
  askedQuestionIds: {
    ...state.askedQuestionIds,
    [packId]: [...(state.askedQuestionIds[packId] ?? []), questionId],
  },
}));

// resetAskedQuestions web path — clear only the relevant pack (or all)
set({ askedQuestionIds: {} });
```

### WR-03: Web path in `selectQuestion` ignores `packId` argument

**File:** `apps/mobile/stores/questionStore.ts:66-71`

**Issue:** The web branch calls `getNextQuestion(category, get().askedQuestionIds)` and never uses the `packId` parameter. On web every player is forced to draw from the same question pool regardless of their assigned pack, making per-player pack selection a no-op on web. The mobile branch correctly uses `resolvedPackId` (line 82).

**Fix:** Pass `packId` through to `getNextQuestion` or document that web is intentionally single-pack. If intentional, guard the per-player pack chip UI on web with `Platform.OS !== 'web'` (the setup screen already does this at line 202, but a code comment at this callsite would prevent future confusion):
```ts
// web path: per-player packId has no effect — single shared question pool
const question = await getNextQuestion(category, get().askedQuestionIds);
```
Or, if web support for per-player packs is desired, `getNextQuestion` must accept a `packId` and filter accordingly.

### WR-04: Stale read of `playerCategories` inside `markAnswer`

**File:** `apps/mobile/stores/gameStore.ts:176`

**Issue:** `markAnswer` captures `completedCategories`, `isChampionshipMode`, and `questionNumber` from a `get()` call at the top of the function (line 133-139), then performs a second `get()` at line 176 to read `playerCategories`. In a synchronous Zustand context this is safe today, but if any middleware or a concurrent `set()` modifies the store between the two reads the championship check will use a mismatched snapshot: `newCompleted` (derived from the first snapshot) is compared against `thisPlayerCategories` (from the second snapshot). A single destructure from one `get()` call is the conventional Zustand pattern and removes the risk entirely.

**Fix:**
```ts
markAnswer: (correct: boolean) => {
  const {
    currentQuestion,
    currentPlayerIndex,
    completedCategories,
    isChampionshipMode,
    questionNumber,
    playerCategories,   // include here
  } = get();
  // ... remove the second get() call at line 176
  const thisPlayerCategories = playerCategories[currentPlayerIndex] ?? ALL_CATEGORIES;
```

## Info

### IN-01: `packId` field on `Player` is `string | null | undefined` — `undefined` adds no value

**File:** `apps/mobile/types/player.ts:17`

**Issue:** `packId` is typed as `packId?: string | null`. The `?` makes it `string | null | undefined`, which means callers must handle three states. In practice the store always initializes `packId: null` and `updatePlayerPack` only sets `string | null`, so `undefined` is never written. The optional marker is dead. Removing it narrows the type and eliminates the need for `?? null` coercions elsewhere (e.g., `gameStore.ts:66`).

**Fix:**
```ts
// types/player.ts
packId: string | null;
```
Then update `addPlayer` in `playerStore.ts` — the explicit `packId: null` initialization already satisfies the non-optional field, so no further changes needed.

### IN-02: `createMockPlayer` in `gameStore.test.ts` omits `packId`

**File:** `apps/mobile/stores/gameStore.test.ts:68-76`

**Issue:** `createMockPlayer` returns a `Player` object without a `packId` field (line 68-76). The `Player` type defines `packId` as optional (`string | null | undefined`), so TypeScript accepts it, but the mock does not reflect the actual object shape created by `addPlayer` (which always sets `packId: null`). If WR-01's type narrowing is applied (making `packId` non-optional), this factory will produce a type error and must be updated.

**Fix:**
```ts
function createMockPlayer(index: number): Player {
  const colors: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
  return {
    id: `player-${index}`,
    name: `Player ${index + 1}`,
    color: colors[index] || 'blue',
    wedges: [],
    packId: null,
  };
}
```

### IN-03: `handlePickPack` in `setup.tsx` silently no-ops on web without indication

**File:** `apps/mobile/app/game/setup.tsx:91`

**Issue:** The `handlePickPack` function returns immediately on web (`if (Platform.OS === 'web') return;`). The pack chip row is already hidden on web via the `Platform.OS !== 'web'` guard at line 202, so this early return is currently unreachable dead code. If the chip UI is ever shown on web the return is a silent no-op with no user feedback.

**Fix:** Remove the early return since it is guarded at the render level, or add a comment explaining the relationship:
```ts
// Pack chip is only rendered on native (see Platform.OS !== 'web' guard in JSX),
// so this handler is never called on web.
const handlePickPack = (playerId: string) => {
  // (no web guard needed here — the chip is never rendered on web)
  ...
```

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
