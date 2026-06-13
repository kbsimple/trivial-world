# Phase 21: Per-Player Pack Selection Redesign - Research

**Researched:** 2026-06-13
**Domain:** Expo Router navigation, Zustand per-player state, setup.tsx UX refactor
**Confidence:** HIGH

---

## Summary

Phase 21 redesigns the per-player pack chip in `setup.tsx`. Instead of a chip that opens an `Alert.alert` / `Modal` picker inline, each player row gets a **"Shared" / "Custom" toggle**. Tapping "Custom" navigates to `/packs` where the user picks a pack for that player; tapping "Shared" immediately clears the player's custom pack (same as the Phase 20 revert-to-shared behavior). The difficulty chip is also removed from the inline Alert/Modal flow — the goal says to remove all inline pickers, but no dedicated difficulty screen exists yet, so the disposition for difficulty must be clarified (keep chip in place but no modal, or remove entirely).

The key technical challenge is **how `/packs` returns a selected pack ID back to `setup.tsx`**. Expo Router has no first-class "result passing on back" mechanism. The project pattern is Zustand shared global state — `setup.tsx` already reads `player.packId` and `player.comboId` from `playerStore`, and `/packs/index.tsx` currently calls `updatePlayerPack` / `updatePlayerCombo` indirectly through `selectPack`/`selectPackList` on `packStore` (which sets the **game-level** `activePackId`, not a per-player ID). For Phase 21, `/packs` must write to **playerStore** (`updatePlayerPack` / `updatePlayerCombo`) for the **target player ID**, then call `router.back()`. `setup.tsx` will see the updated player state from Zustand reactively on return.

The target player ID is best passed as a URL query param: `router.push({ pathname: '/packs', params: { targetPlayerId: player.id } })`. `/packs/index.tsx` reads it with `useLocalSearchParams`. This is the standard Expo Router pattern [VERIFIED: Context7 / expo_dev docs].

**Primary recommendation:** Pass `targetPlayerId` as a URL param to `/packs`. In `/packs`, when `targetPlayerId` is present, selecting/playing a pack calls `updatePlayerPack(targetPlayerId, packId)` (or `updatePlayerCombo(targetPlayerId, comboId)`) from `playerStore` instead of `selectPack` on `packStore`, then `router.back()`. When no `targetPlayerId` is present, existing behavior (set game-level `activePackId`) is unchanged.

---

## Project Constraints (from CLAUDE.md)

- **Framework:** Expo SDK 55 + React Native 0.83
- **State:** Zustand 5.x with persist middleware
- **Navigation:** Expo Router v4.0.19
- **UI:** Tamagui 2.x
- **Test gate:** All 288 tests must pass before commit. Run: `cd apps/mobile && npx vitest run`
- **No new TypeScript errors** (run `npx tsc --noEmit`)
- **Git author:** Faiser / keepbreakfastsimple@gmail.com
- **Mobile-first, offline-first** — no network required for core gameplay
- **Eyes-up design** — minimal on-screen complexity during setup

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-player "Shared/Custom" toggle UI | Client (setup.tsx) | — | Toggle lives in the player row; no server layer |
| Navigate to /packs with targetPlayerId | Client (setup.tsx) | — | Expo Router push with params |
| Receive targetPlayerId and operate in per-player mode | Client (/packs/index.tsx) | — | useLocalSearchParams reads URL param |
| Write selected pack to per-player state | Client (/packs/index.tsx) | playerStore | updatePlayerPack / updatePlayerCombo |
| Return to setup after pick | Client (/packs/index.tsx) | Expo Router | router.back() |
| Per-player pack state (packId, comboId) | playerStore | persisted storage | Already established pattern |
| allPlayersCustom bypass computation | setup.tsx + gameStore | — | Already present in both; no changes needed |
| Difficulty per-player state | playerStore | — | difficultyPreference already on Player |

---

## Current State Analysis (VERIFIED via codebase read)

### What Phase 20 delivered (setup.tsx as of today)

[VERIFIED: read `apps/mobile/app/game/setup.tsx`]

**Player row structure (Row 2):**
```
packChipRow:
  packChip (pack source chip) → tapping calls handlePickSource(player.id)
  packChip (difficulty chip) → tapping calls handlePickDifficulty(player.id)
```

**handlePickSource** shows `Alert.alert` (native) or `Modal` (web) with options:
- "Default (game source)" → `updatePlayerPack(null)` + `updatePlayerCombo(null)`
- One entry per selectable pack → `updatePlayerPack(packId)`
- One entry per savedCombo → `updatePlayerCombo(comboId)`

**handlePickDifficulty** shows `Alert.alert` / `Modal` with: Any / Easy / Medium / Hard

**Chip labels:**
- Pack chip: "Default" when no packId/comboId; truncated combo/pack name otherwise
- Difficulty chip: "Any Difficulty" or capitalized difficulty name

**allPlayersCustom** is already computed in setup.tsx and used for Start Game button and CONF-01 bypass. No changes needed to this logic.

**Styles available for reuse:**
- `packChipRow`, `packChip`, `packChipDefault`, `packChipActive`, `packChipText` — all in setup.tsx StyleSheet
- The pack chip currently uses `displayName ? packChipActive : packChipDefault` — the "active" vs "default" distinction already maps to Custom vs Shared semantically

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| expo-router | ~4.0.19 | Navigation | useLocalSearchParams for param receipt |
| react | 19.2.3 | UI | — |
| zustand | 5.x | State | playerStore, packStore, gameStore |
| react-native | 0.83 | Mobile UI | Platform, Alert, StyleSheet, etc. |

No new dependencies needed for this phase.

---

## Architecture Patterns

### Navigation: Passing Target Player to /packs

Expo Router supports query params via `router.push({ pathname, params })`. The receiving screen reads with `useLocalSearchParams`. [VERIFIED: Context7 /websites/expo_dev docs]

```typescript
// In setup.tsx — Custom button handler
const handleCustomPack = (playerId: string) => {
  router.push({ pathname: '/packs', params: { targetPlayerId: playerId } });
};
```

```typescript
// In /packs/index.tsx — read the param
import { useLocalSearchParams } from 'expo-router';
const { targetPlayerId } = useLocalSearchParams<{ targetPlayerId?: string }>();
```

`useLocalSearchParams` returns string values (URL params are strings). `targetPlayerId` will be `undefined` when navigating from Home, or a player ID string when navigating from setup.

### Returning Result via Zustand (not URL params)

Expo Router has no "return value from screen" mechanism. The established project pattern is: modify Zustand state on the destination screen, then `router.back()`. The caller screen reacts to Zustand state changes automatically.

```typescript
// In /packs/index.tsx — per-player mode selection
const handleSelectPackForPlayer = async (packId: string) => {
  if (targetPlayerId) {
    updatePlayerPack(targetPlayerId, packId);
    // Clear comboId automatically (updatePlayerPack already handles mutual exclusion)
    router.back();
  } else {
    // Existing: set game-level pack
    await selectPack(packId);
    setSelectedPackIds([]);
    router.push('/game/setup');
  }
};
```

Mutual exclusion between `packId` and `comboId` is already handled by `playerStore`:
- `updatePlayerPack(id, packId)` clears `comboId` when `packId !== null` [VERIFIED: playerStore.ts line 78-82]
- `updatePlayerCombo(id, comboId)` clears `packId` when `comboId !== null` [VERIFIED: playerStore.ts line 84-88]

### Shared / Custom Toggle Design

Replace the current pack chip label ("Default" / truncated name) with two explicit toggle states:

| Player state | Toggle appearance | Tap action |
|---|---|---|
| `packId == null && comboId == null` | "Shared" chip (packChipDefault style) | Navigate to /packs with targetPlayerId |
| `packId != null OR comboId != null` | "Custom" chip (packChipActive style, maybe show truncated name) | Clear player's packId + comboId (immediate, no modal) |

This maps directly onto the existing `packChipDefault` / `packChipActive` style pair. No new styles required.

The clearing action (tap Custom → revert to Shared) uses:
```typescript
updatePlayerPack(playerId, null);
updatePlayerCombo(playerId, null);
// Note: updatePlayerPack(id, null) does NOT clear comboId when packId is null
// (see playerStore line 78: `comboId: packId !== null ? null : p.comboId`)
// So must call both explicitly.
```

[VERIFIED: playerStore.ts `updatePlayerPack` and `updatePlayerCombo` implementations]

### Label When Custom

When a player has a custom pack selection, the chip should show what they selected (for clarity). Two options:
- "Custom" (static, always the same)
- "Custom: [truncated name]" (informative)

The current Phase 20 implementation already builds `chipLabel` from `displayName` (truncated combo/pack name). Phase 21 can keep this pattern: show `Custom: [name]` or just the name in the active chip. Planner can decide exact label text — both approaches are architecturally equivalent.

### Difficulty Chip

The phase description says "remove all inline Alert/Modal pickers for packs and difficulty." Two valid interpretations:

**Option A (remove difficulty chip entirely for now):** Remove `handlePickDifficulty` and the difficulty chip from the player row. Difficulty selection is deferred to a future phase's dedicated screen.

**Option B (keep difficulty chip, remove Modal/Alert, replace with dedicated screen):** Add a `/game/difficulty` or `/packs/difficulty` screen navigated to from setup with `targetPlayerId`, similar to the pack flow.

**Option C (keep difficulty chip as-is, only fix packs):** Phase description says packs AND difficulty, but difficulty may be lower priority. Remove only the pack Alert/Modal; keep the difficulty Alert/Modal for now.

[ASSUMED] The phase description says "remove all inline Alert/Modal pickers for packs and difficulty" — without knowing the user's priority, Option A (remove difficulty chip) is the safest because it removes all Alerts as directed. Option B is cleanest UX but requires a new screen. The planner should pick a path.

### /packs Screen Changes

The `/packs/index.tsx` screen currently operates in "game-level" mode:
- `handleSelectPack(packId)` calls `selectPack(packId)` then `router.push('/game/setup')`
- `handlePlaySelected()` calls `selectPack` or `selectPackList` then `router.push('/game/setup')`

When `targetPlayerId` is present, these must:
- Call `updatePlayerPack(targetPlayerId, packId)` instead of `selectPack`
- Call `router.back()` instead of `router.push('/game/setup')`
- The multi-pack selection (`handlePlaySelected` with multiple IDs) in per-player mode: could call `updatePlayerCombo` if that player gets a combo, OR could auto-create a combo. The simplest answer: for per-player custom selection, only allow single pack selection (or only named combos). Multi-pack ad hoc selection remains game-level only.

The `PackDetailsModal`'s `onSelect` callback calls `handleSelectPack` — it will naturally follow the same conditional.

The combos tab is reachable from `/packs` footer. When in per-player mode, tapping "Manage Combos" should not clear the `targetPlayerId` context. However, `/packs/combos.tsx` does not return a selected combo — it only creates/deletes. Combo selection from setup in per-player mode needs a different path. Options:
- Show saved combos directly in the `/packs` screen footer area when in per-player mode (alongside pack list)
- Navigate to combos screen with `targetPlayerId` and add a "Use this combo" action per combo item

[ASSUMED] The simpler approach: in per-player mode, show saved combos as selectable items in the `/packs` screen itself (below pack list or alongside), without navigating to combos screen. This avoids threading `targetPlayerId` through to combos.tsx.

### Recommended Project Structure (no new files needed)

```
apps/mobile/
├── app/game/setup.tsx              # Replace chip + remove Alert/Modal handlers
├── app/packs/index.tsx             # Add targetPlayerId param handling, per-player select
├── app/packs/_layout.tsx           # No change needed
├── stores/playerStore.ts           # No change — updatePlayerPack/Combo already work
├── stores/gameStore.ts             # No change — allPlayersCustom bypass already works
└── stores/packStore.ts             # No change
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Returning data from /packs to setup | Custom event bus, global callback ref | Zustand playerStore (already exists) | Zustand state updates reactively; no pub/sub complexity |
| URL param typing | Manual string casting | `useLocalSearchParams<{ targetPlayerId?: string }>()` | Built-in Expo Router typed params |
| pack/combo mutual exclusion | Custom logic | `updatePlayerPack` / `updatePlayerCombo` (already handles it) | playerStore already clears the other field |
| allPlayersCustom logic | New computation | Already in setup.tsx and gameStore | Reuse existing derived values |

---

## Common Pitfalls

### Pitfall 1: Navigating /packs with push vs replace when coming from setup

**What goes wrong:** If `router.replace('/packs')` is used (as the game-level home→packs flow does), pressing Back may navigate to unexpected places. The setup→packs flow should use `router.push` so that `router.back()` reliably returns to setup.

**Why it happens:** `router.push` adds to the stack; `router.replace` replaces the current entry. When the user goes setup → /packs, they expect Back → setup.

**How to avoid:** Use `router.push({ pathname: '/packs', params: { targetPlayerId } })` in the Custom handler. In `/packs`, use `router.back()` to return (not `router.push('/game/setup')`).

**Warning signs:** After selecting a pack, the user lands on the wrong screen.

### Pitfall 2: Combo selection not handled in per-player mode

**What goes wrong:** The `/packs` screen shows a pack list but saved combos are selectable from the bottom footer ("Manage Combos"). If `targetPlayerId` is set but combos aren't selectable from the pack list, users can't assign a combo to a player.

**How to avoid:** Either (a) show combos as selectable list items in `/packs` when `targetPlayerId` is set, or (b) add a separate combo selection UX. Plan must explicitly decide this.

### Pitfall 3: Multi-pack selection in per-player mode is undefined behavior

**What goes wrong:** `/packs/index.tsx` supports selecting 2+ packs and then "Play with N packs" which calls `selectPackList`. This sets `activePackIdList` on packStore (game-level), not a per-player field.

**How to avoid:** In per-player mode (`targetPlayerId` set), the multi-pack footer button should either be hidden or auto-create a combo and call `updatePlayerCombo`. The simplest safe choice: hide the multi-select footer when in per-player mode, require the user to use named combos for multi-pack.

### Pitfall 4: Clearing player's pack when updatePlayerPack(id, null) is called

**What goes wrong:** `updatePlayerPack(id, null)` does NOT clear `comboId`:
```typescript
// playerStore line 78-82:
players: state.players.map(p =>
  p.id === id ? { ...p, packId, comboId: packId !== null ? null : p.comboId } : p
)
```
So if you only call `updatePlayerPack(id, null)` to revert to Shared, the player still has a `comboId` set.

**How to avoid:** The revert-to-Shared action must call BOTH:
```typescript
updatePlayerPack(playerId, null);
updatePlayerCombo(playerId, null);
```

[VERIFIED: playerStore.ts implementation]

### Pitfall 5: useLocalSearchParams returns undefined during test mocks

**What goes wrong:** Tests that render `/packs/index.tsx` without providing params will get `undefined` for `targetPlayerId`. The fallback behavior must be the original game-level pack selection (not crash).

**How to avoid:** Always check `if (targetPlayerId)` before per-player code paths. Default to game-level behavior when `targetPlayerId` is falsy.

---

## Code Examples

### Push to /packs with targetPlayerId (setup.tsx)

```typescript
// Source: [VERIFIED: Context7 /websites/expo_dev docs]
const handleCustomPack = (playerId: string) => {
  router.push({ pathname: '/packs', params: { targetPlayerId: playerId } });
};
```

### Read targetPlayerId in /packs/index.tsx

```typescript
// Source: [VERIFIED: Context7 /websites/expo_dev docs + codebase pattern]
import { useLocalSearchParams, useRouter } from 'expo-router';
const { targetPlayerId } = useLocalSearchParams<{ targetPlayerId?: string }>();
const router = useRouter();
```

### Per-player pack selection handler in /packs

```typescript
// Source: [ASSUMED — derived from playerStore.ts API + Expo Router back pattern]
const handleSelectPackForPlayer = (packId: string) => {
  updatePlayerPack(targetPlayerId!, packId);
  router.back();
};

const handleSelectComboForPlayer = (comboId: string) => {
  updatePlayerCombo(targetPlayerId!, comboId);
  router.back();
};
```

### Revert player to Shared in setup.tsx (tap Custom chip)

```typescript
// Source: [VERIFIED: playerStore.ts implementation]
const handleRevertToShared = (playerId: string) => {
  updatePlayerPack(playerId, null);
  updatePlayerCombo(playerId, null);
};
```

### Toggle chip rendering logic

```typescript
// Source: [ASSUMED — derived from Phase 20 chip pattern in setup.tsx]
const isCustom = player.packId !== null || player.comboId !== null;
const chipLabel = isCustom
  ? (displayName ? `Custom: ${displayName.slice(0, 10)}` : 'Custom')
  : 'Shared';

<Pressable
  style={[styles.packChip, isCustom ? styles.packChipActive : styles.packChipDefault]}
  onPress={() => isCustom
    ? handleRevertToShared(player.id)
    : handleCustomPack(player.id)
  }
>
  <Text style={styles.packChipText}>{chipLabel}</Text>
</Pressable>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Top-level packMode toggle (Shared/Custom per player) | Removed in Phase 20; per-player chips always visible | Phase 20 (2026-06-13) | No mode state needed |
| handlePickSource → Alert/Modal inline picker | Phase 21: replace with navigation to /packs | Phase 21 | Cleaner UX, no inline modal |
| Pack chip = "Default" or pack name | Phase 21: "Shared" or "Custom: [name]" | Phase 21 | Explicit intent signaling |

---

## Open Questions

1. **Difficulty chip disposition**
   - What we know: Phase description says "remove all inline Alert/Modal pickers for packs AND difficulty"
   - What's unclear: No dedicated difficulty screen exists. Remove the chip entirely? Keep it but switch to navigation? Keep Alert/Modal and only fix pack?
   - Recommendation: Remove the difficulty chip entirely for Phase 21 (simplest, matches "remove inline pickers"). Difficulty-per-player via dedicated screen can be Phase 22 if needed.

2. **Combo selection in per-player mode**
   - What we know: `/packs` lists packs; combos are in `/packs/combos` which only creates/deletes
   - What's unclear: How does a user assign a saved combo to a player in per-player mode?
   - Recommendation: Show saved combos as a selectable section in `/packs/index.tsx` when `targetPlayerId` is present (below pack list). No navigation to combos screen needed.

3. **Multi-pack selection in per-player mode**
   - What we know: Selecting 2+ packs calls `selectPackList` which writes to packStore (game-level)
   - What's unclear: Should multi-pack selection work per-player?
   - Recommendation: Disable/hide multi-pack footer in per-player mode. Named combos handle this case.

4. **Header/title of /packs in per-player mode**
   - What we know: Title currently says "Select Question Pack"
   - What's unclear: Should it indicate who the pack is for?
   - Recommendation: Update title to "Select Pack for [player.name]" when `targetPlayerId` is set. Requires looking up player name from playerStore.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this is a code/navigation refactor with no new services)

## Validation Architecture

`workflow.nyquist_validation` is `false` in `.planning/config.json` — Validation Architecture section omitted per config.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Difficulty chip should be removed entirely (Option A) rather than moved to a dedicated screen | Open Questions #1 | If user wants difficulty-per-player to remain accessible, Phase 21 is incomplete |
| A2 | Saved combos should appear as selectable items in /packs when targetPlayerId is set, not via navigation to combos.tsx | Open Questions #2 | If combos.tsx is the correct place, need to thread targetPlayerId there and add combo selection UX |
| A3 | Multi-pack footer should be hidden in per-player mode | Open Questions #3 | If user wants per-player multi-pack, requires new field on Player type |
| A4 | Per-player mode should show player name in /packs title | Code Examples | Minor UX consideration, low risk |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `apps/mobile/app/game/setup.tsx` — full read, current implementation confirmed
- [VERIFIED: codebase] `apps/mobile/app/packs/index.tsx` — full read, current packs screen implementation
- [VERIFIED: codebase] `apps/mobile/stores/playerStore.ts` — updatePlayerPack/Combo mutual exclusion logic
- [VERIFIED: codebase] `apps/mobile/stores/packStore.ts` — no packMode, savedCombos, selectPack actions
- [VERIFIED: codebase] `apps/mobile/stores/gameStore.ts` — allPlayersCustom bypass logic
- [VERIFIED: Context7 /websites/expo_dev] `useLocalSearchParams`, `router.push` with params pattern

### Secondary (MEDIUM confidence)
- [CITED: docs.expo.dev/router/basics/navigation] Router push with pathname + params
- [CITED: docs.expo.dev/versions/latest/sdk/router] useLocalSearchParams API

### Tertiary (LOW confidence)
- [ASSUMED] Difficulty chip removal vs. navigation — no explicit decision from user yet

---

## Metadata

**Confidence breakdown:**
- Navigation pattern (params + back): HIGH — verified against Context7 Expo Router docs and project pattern
- Per-player state writes: HIGH — playerStore API fully verified
- Chip toggle design: HIGH — directly extends Phase 20 patterns in codebase
- Difficulty disposition: LOW — user intent not confirmed; assumption documented
- Combo per-player flow: MEDIUM — approach is sound but exact UX in /packs is recommended, not decided

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable dependencies, 30-day window)
