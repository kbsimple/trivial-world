---
phase: 18
title: Pack Combos — Code Review
date: 2026-06-13
reviewer: gsd-code-reviewer
status: complete
---

# Phase 18 Code Review

## Summary

5 findings. 2 HIGH, 1 MEDIUM, 2 LOW. No critical (data-loss / security) issues.

---

## Findings

### F-01 · HIGH · `deleteCombo` leaves stale `player.comboId` in playerStore

**File:** `apps/mobile/stores/packStore.ts:127-130`  
**Also:** `apps/mobile/stores/playerStore.ts`, `apps/mobile/app/game/setup.tsx`

`deleteCombo` clears `savedCombos` and resets `activeComboId` when it matches, but does not touch `playerStore`. Any player whose `comboId` pointed at the deleted combo keeps that stale ID indefinitely.

**Consequences:**
- `setup.tsx` chip displays "Custom Combo" (misleading — the combo no longer exists).
- `gameStore.startGame` calls `savedCombos.find(c => c.id === player.comboId)` → `undefined`, silently falls back through `player.packId` (null) → `activeComboId` (null, just cleared) → `activePackId`. Player gets game-level pack with no indication.
- No error, no warning; user assumes their custom combo is active.

**Fix:** In `packStore.deleteCombo`, also call `usePlayerStore.getState().players.filter(p => p.comboId === comboId)` and clear each with `updatePlayerCombo(p.id, null)`. Or emit an event / use a cross-store subscriber pattern.

---

### F-02 · HIGH · `resetAskedQuestions` loop leaves `packStore.activePackId` corrupted on throw

**File:** `apps/mobile/stores/gameStore.ts:116-125`

```ts
for (const pid of uniquePackIdsForReset) {
  if (pid !== activePackId) {
    usePackStore.setState({ activePackId: pid });       // mutates shared store
    await useQuestionStore.getState().resetAskedQuestions(); // if this throws...
  }
}
// ...restore never reached if the above threw
if (activePackId !== null) {
  usePackStore.setState({ activePackId });
}
```

If `resetAskedQuestions` throws for any pack (e.g., the pack isn't in the DB), the restore block is skipped. `packStore.activePackId` is left pointing at the last-iterated pack ID, not the game-level pack. Subsequent reads by UI components, `selectPack`, or the next `startGame` call see wrong state.

**Fix:** Wrap the loop in try/finally to guarantee the restore:
```ts
try {
  for (const pid of uniquePackIdsForReset) { ... }
} finally {
  if (activePackId !== null) usePackStore.setState({ activePackId });
}
```
Alternatively, pass `packId` directly to `resetAskedQuestions` instead of using the global store as a side-channel.

---

### F-03 · MEDIUM · `combos.tsx` has no `ScrollView` — Back button unreachable with many items

**File:** `apps/mobile/app/packs/combos.tsx:75-144`

The root container is a plain `<View style={flex:1}>`. Pack options render as a `.map()` block inline, and the `FlatList` for saved combos has `scrollEnabled={false}`. With 4+ downloaded packs and 2+ saved combos, the Back button scrolls off the bottom of the screen with no way to reach it.

**Fix:** Replace the root `<View>` with `<ScrollView contentContainerStyle={styles.container}>` and remove `scrollEnabled={false}` from the FlatList (or switch to a plain `.map()` since scrolling is now handled by the outer ScrollView).

---

### F-04 · LOW · `playerPackIds` shows wrong pack in `turn.tsx` progress strip for combo players

**File:** `apps/mobile/stores/gameStore.ts:68`, `apps/mobile/app/game/turn.tsx:115-121`

`playerPackIds` is computed as `players.map(p => p.packId ?? activePackId ?? null)` — it never accounts for `comboId`. For a combo player (`packId: null`, `comboId: "xyz"`), `playerPackIds[i]` becomes `activePackId`, so `turn.tsx` displays the game-level pack name in the progress strip instead of something like "Combo: Weekend Mix".

Question selection is unaffected (it uses `playerPackIdLists`). This is a cosmetic display issue only.

**Fix:** When deriving `playerPackIds`, if the player has a `comboId`, store a sentinel or derive it from the combo. Alternatively, the progress strip in `turn.tsx` could read from `playerPackIdLists` and render "X packs" when the list length > 1.

---

### F-05 · LOW · Serial WatermelonDB queries in `selectQuestion` loop (N packs = 2N round-trips)

**File:** `apps/mobile/stores/questionStore.ts:100-115`

The `for` loop over `resolvedPackIds` issues two `await` DB queries per pack sequentially: one to fetch the pack record, one to fetch questions. For a 5-pack combo, that's 10 serial SQLite round-trips per category tap.

This is acceptable for 2-3 packs (the typical case). For larger combos it adds latency.

**Fix (optional):** Parallelize with `Promise.all`:
```ts
const results = await Promise.all(
  resolvedPackIds.map(async (pid) => {
    const packs = await database.get('question_packs').query(Q.where('pack_id', pid)).fetch();
    if (packs.length === 0) return [];
    return database.get('questions').query(...).fetch();
  })
);
const allQuestions = results.flat();
```

---

## Verdict

| # | Severity | Issue | File | Fix Required |
|---|----------|-------|------|--------------|
| F-01 | HIGH | Stale `player.comboId` after `deleteCombo` | packStore.ts:127 | Yes |
| F-02 | HIGH | `activePackId` left corrupted if reset throws | gameStore.ts:116 | Yes |
| F-03 | MEDIUM | No ScrollView — Back button unreachable | combos.tsx:75 | Yes |
| F-04 | LOW | Wrong pack shown in turn.tsx progress strip | gameStore.ts:68 / turn.tsx:115 | Optional |
| F-05 | LOW | Serial DB queries for multi-pack combos | questionStore.ts:100 | Optional |

**Recommended fixes before shipping:** F-01, F-02, F-03.
