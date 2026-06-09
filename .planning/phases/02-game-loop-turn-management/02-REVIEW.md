---
phase: 02-game-loop-turn-management
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - apps/mobile/stores/gameStore.ts
  - apps/mobile/app/game/roll.tsx
  - apps/mobile/app/game/move.tsx
  - apps/mobile/components/Die.tsx
  - apps/mobile/components/DieFace.tsx
  - apps/mobile/components/PlayerIndicator.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-06-09
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed 6 files implementing the game loop and turn management functionality for Phase 2. The codebase is well-structured with good use of Zustand for state management and react-native-reanimated for performant animations. Found one critical issue (race condition in animation callback) and several warnings related to error handling, null safety, and React patterns.

## Critical Issues

### CR-01: Race Condition in Die Animation Callback

**File:** `apps/mobile/components/Die.tsx:74`
**Issue:** The `rollDie()` function is called synchronously before the animation sequence starts, but `handleRoll()` calls both `rollDie()` (via `onRoll` callback) and starts animations simultaneously. The animation uses `result || 1` for the final rotation calculation, but `result` is passed as a prop from the parent. In `roll.tsx:33`, `rollDie()` sets `dieResult` in the store asynchronously, but the animation starts immediately. By the time the animation reaches line 50 (`result || 1) * 60`), the `result` prop may still be `null` from the previous roll, causing the die to land on an incorrect face.

**Fix:**
```typescript
// In roll.tsx, roll the die first, wait for state update, then trigger animation
const handleRoll = () => {
  setIsRolling(true);

  // Roll the die and get the result synchronously
  const newResult = rollDie(); // rollDie already returns the result

  // Pass the result to the Die component for accurate animation
  // The Die component should use a local result state during animation
};
```

Alternatively, in `Die.tsx`, pass the rolled value as a parameter:
```typescript
interface DieProps {
  result: number | null;
  onRoll: () => number; // Return the roll result
  isRolling?: boolean;
}

// Then use the returned value immediately:
const handleRoll = () => {
  if (isRolling) return;
  const rolledValue = onRoll(); // Get result synchronously
  // Use rolledValue for animation calculation instead of result prop
  rotation.value = withSequence(
    withTiming(360 * 3, { duration: 500, easing: Easing.out(Easing.quad) }),
    withTiming(360 * 5 + rolledValue * 60, { duration: 300 }),
  );
  // ... rest of animation
};
```

## Warnings

### WR-01: String Interpolation Bug in Error Message

**File:** `apps/mobile/stores/gameStore.ts:175`
**Issue:** Invalid transition error message has a bug: `${newPhase}` is used inside a template literal but without the `$` prefix, resulting in the literal string `{newPhase}` being logged instead of the actual value.

**Fix:**
```typescript
console.error(`Invalid transition: ${current} -> ${newPhase}`);
```

### WR-02: Missing Null Check for currentPlayer

**File:** `apps/mobile/app/game/move.tsx:20`
**Issue:** Using `usePlayerStore.getState()` directly instead of the hook means the component won't re-render when players change. Additionally, `currentPlayer` is accessed by index without bounds checking. If `currentPlayerIndex` is out of bounds (e.g., corrupted state), this will be `undefined`.

**Fix:**
```typescript
// Use the hook for reactivity
const { players } = usePlayerStore();
const { dieResult, transitionTo, currentPlayerIndex, selectCategory } = useGameStore();

// Add null safety
const currentPlayer = players[currentPlayerIndex];
if (!currentPlayer) {
  // Handle edge case - redirect to setup or show error
  return null;
}
```

### WR-03: setTimeout Without Cleanup in Store Action

**File:** `apps/mobile/stores/gameStore.ts:167-169`
**Issue:** The `setTimeout` in `markAnswer` has no cleanup mechanism. If `markAnswer` is called multiple times rapidly, or if the component unmounts before the timeout fires, this could lead to memory leaks or unexpected behavior. The `nextTurn` call could execute after the game state has changed.

**Fix:**
```typescript
// Store timeout ID for cleanup
let nextTurnTimeout: ReturnType<typeof setTimeout> | null = null;

markAnswer: (correct: boolean) => {
  // ... existing logic ...

  // Clear any pending timeout
  if (nextTurnTimeout) {
    clearTimeout(nextTurnTimeout);
  }

  set({ answerRevealed: false });

  nextTurnTimeout = setTimeout(() => {
    get().nextTurn();
  }, 500);
},
```

### WR-04: Non-Deterministic Category Selection

**File:** `apps/mobile/app/game/move.tsx:33`
**Issue:** When no category is provided, a random category is selected using `PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]`. This bypasses the board position logic (noted as Phase 4 TODO) but could lead to inconsistent gameplay during testing. The random selection should be deterministic for debugging purposes or clearly documented as placeholder behavior.

**Fix:**
```typescript
// Use a deterministic default for development, or log a warning
const selectedCategory = category ?? 'blue'; // Default for testing
console.warn('Using default category - board position logic pending Phase 4');
```

## Info

### IN-01: Hardcoded Magic Numbers in Animation

**File:** `apps/mobile/components/Die.tsx:49-71`
**Issue:** Animation durations and values are hardcoded without constants. Values like `360 * 3`, `360 * 5`, `duration: 500`, etc. should be extracted to named constants for maintainability.

**Fix:**
```typescript
const ANIMATION_CONFIG = {
  ROTATION_MULTIPLIER: 360,
  INITIAL_ROTATIONS: 3,
  FINAL_ROTATIONS: 5,
  DEGREE_PER_FACE: 60,
  ROLL_DURATION_MS: 500,
  SETTLE_DURATION_MS: 300,
  // ...
};
```

### IN-02: Unused Result from rollDie

**File:** `apps/mobile/app/game/roll.tsx:33`
**Issue:** `rollDie()` returns the die result synchronously (line 86 of gameStore.ts), but the return value is ignored in `handleRoll`. The component waits for `dieResult` from the store via the hook instead of using the returned value directly.

**Fix:**
```typescript
// Either use the return value directly or remove the return type
const result = rollDie();
// Use result for immediate UI feedback if needed
```

### IN-03: Type Assertion Without Validation

**File:** `apps/mobile/components/DieFace.tsx:43-57`
**Issue:** Multiple `as string` type assertions on theme values without null coalescing fallbacks in some cases. While there's a fallback value (`'#2a2a4e'`, `'#ffffff'`), the pattern is inconsistent and could cause runtime errors if theme values are undefined.

**Fix:**
```typescript
// Define a theme utility for consistent color access
const getThemeColor = (theme: Theme, key: keyof Theme, fallback: string) =>
  theme[key]?.val as string ?? fallback;

// Usage
backgroundColor: getThemeColor(theme, 'background', '#2a2a4e'),
```

---

_Reviewed: 2026-06-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_