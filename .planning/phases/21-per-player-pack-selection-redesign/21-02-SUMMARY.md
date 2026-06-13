---
phase: 21-per-player-pack-selection-redesign
plan: "02"
subsystem: ui
tags: [expo-router, zustand, react-native, per-player, pack-selection]

# Dependency graph
requires:
  - phase: 21-per-player-pack-selection-redesign
    provides: Plan 01 — setup.tsx per-player Shared/Custom toggle with router.push to /packs with targetPlayerId
provides:
  - Per-player mode in packs/index.tsx — reads targetPlayerId URL param, writes to playerStore, routes back
  - handleSelectPack branches on targetPlayerId to call updatePlayerPack instead of game-level selectPack
  - handleSelectComboForPlayer wires savedCombos section to updatePlayerCombo
  - Footer shows Back-only button when targetPlayerId is set
affects:
  - Any future phase touching packs/index.tsx or per-player pack selection UX

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-player mode gating: if (targetPlayerId) branch in handlers; useLocalSearchParams reads undefined when absent (game-level) or player ID string when set"
    - "Zustand-via-back result passing: destination screen writes to playerStore, calls router.back(); caller reacts reactively"

key-files:
  created: []
  modified:
    - apps/mobile/app/packs/index.tsx

key-decisions:
  - "useLocalSearchParams<{ targetPlayerId?: string }>() is the Expo Router pattern for reading URL params; undefined when absent means game-level mode"
  - "handleSelectPack async signature preserved — updatePlayerPack is synchronous so the if branch does not need await"
  - "Saved Combos rendered inline in packs/index.tsx (not via navigation to combos.tsx) to avoid threading targetPlayerId through combos screen"
  - "Multi-pack footer (Play with N packs) is hidden in per-player mode via the targetPlayerId ternary in footer — only named combos are available per-player"

patterns-established:
  - "Per-player mode gate: all per-player logic guarded by if (targetPlayerId) check; falsy = game-level behavior unchanged"
  - "Combo section: visible only when targetPlayerId set AND savedCombos.length > 0, rendered above footer"

requirements-completed:
  - PHASE-21-GOAL

# Metrics
duration: 12min
completed: "2026-06-13"
---

# Phase 21 Plan 02: Per-Player Pack Selection Redesign Summary

**packs/index.tsx extended with targetPlayerId URL param branch: per-player mode selects pack/combo for specific player via playerStore and returns to setup with router.back()**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-13T23:40:00Z
- **Completed:** 2026-06-13T23:52:21Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `useLocalSearchParams` + `usePlayerStore` imports to packs/index.tsx
- Per-player mode reads `targetPlayerId` from URL; shows "Select Pack for [player.name]" in title
- `handleSelectPack` branches: per-player calls `updatePlayerPack(targetPlayerId, packId)` + `router.back()`; game-level unchanged
- `handleSelectComboForPlayer` handler: calls `updatePlayerCombo(targetPlayerId, comboId)` + `router.back()`
- FlatList onPress: per-player mode taps downloaded pack directly (no multi-select); game-level uses togglePackSelection
- Saved Combos section renders inline when `targetPlayerId` set and `savedCombos.length > 0`
- Footer replaced with single Back button in per-player mode; full Manage Combos / Home / multi-pack footer preserved in game-level mode
- New styles: `comboSection`, `comboSectionHeader`
- All 288 tests pass; TypeScript compiles without new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add per-player mode to packs/index.tsx** - `4dd205a` (feat)

**Plan metadata:** (committed with SUMMARY below)

## Files Created/Modified
- `apps/mobile/app/packs/index.tsx` - Added per-player mode branch; 75 net lines added

## Decisions Made
- `savedCombos` added to the existing `usePackStore()` destructure (not a second hook call)
- `handleSelectPack` preserves its `async` signature — the per-player branch is sync but adding `await` to a sync call is harmless and avoids a lint edge case
- Saved combos rendered inline in the packs screen rather than via navigation to combos.tsx, avoiding the need to thread `targetPlayerId` into combos.tsx

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all data paths are wired: `savedCombos` comes from `usePackStore()` state, `players` from `usePlayerStore()`, and all handlers write directly to store.

## Self-Check: PASSED
- `apps/mobile/app/packs/index.tsx` exists and contains all required patterns (verified via grep)
- Commit `4dd205a` exists in git log
- 288 tests pass, tsc --noEmit exits 0

## Next Phase Readiness
- Plan 01 (setup.tsx) and Plan 02 (packs/index.tsx) together complete the Phase 21 UX loop
- setup.tsx navigates with `router.push({ pathname: '/packs', params: { targetPlayerId } })`; packs/index.tsx reads the param, writes to playerStore, returns via `router.back()`; setup.tsx re-renders with updated player state via Zustand reactivity
- Phase 21 goal achieved when both plans are merged

---
*Phase: 21-per-player-pack-selection-redesign*
*Completed: 2026-06-13*
