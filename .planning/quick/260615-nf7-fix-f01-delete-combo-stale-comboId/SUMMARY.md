---
status: complete
completed_at: "2026-06-15"
commit: 5829d31
---

# Fix F-01: deleteCombo Leaves Stale comboId in playerStore

## What Was Done

`deleteCombo` in packStore now imports `usePlayerStore` and clears `comboId` on any player that was assigned the deleted combo. No circular dependency (playerStore does not import packStore).

## Files Changed

- `apps/mobile/stores/packStore.ts` — import usePlayerStore; clear stale player.comboId after combo deletion
