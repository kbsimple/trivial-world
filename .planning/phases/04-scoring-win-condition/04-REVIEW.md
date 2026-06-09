---
phase: 04-scoring-win-condition
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - apps/mobile/stores/gameStore.ts
  - apps/mobile/components/WedgeBadge.tsx
  - apps/mobile/components/WedgeCollection.tsx
  - apps/mobile/components/PlayerScoreCard.tsx
  - apps/mobile/app/game/results.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-06-09
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed 5 files implementing scoring and win condition functionality (SCOR-01 through SCOR-04). The code follows project conventions and uses Zustand state management correctly. Found 4 warnings related to potential edge cases and error handling, plus 3 info-level items for code quality improvements. No critical security vulnerabilities or crash-inducing bugs detected.

The WedgeBadge animation setup is incomplete (values initialized but never animated), the markAnswer function has a subtle race condition risk with setTimeout, and there's missing null handling in several places.

## Warnings

### WR-01: Animation Values Never Updated in WedgeBadge

**File:** `apps/mobile/components/WedgeBadge.tsx:26-35`
**Issue:** The `scale` and `opacity` shared values are initialized based on the `earned` prop but are never updated when `earned` changes. The comment on line 30 acknowledges this ("Animation would be triggered by parent when earned changes") but there's no `useEffect` or reaction to actually animate the values. This means wedges will not visually animate when earned during gameplay.
**Fix:**
```typescript
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

export function WedgeBadge({ color, earned, size = 24 }: WedgeBadgeProps) {
  const scale = useSharedValue(earned ? 1 : 0.85);
  const opacity = useSharedValue(earned ? 1 : 0.4);

  useEffect(() => {
    scale.value = withSpring(earned ? 1 : 0.85);
    opacity.value = withSpring(earned ? 1 : 0.4);
  }, [earned]);

  // ... rest of component
}
```

### WR-02: Race Condition in markAnswer setTimeout

**File:** `apps/mobile/stores/gameStore.ts:167-169`
**Issue:** The `setTimeout(() => { get().nextTurn(); }, 500);` creates a potential race condition. If `markAnswer` is called again within 500ms (e.g., rapid tapping or test scenario), multiple `nextTurn` calls could queue up. There's no guard to prevent this.
**Fix:**
```typescript
// Add a flag to track pending transition
let transitionPending = false;

// In markAnswer, line 167:
if (!transitionPending) {
  transitionPending = true;
  setTimeout(() => {
    transitionPending = false;
    get().nextTurn();
  }, 500);
}
```

### WR-03: Missing Null Check for currentPlayer

**File:** `apps/mobile/stores/gameStore.ts:132`
**Issue:** `currentPlayer` is accessed via `players[currentPlayerIndex]` without checking if the index is valid. If `currentPlayerIndex` is out of bounds (e.g., corrupted persisted state, or players array modified externally), this would return `undefined`, causing errors in `markAnswer` when accessing `currentPlayer.id`.
**Fix:**
```typescript
const currentPlayer = players[currentPlayerIndex];
if (!currentPlayer) {
  console.error('Invalid currentPlayerIndex:', currentPlayerIndex);
  return;
}
```

### WR-04: Template String Bug in transitionTo Error Message

**File:** `apps/mobile/stores/gameStore.ts:175`
**Issue:** The error message uses `{newPhase}` instead of `${newPhase}` - this is a template literal syntax error that would print the literal text `{newPhase}` instead of the actual phase value, making debugging harder.
**Fix:**
```typescript
console.error(`Invalid transition: ${current} -> ${newPhase}`);
```

## Info

### IN-01: Unused isCenterQuestion Reset in nextTurn

**File:** `apps/mobile/stores/gameStore.ts:116`
**Issue:** The `isCenterQuestion: false` reset in `nextTurn` is correct, but the same reset also appears in `startGame` (line 79) and implicitly in `markAnswer` (via state reset). Consider documenting why this flag needs resetting in multiple places, or consolidate to a single source of truth.
**Fix:** No code change needed, but consider adding a comment: `// Reset center question flag for normal turn (was set by board position logic)`.

### IN-02: Hardcoded Default Category in startGame

**File:** `apps/mobile/stores/gameStore.ts:68-69`
**Issue:** The default category `'blue'` is hardcoded with a comment "for now". This technical debt should be tracked if Phase 2's board position logic isn't integrated yet.
**Fix:** Consider defining a constant `DEFAULT_CATEGORY: PlayerColor = 'blue'` and referencing it, making future changes easier to track.

### IN-03: Deprecated substr Method

**File:** `apps/mobile/stores/playerStore.ts:17`
**Issue:** `Math.random().toString(36).substr(2, 9)` uses the deprecated `substr` method. Modern JavaScript recommends `substring` or `slice`.
**Fix:**
```typescript
return `player-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
```

---

_Reviewed: 2026-06-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_