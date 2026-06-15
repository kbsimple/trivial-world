---
status: complete
completed_at: "2026-06-15"
commit: 95aaa35
---

# Fix F-03: combos.tsx Has No ScrollView

## What Was Done

Replaced the root `View` + `FlatList` (scrollEnabled=false) pattern with a `ScrollView` + `savedCombos.map()`. Back button is now always reachable regardless of how many combos are saved. Avoids VirtualizedList nesting warning.

## Files Changed

- `apps/mobile/app/packs/combos.tsx` — ScrollView root, map() render, paddingBottom scrollContent style
