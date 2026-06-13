# Phase 19: Per-Player Pack Customization - Research

**Researched:** 2026-06-13
**Domain:** React Native UI / Zustand state management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Toggle style: segmented control with two segments — `[ Shared Pack | Per Player ]`
- Placement: below the "Pack: {name}" game-level banner, above the player list
- Default mode for new games: "Shared Pack" — backward compatible
- Persist packMode across sessions: store in `packStore` (already persisted via Zustand persist middleware)
- Pack/combo selector in custom mode: full-width tappable row per player — replaces small chips
- Difficulty chips: always visible per-player regardless of pack mode
- When a player has no custom source in custom mode: show "Default (game pack)" label
- State field: `packMode: 'shared' | 'custom'` added to `packStore`
- Difficulty chips in Shared mode: hidden
- Switching Custom → Shared: clear all player `packId` and `comboId` overrides to null
- Shared mode supports combo as game-level source: existing game-level combo picker unchanged

### Claude's Discretion
- Exact segmented control implementation (custom Pressable pair vs native SegmentedControl)
- Animation/transition when toggling modes
- Exact styling of the full-width per-player source row (matches existing card styles)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 19 is a focused UI + state change to `setup.tsx` and `packStore.ts`. The work is purely additive: a new `packMode` field in `packStore`, a `setPackMode` action, and conditional rendering in the setup screen. No new files are required — everything slots into existing structures.

The existing segmented control pattern is not yet in the codebase, so a custom two-Pressable implementation is needed (matches the CONTEXT.md locked decision). The full-width per-player source row replaces the existing `packChipRow`'s pack chip in custom mode; the difficulty chip side-by-side with it in custom mode, or the entire `packChipRow` hidden in shared mode.

The `packMode` type (`'shared' | 'custom'`) is a local UI concern — no reason to add it to `@trivial-world/types` (which holds data-layer types like `PackCombo`, `Question`, etc.). It belongs as a local TypeScript literal type in `packStore.ts`.

**Primary recommendation:** One plan is sufficient. Add `packMode` to packStore with persist, add segmented control to setup.tsx, conditionally render per-player rows, and clear overrides on mode switch.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| packMode state persistence | Frontend Store (Zustand) | — | Already in packStore alongside activePackId/activeComboId |
| Mode toggle UI | Mobile Screen (setup.tsx) | — | Screen-level presentation decision |
| Per-player source row | Mobile Screen (setup.tsx) | — | Replaces existing packChipRow pack chip |
| Clear overrides on mode switch | Frontend Store (playerStore) | — | updatePlayerPack/updatePlayerCombo called from setup.tsx handler |
| Difficulty chips visibility | Mobile Screen (setup.tsx) | — | Conditional render based on packMode |

---

## Standard Stack

No new libraries. All capabilities use existing project dependencies. [VERIFIED: codebase inspection]

### Existing Libraries Relied On

| Library | Purpose | Already Used In |
|---------|---------|-----------------|
| React Native `Pressable` | Segmented control segments, full-width source row | setup.tsx extensively |
| React Native `StyleSheet` | All styling | setup.tsx |
| React Native `Platform` | web vs native picker guard | setup.tsx `handlePickSource` |
| Zustand `persist` middleware | packMode persisted automatically | packStore.ts — `partialize` fn |
| `SEMANTIC_COLORS` | Active/inactive segment colors | setup.tsx (startButton), constants/theme.ts |

---

## Architecture Patterns

### System Architecture Diagram

```
User taps toggle
       |
       v
setPackMode('shared' | 'custom')     packStore.ts
       |
       +-- if 'shared': iterate players
       |      updatePlayerPack(id, null)    playerStore.ts
       |      updatePlayerCombo(id, null)   playerStore.ts
       |
       v
setup.tsx re-renders
       |
       +-- packMode === 'shared' ---------> hide packChipRow entirely
       |                                    (difficulty chips hidden too)
       |
       +-- packMode === 'custom' ---------> show full-width source row per player
                                            show difficulty chips per player
                                            source row taps → handlePickSource (existing)
                                            difficulty chip taps → handlePickDifficulty (existing)
```

### Recommended Project Structure

No new files. All changes in:
```
apps/mobile/
├── stores/packStore.ts        # Add packMode field + setPackMode action + partialize entry
└── app/game/setup.tsx         # Add segmented control + conditional per-player rows
```

### Pattern 1: Adding packMode to packStore

**What:** New literal-union field + action, included in `partialize` for persistence.

**Where to add in PackState interface:**
```typescript
// After activeComboId:
packMode: 'shared' | 'custom';
```

**Where to add initial value (in create callback):**
```typescript
packMode: 'shared',  // default — backward compatible
```

**New action:**
```typescript
setPackMode: (mode: 'shared' | 'custom') => void;
```

**Implementation:**
```typescript
setPackMode: (mode) => set({ packMode: mode }),
```

**Add to partialize:**
```typescript
partialize: (state) => ({
  // ...existing fields...
  packMode: state.packMode,   // <-- add this
}),
```

Source: [VERIFIED: packStore.ts lines 163-171, Zustand persist pattern]

### Pattern 2: Segmented Control (two Pressable segments)

**What:** Side-by-side pill with active/inactive states. No external library needed.

**Implementation pattern (CONTEXT.md locked — custom Pressable pair):**

```typescript
// In setup.tsx, after packInfo Pressable, before playerList View
<View style={styles.segmentedControl}>
  <Pressable
    style={[styles.segment, packMode === 'shared' && styles.segmentActive]}
    onPress={() => handleSetPackMode('shared')}
  >
    <Text style={[styles.segmentText, packMode === 'shared' && styles.segmentTextActive]}>
      Shared Pack
    </Text>
  </Pressable>
  <Pressable
    style={[styles.segment, packMode === 'custom' && styles.segmentActive]}
    onPress={() => handleSetPackMode('custom')}
  >
    <Text style={[styles.segmentText, packMode === 'custom' && styles.segmentTextActive]}>
      Per Player
    </Text>
  </Pressable>
</View>
```

**Styles (pill pattern matching existing card radius):**
```typescript
segmentedControl: {
  flexDirection: 'row',
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: 8,
  marginBottom: 16,
  padding: 3,
},
segment: {
  flex: 1,
  paddingVertical: 8,
  borderRadius: 6,
  alignItems: 'center',
},
segmentActive: {
  backgroundColor: 'rgba(255,255,255,0.9)',
},
segmentText: {
  fontSize: 14,
  fontWeight: '500',
  color: '#aaa',
},
segmentTextActive: {
  color: '#111',
},
```

Source: [VERIFIED: existing Pressable patterns in setup.tsx; SEMANTIC_COLORS in theme.ts]

### Pattern 3: Handler for mode switching with override clearing

**What:** When toggling to Shared, clear all player packId/comboId overrides.

```typescript
const { setPackMode } = usePackStore((state) => ({ setPackMode: state.setPackMode }));
// or just:
const setPackMode = usePackStore((state) => state.setPackMode);
const packMode = usePackStore((state) => state.packMode);

const handleSetPackMode = (mode: 'shared' | 'custom') => {
  if (mode === 'shared') {
    // Clear all per-player overrides (CONTEXT.md locked decision)
    players.forEach(p => {
      updatePlayerPack(p.id, null);
      updatePlayerCombo(p.id, null);
    });
  }
  setPackMode(mode);
};
```

Source: [VERIFIED: playerStore.ts lines 78-88; setup.tsx line 27 destructuring pattern]

### Pattern 4: Full-width per-player source row (custom mode)

**What:** Replaces the pack chip in `packChipRow`. Same card style as `playerRow`. Left label, right chevron. Taps into existing `handlePickSource`.

```typescript
// In custom mode: replace packChipRow's pack chip with this full-width row
// then show difficulty chip below it (or inline if space allows)

{packMode === 'custom' && (
  <Pressable
    style={styles.playerSourceRow}
    onPress={() => handlePickSource(player.id)}
  >
    <Text style={styles.playerSourceLabel} numberOfLines={1}>
      {displayName ?? 'Default (game pack)'}
    </Text>
    <Text style={styles.playerSourceChevron}>{'→'}</Text>
  </Pressable>
)}
```

**Style:**
```typescript
playerSourceRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  marginTop: 4,
},
playerSourceLabel: {
  fontSize: 14,
  color: '#ccc',
  flex: 1,
},
playerSourceChevron: {
  fontSize: 14,
  color: '#ccc',
  marginLeft: 8,
},
```

Source: [VERIFIED: setup.tsx playerRow style at line 407-413; packInfo style at line 376-387]

### Pattern 5: Difficulty chip visibility

**What:** In shared mode, hide entire packChipRow. In custom mode, show difficulty chip only (pack chip replaced by full-width source row above).

```typescript
// Shared mode: render nothing below the player name row
// Custom mode: show difficulty chip, and source row (separate element above chips)

{packMode === 'custom' && (
  <View style={styles.packChipRow}>
    <Pressable
      style={[styles.packChip, player.difficultyPreference ? styles.packChipActive : styles.packChipDefault]}
      onPress={() => handlePickDifficulty(player.id)}
    >
      <Text style={styles.packChipText} numberOfLines={1}>
        {difficultyLabel}
      </Text>
    </Pressable>
  </View>
)}
```

Source: [VERIFIED: setup.tsx packChipRow block lines 247-271]

### Anti-Patterns to Avoid

- **Do not add `PackMode` type to `@trivial-world/types`:** `packMode` is a UI/config concern, not a data-exchange type. `@trivial-world/types` holds schema types for pack files and categories. Keep `packMode` as a local `'shared' | 'custom'` literal in packStore.ts. [VERIFIED: packages/types/src/index.ts — no UI state types exported]
- **Do not call `resetPlayers` to clear overrides:** `resetPlayers` wipes the entire player list. Use individual `updatePlayerPack(id, null)` + `updatePlayerCombo(id, null)` calls per player. [VERIFIED: playerStore.ts line 96]
- **Do not guard `handleStartGame` on packMode:** `startGame()` already handles per-player pack resolution via `playerPackIdLists`. The custom mode adds per-player `packId`/`comboId` which `startGame` already reads. No changes needed in `gameStore.ts`. [VERIFIED: gameStore.test.ts, playerStore updatePlayerPack/Combo used at startGame]
- **Do not add migration for packMode:** Zustand persist with a new field and a default in the store initializer is sufficient. When existing persisted state is hydrated without `packMode`, Zustand merges — the store initializer default (`'shared'`) is used. [VERIFIED: Zustand 5.x persist behavior — new fields with defaults merge cleanly with existing state]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Platform picker (source/difficulty) | Custom modal component | Existing `webPicker` state + `handlePickSource`/`handlePickDifficulty` | Already handles web Modal vs native Alert.alert branching |
| Persist packMode manually | Local storage writes | Zustand `partialize` in packStore | Adding to partialize object handles it automatically |

---

## Common Pitfalls

### Pitfall 1: Forgetting to subscribe to packMode from packStore in setup.tsx

**What goes wrong:** packMode won't update on toggle if setup.tsx reads it from a stale local variable.

**How to avoid:** Use `usePackStore((state) => state.packMode)` selector, same as `activePackId` is subscribed on line 29.

**Warning signs:** Toggle appears to work but UI doesn't change (mode not triggering re-render).

### Pitfall 2: packMode not in partialize — not persisted

**What goes wrong:** packMode resets to 'shared' on every app launch.

**How to avoid:** Add `packMode: state.packMode` to the `partialize` function in packStore. The partialize object is explicit (lines 163-171) — new fields must be listed.

**Warning signs:** Mode resets on reload, even though Zustand persist is in place.

### Pitfall 3: displayName in custom mode shows "Default" when player has a game-level pack

**What goes wrong:** When packMode is 'custom' and a player has no override, chipLabel shows 'Default'. This is correct per CONTEXT.md ("Default (game pack)" label). Don't change this to show the game pack name — that would give the impression the player has a per-player assignment.

**Why it happens:** `displayName` is null when `player.packId` and `player.comboId` are both null.

**How to avoid:** Show literal "Default (game pack)" label text in the full-width source row, matching CONTEXT.md decision verbatim.

### Pitfall 4: Switching modes repeatedly leaves stale overrides

**What goes wrong:** User toggles Custom → sets overrides → Shared (clears overrides) → Custom again → overrides appear blank (correct). But if the clearing loop fires before `setPackMode`, the UI may show the old mode momentarily.

**How to avoid:** Always call `setPackMode(mode)` after clearing overrides (or synchronously with them). Zustand batches synchronous `set()` calls.

### Pitfall 5: Web picker modal opens with stale `webPicker` state

**What goes wrong:** If the full-width source row in custom mode calls `handlePickSource` — which already handles `Platform.OS === 'web'` — this works fine. Don't create a second picker pattern; reuse the existing `webPicker` state mechanism.

**How to avoid:** Wire the full-width row's `onPress` directly to `handlePickSource(player.id)`, same as the existing pack chip does on line 254.

---

## Code Examples

### Exact packStore.ts changes (minimal diff)

**Interface addition** (after `activeComboId: string | null;`):
```typescript
packMode: 'shared' | 'custom';
setPackMode: (mode: 'shared' | 'custom') => void;
```

**Initial state addition** (after `activeComboId: null,`):
```typescript
packMode: 'shared',
```

**Action implementation** (after `selectCombo` action):
```typescript
setPackMode: (mode) => set({ packMode: mode }),
```

**Partialize addition** (in the partialize object):
```typescript
packMode: state.packMode,
```

Source: [VERIFIED: packStore.ts full read — lines 13-171]

### Exact setup.tsx structural changes

**New imports** needed:
- None — all needed imports (`Pressable`, `View`, `Text`, `StyleSheet`, `Platform`, `Modal`, `Alert`, `TouchableWithoutFeedback`, `ScrollView`) already imported at line 2.

**New store subscriptions** (add to existing `usePackStore` calls):
```typescript
const packMode = usePackStore((state) => state.packMode);
const setPackMode = usePackStore((state) => state.setPackMode);
```

**New handler** (add after `handlePickDifficulty`):
```typescript
const handleSetPackMode = (mode: 'shared' | 'custom') => {
  if (mode === 'shared') {
    players.forEach(p => {
      updatePlayerPack(p.id, null);
      updatePlayerCombo(p.id, null);
    });
  }
  setPackMode(mode);
};
```

**JSX insertion point:** After the `packInfo` Pressable closing tag (line ~203), before `<View style={styles.playerList}>` (line ~206):
```tsx
{/* Pack mode toggle — below game-level pack banner */}
<View style={styles.segmentedControl}>
  <Pressable ... />  {/* Shared Pack segment */}
  <Pressable ... />  {/* Per Player segment */}
</View>
```

**Player row conditional rendering:**

Current `packChipRow` block (lines 247-271) becomes:
- In shared mode: omitted entirely (no chips row rendered)
- In custom mode: full-width source row (new) + difficulty chip row (existing chip, but only difficulty)

Source: [VERIFIED: setup.tsx full read]

---

## Open Questions

1. **Combo active at game level in Shared mode — should banner say "Combo: X" or "Pack: X"?**
   - What we know: `activeComboId` is not currently shown in the pack banner in setup.tsx — the banner uses `packName` derived from `activePackId`. Existing behavior.
   - What's unclear: Should "Shared Pack" mode also surface when a combo is the game source?
   - Recommendation: Out of scope for this phase. The CONTEXT.md decision states "Shared mode supports combo as game-level source (existing behavior unchanged)." Don't change the pack banner logic.

2. **Should the segmented control be disabled if no pack is selected?**
   - What we know: The "Start Game" button is already disabled if `!activePackId`. The toggle doesn't need to be.
   - Recommendation: Always show and enable the toggle. In Custom mode without a game-level pack, per-player "Default (game pack)" rows are shown but the start-game guard still prevents starting. No special handling needed.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. This phase modifies TypeScript/JSX files only.

---

## Project Constraints (from CLAUDE.md)

- **Test gating:** All 282 existing tests pass before this phase starts (verified). Phase must not break them.
- **No new TypeScript errors:** `npx tsc --noEmit` must pass after changes.
- **Commit author:** Faiser / keepbreakfastsimple@gmail.com
- **Mobile-first, offline-first:** No network calls introduced.
- **No accounts, minimal friction:** Mode toggle default `'shared'` preserves existing UX for first-time users.
- **Eyes-up design:** Full-width rows in custom mode are larger tap targets than chips — correct direction.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase inspection] — `apps/mobile/app/game/setup.tsx` (full read, 519 lines)
- [VERIFIED: codebase inspection] — `apps/mobile/stores/packStore.ts` (full read, 174 lines)
- [VERIFIED: codebase inspection] — `apps/mobile/stores/playerStore.ts` (full read, 149 lines)
- [VERIFIED: codebase inspection] — `apps/mobile/types/player.ts` — Player interface
- [VERIFIED: codebase inspection] — `packages/types/src/index.ts`, `packages/types/src/question-pack.ts` — shared types boundary
- [VERIFIED: codebase inspection] — `apps/mobile/constants/theme.ts` — SEMANTIC_COLORS
- [VERIFIED: test run] — 282 tests passing (all 10 test files green)
- [VERIFIED: codebase inspection] — No test file covers setup.tsx (screens untested — store-only test pattern)
- [VERIFIED: .planning/config.json] — `nyquist_validation: false` — validation section omitted

### Secondary (MEDIUM confidence)
- [ASSUMED: Zustand 5.x behavior] — New fields added to the store initializer with a default merge cleanly when existing persisted state is hydrated (no explicit migration needed). This is the established pattern in the codebase (activeComboId was added this way in Phase 18).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zustand persist hydration merges new `packMode` field with default `'shared'` automatically | Standard Stack / packStore patterns | If wrong, existing persisted state breaks on first load — fix: add `version` + `migrate` to persist config |

**Risk assessment for A1:** LOW risk. Phase 18 added `savedCombos` and `activeComboId` to packStore with the same pattern (no migration), and the codebase has been working since. Merge behavior is established precedent.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code read directly from source
- Architecture: HIGH — patterns traced from existing code, no speculation
- Pitfalls: HIGH — derived from code reading, not guesswork

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable codebase, 30-day window)
