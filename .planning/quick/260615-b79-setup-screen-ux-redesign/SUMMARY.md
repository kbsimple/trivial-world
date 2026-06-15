---
status: complete
completed_at: "2026-06-15"
commit: b70984a
---

# Setup Screen UX Redesign

## What Was Done

Redesigned the game setup/home screen for clearer visual hierarchy and game creation flow.

- Added uppercase section labels "QUESTION PACK" and "PLAYERS"
- Pack selector: removed distracting orange color for unselected state; now white text with `›` chevron and visible border
- Add Player button demoted to secondary outline style (not filled white) via optional style/textStyle props on AddPlayerButton
- Start Game button made full-width via `alignSelf: 'stretch'`; disabled state uses subtle `rgba(255,255,255,0.15)`
- Reduced spacing between add button and player list

## Files Changed

- `apps/mobile/app/game/setup.tsx` — section labels, pack selector style, button hierarchy, spacing
- `apps/mobile/components/AddPlayerButton.tsx` — optional style/textStyle props for secondary appearance
