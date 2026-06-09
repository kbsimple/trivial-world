---
phase: 05-state-persistence
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - apps/mobile/stores/playerStore.ts
  - apps/mobile/stores/gameStore.ts
  - apps/mobile/stores/questionStore.ts
  - apps/mobile/app/index.tsx
  - apps/mobile/app/game/_layout.tsx
  - apps/mobile/components/PauseOverlay.tsx
findings:
  critical: 1
  warning: 4
  info: 5
  total: 10
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-06-09
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed 6 source files for Phase 5 (State Persistence). Found 1 critical issue, 4 warnings, and 5 info-level findings. The critical issue is a bug in error logging that outputs incorrect text. Key concerns include incomplete game state cleanup when ending games, potential race conditions with setTimeout, and several type safety issues with `any` usage.

## Critical Issues

### CR-01: Template Literal Not Interpolated in Error Log

**File:** `apps/mobile/stores/gameStore.ts:175`
**Issue:** The error log message uses a string literal `{newPhase}` instead of template literal `${newPhase}`, causing the logged message to literally show `{newPhase}` text instead of the actual phase value. This breaks debugging visibility for invalid state transitions.
**Fix:**
```typescript
// Current (broken):
console.error(`Invalid transition: ${current} -> {newPhase}`);

// Fixed:
console.error(`Invalid transition: ${current} -> ${newPhase}`);
```

## Warnings

### WR-01: Incomplete Game State Cleanup on End Game

**File:** `apps/mobile/app/game/_layout.tsx:28-32`
**Issue:** `handleEndGame` only calls `resetPlayers()` but does not reset the game store state (phase, winner, currentQuestion, dieResult, etc.). This leaves stale game state in AsyncStorage, which could cause issues when starting a new game or when state persistence middleware restores the old state.
**Fix:**
```typescript
import { useGameStore } from '../../stores/gameStore';
// Add at component level:
const resetGame = useGameStore((state) => state.resetGame); // Need to add this action

// In handleEndGame:
const handleEndGame = () => {
  resetPlayers();
  // Also reset game state - need to add resetGame action to gameStore
  useGameStore.getState().resetGame?.();
  router.replace('/');
};
```
Note: This requires adding a `resetGame` action to `gameStore.ts` that resets all game state to initial values.

### WR-02: setTimeout Without Cleanup

**File:** `apps/mobile/stores/gameStore.ts:167-169`
**Issue:** The `setTimeout` in `markAnswer` has no cleanup mechanism. If the component/store is destroyed or the game ends within 500ms, `nextTurn()` could be called on an unmounted component or invalid state.
**Fix:**
```typescript
// Store timeout ID and clear on cleanup
// In gameStore, track the timeout:
let turnTimeoutId: ReturnType<typeof setTimeout> | null = null;

// In markAnswer:
if (turnTimeoutId) clearTimeout(turnTimeoutId);
turnTimeoutId = setTimeout(() => {
  get().nextTurn();
  turnTimeoutId = null;
}, 500);
```
Alternatively, move this logic to a component-level `useEffect` with proper cleanup.

### WR-03: Deprecated substr Method

**File:** `apps/mobile/stores/playerStore.ts:16`
**Issue:** Using deprecated `String.prototype.substr()` method. It's recommended to use `substring()` or `slice()` instead for better compatibility.
**Fix:**
```typescript
// Current:
return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Fixed:
return `player-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
```

### WR-04: Type Assertion Without Runtime Check

**File:** `apps/mobile/stores/gameStore.ts:154`
**Issue:** Type assertion `currentPlayer as Player` assumes the player is always found. While the players array check above provides some safety, this could still cause issues if player state becomes inconsistent.
**Fix:**
```typescript
// Add explicit check before assertion:
const currentPlayer = players[currentPlayerIndex];
if (!currentPlayer) {
  console.error('Current player not found at index', currentPlayerIndex);
  return;
}
// Now safe to use currentPlayer without assertion
```

## Info

### IN-01: Multiple `any` Type Usages

**File:** `apps/mobile/stores/questionStore.ts:94,109,122,150,197,198`
**Issue:** Multiple uses of `any` type reduce type safety. Lines include `questions: any[]`, `(q as any).difficulty`, `questions[0] as QuestionModelType`, and similar patterns.
**Fix:** Define proper types for WatermelonDB query results or use type guards for runtime validation.

### IN-02: Setting askedAt to undefined May Not Work

**File:** `apps/mobile/stores/questionStore.ts:198`
**Issue:** Setting `askedAt = undefined` in WatermelonDB update may not behave as expected. WatermelonDB typically expects `null` for nullable fields or explicit column operations.
**Fix:**
```typescript
// Consider using null or checking WatermelonDB docs:
question.askedAt = null;
// Or use a raw assignment:
question._raw.askedAt = null;
```

### IN-03: Type Casting for Router Navigation

**File:** `apps/mobile/app/index.tsx:65`
**Issue:** Using `as any` to bypass router type checking loses type safety for route names.
**Fix:**
```typescript
// Use typed route or define route constants:
const route = phaseRoutes[phase] as '/game/roll' | '/game/move' | '/game/question';
router.push(route);
```

### IN-04: Missing Error Handling in Async Store Operations

**File:** `apps/mobile/stores/gameStore.ts:55-83`
**Issue:** `startGame` is async but doesn't have try/catch. If `selectQuestion` or `resetAskedQuestions` fail, the state could be left in an inconsistent intermediate state.
**Fix:** Wrap async operations in try/catch and handle error state appropriately.

### IN-05: hasActiveGame Phase Check Assumes Specific Phases

**File:** `apps/mobile/app/index.tsx:30`
**Issue:** `hasActiveGame` explicitly checks for 'setup' and 'finished' phases. If new phases are added to the game flow, this logic may need updating. Consider a more explicit check.
**Fix:**
```typescript
// Option 1: Check for specific active phases:
const hasActiveGame = ['rolling', 'moving', 'answering', 'scoring'].includes(phase) && players.length > 0;

// Option 2: Add an isActive flag to game state
```

---

_Reviewed: 2026-06-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_