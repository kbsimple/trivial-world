---
phase: quick
plan: 260614-c2a
subsystem: ui
tags: [react-native, segmented-control, setup-screen, pack-selection]
status: complete

requires: []
provides:
  - Per-player pack selection replaced from chip to two-segment toggle in setup.tsx
  - "Pack: Shared | Custom" segmented control on second row of each player card
affects: [setup-screen]

duration: 5min
completed: 2026-06-14
---

# Quick Task 260614-c2a Summary

**Replace single-tap packChip Pressable with a labeled "Pack: Shared | Custom" segmented control on a second row inside each player card in setup.tsx**

## Performance

- **Duration:** ~5 min
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments
- Each player card now renders a dedicated second row: `"Pack:"` label + `"Shared"` segment + `"Custom"` segment
- Active segment shows with brighter background and bold text; inactive is subtle
- "Shared" segment: no-op when already active; calls `handleRevertToShared(player.id)` when custom is set
- "Custom" segment: always calls `handleCustomPack(player.id)` — navigates to /packs both first-time and to change pack
- Card background/border-radius moved from `playerRow` to `playerRowOuter` so both rows share the same pill card
- Old `packChip*` styles removed; 6 new `packSegmented*` styles added

## Task Commits

1. **Task 1: Replace chip with segmented control** - `e701de1` (feat)

## Files Created/Modified
- `apps/mobile/app/game/setup.tsx` — Replaced packChip block with packSegmented two-row layout; removed chipLabel derivation; removed packChip/packChipDefault/packChipActive/packChipText styles; added packSegmented/packSegmentedLabel/packSegment/packSegmentActive/packSegmentText/packSegmentTextActive styles

## Decisions Made
- Card background moved to `playerRowOuter` with `overflow: 'hidden'` so second row renders inside the card — this was a necessary deviation from original where background was on `playerRow`

## Deviations from Plan
Card background moved from `playerRow` to `playerRowOuter` — required so the segmented control second row renders inside the card boundary, not on bare screen background.

## Issues Encountered
None.

## Next Phase Readiness
- Pack selection UX updated; no blockers

---
*Quick Task: 260614-c2a*
*Completed: 2026-06-14*
