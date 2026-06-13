---
phase: 15-per-player-pack-selection
reviewed: 2026-06-12T23:00:00Z
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
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 15: Code Review Report (Iteration 2 — Post-Fix Re-Review)

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found (info only)

## Summary

Re-review after the WR-01 through WR-04 fix pass. All four warnings are resolved:

- **WR-01** (`setup.tsx`): `handleStartGame` is now `async`, properly `await`s `startGame()`, and navigates only when `useGameStore.getState().phase === 'selecting'`. The race between navigation and store initialization is eliminated.
- **WR-02** (`questionStore.ts` — web `resetAskedQuestions`): Resolved by documentation. An explanatory comment was added confirming the flat `askedQuestionIds` reset is correct for the single bundled pool web design. Accepted per CONTEXT.md.
- **WR-03** (`questionStore.ts` — web `selectQuestion`): Resolved by documentation. A comment was added clarifying that ignoring `packId` on web is intentional — web uses a single bundled question pool and the per-player pack chip is already hidden on web. Accepted per CONTEXT.md.
- **WR-04** (`gameStore.ts` — stale second `get()` in `markAnswer`): `playerCategories` is now destructured alongside `completedCategories`, `isChampionshipMode`, and `questionNumber` in the single `get()` call at the top of the function. The mid-function second snapshot is gone.

No new bugs were introduced by the fixes. Three pre-existing info items remain (unchanged from the previous review).

## Info

### IN-01: `packId` field on `Player` carries a dead `undefined` union arm

**File:** `apps/mobile/types/player.ts:17`
**Issue:** `packId?: string | null` makes the type `string | null | undefined`. The store always initializes `packId: null` and `updatePlayerPack` only accepts `string | null`, so `undefined` is never written in practice. The optional marker is dead and forces unnecessary `?? null` coercions at callsites (e.g., `gameStore.ts:66`).
**Fix:**
```ts
// types/player.ts
packId: string | null;
```
The `addPlayer` initialization `packId: null` already satisfies the non-optional field — no other changes required in the store.

### IN-02: `createMockPlayer` in `gameStore.test.ts` omits `packId`

**File:** `apps/mobile/stores/gameStore.test.ts:68-76`
**Issue:** The mock factory returns a `Player` object without `packId`. The `Player` type's optional marker (IN-01) makes TypeScript accept this, but the mock diverges from the real `addPlayer` output which always sets `packId: null`. If IN-01 is applied (making `packId` non-optional), this factory will produce a type error.
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

### IN-03: Dead web guard in `handlePickPack` in `setup.tsx`

**File:** `apps/mobile/app/game/setup.tsx:91`
**Issue:** `handlePickPack` returns early when `Platform.OS === 'web'`, but the pack chip that triggers it is only rendered inside a `Platform.OS !== 'web'` guard (line 209). The early return is currently unreachable dead code. It carries no runtime cost but adds noise and could mislead a future reader into thinking the chip is ever shown on web.
**Fix:** Remove the early return (it is guarded at the render level), or add a comment:
```ts
// Pack chip row is only rendered on native (Platform.OS !== 'web' guard in JSX),
// so this handler is never called on web. No early-return guard needed here.
const handlePickPack = (playerId: string) => {
  const selectablePacks = availablePacks.filter(p => downloadedPackIds.includes(p.id));
  // ...
};
```

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
