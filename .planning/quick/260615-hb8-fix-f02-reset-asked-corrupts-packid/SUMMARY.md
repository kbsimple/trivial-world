---
status: complete
completed_at: "2026-06-15"
commit: af6cd05
---

# Fix F-02: resetAskedQuestions Corrupts activePackId on Throw

## What Was Done

Wrapped the per-pack reset loop in `startGame()` in a try/finally block so `packStore.activePackId` is always restored to the game-level value, even if `resetAskedQuestions()` throws mid-loop.

## Files Changed

- `apps/mobile/stores/gameStore.ts` — try/finally around reset loop; removed conditional restore
