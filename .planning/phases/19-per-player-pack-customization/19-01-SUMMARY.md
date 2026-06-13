---
phase: 19-per-player-pack-customization
plan: 01
subsystem: ui
tags: [zustand, react-native, pressable, setup-screen, pack-mode]

# Dependency graph
requires:
  - phase: 18-pack-combos
    provides: savedCombos, updatePlayerCombo, activeComboId — used in handleSetPackMode clearing loop and source row label derivation
provides:
  - packMode field ('shared' | 'custom') in packStore with setPackMode action and partialize persistence
  - Segmented control (Shared Pack / Per Player) on game setup screen
  - Conditional per-player source row (full-width) + difficulty chip in custom mode
  - handleSetPackMode clears player packId/comboId overrides when switching to shared
affects:
  - game-setup-ui
  - per-player-pack-routing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zustand literal-union UI state field added to existing store with partialize persistence (no migration needed — merge behavior)
    - Segmented control via two Pressable elements with conditional active style (no external library)
    - Conditional row rendering in player list based on packMode store value

key-files:
  created: []
  modified:
    - apps/mobile/stores/packStore.ts
    - apps/mobile/stores/packStore.test.ts
    - apps/mobile/app/game/setup.tsx

key-decisions:
  - "packMode kept as inline literal union in packStore.ts — UI config concern, not a data-exchange type (not added to @trivial-world/types)"
  - "Segmented control implemented as two Pressable elements (no native SegmentedControl) — matches CONTEXT.md locked decision"
  - "Switching Custom→Shared clears all player packId/comboId overrides via forEach loop before calling setPackMode"
  - "Default mode is 'shared' — backward compatible with existing UX"
  - "Difficulty chips hidden in shared mode (consistent shared-everything experience)"

patterns-established:
  - "TDD: write failing tests first (98bb63c), then implement (c382ae5)"
  - "packMode persistence: add new fields to partialize object explicitly — Zustand merges new fields with defaults on hydration"

requirements-completed:
  - PHASE-19-toggle
  - PHASE-19-shared-mode
  - PHASE-19-custom-mode
  - PHASE-19-mode-switch

# Metrics
duration: 3min
completed: 2026-06-13
---

# Phase 19 Plan 01: Per-Player Pack Customization Summary

**Segmented control (Shared Pack / Per Player) added to game setup screen with packMode persisted in Zustand, conditional full-width source rows in custom mode, and override clearing on mode switch**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-13T21:45:14Z
- **Completed:** 2026-06-13T21:48:22Z
- **Tasks:** 2 (Task 1 via TDD: 3 commits; Task 2: 1 commit)
- **Files modified:** 3

## Accomplishments
- `packStore.ts` now has `packMode: 'shared' | 'custom'` field (default `'shared'`), `setPackMode` action, and `packMode` in `partialize` for persistence
- Setup screen shows a segmented control below the pack banner; shared mode hides all per-player pack/difficulty UI; custom mode shows full-width source row + difficulty chip per player
- Switching from custom to shared clears all player `packId` and `comboId` overrides via a `players.forEach` loop
- 3 new `setPackMode` tests added; all 285 tests pass (0 failures)

## Task Commits

Each task was committed atomically:

1. **[RED] Failing tests for setPackMode** - `98bb63c` (test)
2. **[GREEN] packMode + setPackMode in packStore** - `c382ae5` (feat)
3. **Task 2: Segmented control + conditional rows in setup.tsx** - `78f09a9` (feat)

_TDD task: RED commit (failing tests) → GREEN commit (implementation). No REFACTOR needed._

## Files Created/Modified
- `apps/mobile/stores/packStore.ts` - Added `packMode: 'shared' | 'custom'` to interface, initializer, action, and partialize
- `apps/mobile/stores/packStore.test.ts` - Added `describe('setPackMode')` block with 3 tests
- `apps/mobile/app/game/setup.tsx` - Added packMode/setPackMode subscriptions, handleSetPackMode handler, segmented control JSX, conditional per-player rendering, and 7 new styles

## Decisions Made
- `packMode` kept as inline literal union in `packStore.ts` — it is a UI/config concern, not a data-exchange type; `@trivial-world/types` holds schema types only
- Segmented control built with two `Pressable` elements — no external library required; matches existing Pressable patterns throughout setup.tsx
- Switching Custom → Shared clears overrides before calling `setPackMode` (synchronous, Zustand batches the set calls)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx vitest run` fails from root (rollup parse error on react-native Flow types); tests must run from `apps/mobile/` using the local vitest binary. This is pre-existing behavior, not new.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 19 plan 01 is complete. packMode is persisted and wired to the setup screen.
- The setup screen now supports both shared and per-player pack selection modes.
- No blockers for subsequent plans.

---
*Phase: 19-per-player-pack-customization*
*Completed: 2026-06-13*
