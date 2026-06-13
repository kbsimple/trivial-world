# Phase 15: Per-Player Pack Selection - Research

**Researched:** 2026-06-12
**Domain:** React Native / Expo — Zustand state extension, cross-platform ActionSheet, WatermelonDB per-pack querying
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Per-player packId lives in the Player model (`types/player.ts`) — player owns their pack assignment
- `startGame()` snapshots player pack IDs into `gameStore.playerPackIds[]` — decouples ongoing game from setup changes
- If a player has no pack assigned, fall back to `packStore.activePackId` (game-level default) — backward compatible
- `questionStore.selectQuestion` receives optional `packId?: string` parameter, called with the current player's packId in `gameStore.selectCategory`
- Per-player active categories are derived from the pack's `categoryCounts` keys where count > 0
- Player completes all categories *their pack has* to enter championship mode
- If a pack's available categories can't be determined, fall back to all 6 categories
- `startGame()` snapshots `playerCategories: Category[][]` alongside `playerPackIds[]` — immutable during game
- Per-player pack chip/badge shown below the name input in each player row — tap to open pack picker
- ActionSheet/Alert options listing available downloaded packs (mobile-native, no new modal screen)
- "Default" badge (gray/muted) when no per-player pack selected — inherits game-level pack
- Turn screen progress strip shows pack name (truncated) next to player progress count

### Claude's Discretion
- Specific ActionSheet implementation details (react-native Alert.alert or ActionSheetIOS)
- Exact badge styling within existing design system
- Web compatibility approach for ActionSheet

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 15 extends an existing, working gameplay system by layering per-player pack assignment on top of a global-pack model. The core challenge is a **fan-out of state**: every place that currently reads `packStore.activePackId` as a singleton must become index-aware — using the current player's `packId` from the game snapshot rather than the global store field.

The three principal code paths that change are: (1) `questionStore.selectQuestion` must accept an optional `packId` override on both web (bundle filter) and native (WatermelonDB query filter); (2) `gameStore.startGame` must snapshot per-player pack IDs and derive per-player category lists from `PackIndexEntry.categoryCounts`; and (3) `gameStore.markAnswer` must replace the global `getActiveCategories()` helper with the per-player snapshot stored in `playerCategories[currentPlayerIndex]`.

The `Alert.alert` button-array pattern already used in `setup.tsx` is the correct and lowest-friction approach for the pack picker. It works on iOS, Android, and web (renders an in-browser `window.alert`-style modal). No additional libraries are needed.

**Primary recommendation:** Add `packId?: string | null` to `Player`, add `playerPackIds` and `playerCategories` to `GameState`, thread the per-player packId through `selectCategory → selectQuestion`, and replace `getActiveCategories()` in `markAnswer` with the snapshotted `playerCategories[currentPlayerIndex]`. All changes are additive and backward-compatible.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pack assignment per player | Frontend (Zustand playerStore) | — | Player is a UI-layer model; pack preference is player metadata |
| Pack snapshot at game start | Frontend (Zustand gameStore) | — | Snapshot pattern already established for activePackId; same tier |
| Per-player category derivation | Frontend (gameStore.startGame) | packStore (source data) | Derived from packStore.availablePacks at snapshot time |
| Question selection with packId | Frontend (questionStore) | WatermelonDB / bundle | selectQuestion already owns platform dispatch; packId is a parameter |
| Pack picker UI | UI (setup.tsx component) | — | Inline Alert.alert, no new screen needed |
| Pack name display in progress strip | UI (turn.tsx component) | gameStore (snapshot) | Read from gameStore.playerPackNames (or derive in component) |

---

## Standard Stack

No new libraries needed. All changes use existing dependencies.

### Core (unchanged)
| Library | Current Version | Purpose |
|---------|----------------|---------|
| Zustand 5.x | existing | State stores — playerStore, gameStore, questionStore |
| WatermelonDB | existing | Native question storage with `pack_id` filter |
| React Native `Alert` | built-in | Cross-platform picker (Alert.alert with button array) |
| `@trivial-world/types` | existing | `PackIndexEntry`, `Category` types |

### No new installs required
All capabilities are already available in the project. [VERIFIED: reading packStore.ts, questionStore.ts, setup.tsx, types/question-pack.ts]

---

## Architecture Patterns

### System Architecture Diagram

```
Player Setup (setup.tsx)
  ├── playerStore.players[].packId (per-player selection, nullable)
  └── Alert.alert picker → playerStore.updatePlayerPack(id, packId)
           ↓ at startGame()
gameStore.startGame()
  ├── reads playerStore.players[].packId (or falls back to packStore.activePackId)
  ├── reads packStore.availablePacks to derive categoryCounts per player
  ├── snapshots → gameStore.playerPackIds: string[]
  └── snapshots → gameStore.playerCategories: Category[][]
           ↓ at selectCategory()
gameStore.selectCategory(category)
  ├── resolves playerPackIds[currentPlayerIndex]
  └── calls questionStore.selectQuestion(category, resolvedPackId)
           ↓ platform dispatch
questionStore.selectQuestion(category, packId?)
  ├── [web]    getNextQuestion(category, askedIds, packId?)  → bundle filter (no-op: web uses one bundle)
  └── [native] WatermelonDB query filtered by resolved pack_id
           ↓ at markAnswer()
gameStore.markAnswer(correct)
  ├── uses playerCategories[currentPlayerIndex] (snapshotted, NOT packStore)
  └── championship = playerCategories[idx].every(c => completed.includes(c))
           ↓ display
turn.tsx progress strip
  └── shows truncated playerPackNames[idx] (derived from playerPackIds + availablePacks)
```

### Recommended Project Structure (additive changes only)

```
apps/mobile/
├── types/
│   └── player.ts          ← add packId?: string | null to Player
│   └── game.ts            ← add playerPackIds, playerCategories to GameState
├── stores/
│   ├── playerStore.ts     ← add updatePlayerPack action
│   ├── gameStore.ts       ← update startGame, selectCategory, markAnswer
│   └── questionStore.ts   ← add optional packId param to selectQuestion
├── services/
│   └── questionProvider.ts ← thread packId into getNextQuestionFromDatabase
└── app/game/
    ├── setup.tsx          ← per-player pack chip + Alert.alert picker
    └── turn.tsx           ← show pack name in progress strip
```

---

## Key Implementation Findings

### Finding 1: `selectQuestion` packId threading — web path

**Current:** `questionStore.selectQuestion(category)` on web calls `getNextQuestion(category, askedIds)` from `questionProvider.ts`, which calls `getNextQuestionFromBundle()`. That function filters `ALL_QUESTIONS` by category only — it has no concept of packs.

**Required change:** On web, the bundled questions (`ALL_QUESTIONS`) are from the single default pack. There is no multi-pack support on web (D-08 decision: bundled default pack only). So when `selectQuestion(category, packId?)` is called on web, the `packId` parameter is accepted but **ignored** — the bundle always serves the default pack regardless of which packId is requested.

**This is correct behavior.** Web players always share the default pack. Per-player pack selection is a meaningful feature only on native where multiple packs can be downloaded.

**Implication:** `getNextQuestion` signature does not need to change. The `packId` parameter is consumed and dispatched in `questionStore.selectQuestion` before calling `getNextQuestion`. [VERIFIED: reading questionProvider.ts lines 31-38, packStore.ts line 103 (`Platform.OS !== 'web'` guard)]

### Finding 2: `selectQuestion` packId threading — native path

**Current:** `questionStore.selectQuestion(category)` on native reads `usePackStore.getState().activePackId` internally.

**Required change:** Add `packId?: string` to the signature. When provided, use it instead of `usePackStore.getState().activePackId`. Fallback: if `packId` is undefined or null, fall back to `activePackId` (preserves backward compatibility for callers that don't pass packId).

**WatermelonDB query already uses `pack_id` column filter** — the query pattern `Q.where('question_pack_id', packs[0].id)` just needs to look up the right pack record. The packId → WatermelonDB `packs[0].id` translation already exists (lines 96-99 of questionStore.ts). [VERIFIED: reading questionStore.ts lines 80-110]

**Similarly:** `questionProvider.ts`'s `getNextQuestionFromDatabase` also reads `usePackStore.getState().activePackId` (line 95). This function is called from `questionStore.selectQuestion` only on web (lines 36-38), but it also contains the same DB lookup pattern. However, since the DB path is native-only and `selectQuestion` already handles the platform dispatch, the simplest fix is to pass `packId` as a parameter to both `getNextQuestionFromDatabase` in `questionProvider.ts` and the inline DB code block in `questionStore.ts`. [VERIFIED: reading questionProvider.ts lines 86-95]

### Finding 3: Available packs for the ActionSheet picker

**Computation:** The picker should show only packs that are both downloaded AND have pack metadata (i.e., are in `availablePacks`). The intersection is:

```typescript
const selectablePacks = availablePacks.filter(p =>
  downloadedPackIds.includes(p.id) || p.id === activePackId
)
```

Note: on web, `downloadedPackIds` is always empty (packStore.ts line 96-97, `refreshDownloadedPacks` returns early on web). On web there is only one pack (the bundle), so the picker is not useful. **The pack chip in setup.tsx should only show a tappable picker on native.** On web, it can display a static "Default Pack" badge.

**PackIndexEntry shape:** [VERIFIED: reading packages/types/src/question-pack.ts lines 63-74]
```typescript
PackIndexEntry = {
  id: string,         // UUID
  name: string,
  author: string,
  categoryCounts: Record<Category, number>,  // e.g. {blue: 20, pink: 20, ...}
  downloadUrl: string,
  ...
}
```

### Finding 4: Per-player categories snapshot derivation

`categoryCounts` is `Record<Category, number>` where the key is always a valid Category. To derive the active categories for a player's pack:

```typescript
function categoriesForPack(packId: string | null, fallbackId: string | null): Category[] {
  const resolvedId = packId ?? fallbackId;
  if (!resolvedId) return ALL_CATEGORIES;

  const { availablePacks } = usePackStore.getState();
  const pack = availablePacks.find(p => p.id === resolvedId);
  if (!pack) return ALL_CATEGORIES;

  return (Object.entries(pack.categoryCounts) as [Category, number][])
    .filter(([, count]) => count > 0)
    .map(([cat]) => cat);
}
```

This is called inside `startGame()` for each player, producing `playerCategories: Category[][]`. [VERIFIED: reading packStore.ts, packages/types/src/question-pack.ts]

**Note:** `enabledCategories` from packStore (the UI category filter toggled in Game Configuration) should be applied as an additional filter ON TOP of the pack's natural categories when snapshotting. This is how the existing `getActiveCategories()` function works. The per-player snapshot should replicate: `packCategories.filter(c => !enabledCategories || enabledCategories.includes(c))`. CONTEXT.md does not mention this — it should be preserved to avoid breaking the category filter feature.

### Finding 5: `Alert.alert` cross-platform ActionSheet

**Pattern already in setup.tsx (line 91-98):** `Alert.alert(title, message, buttons[])` is imported from `react-native` and used for the "no pack selected" guard.

**For the pack picker:**
```typescript
Alert.alert(
  'Select Pack',
  `Current: ${currentPackName}`,
  [
    { text: 'Default (game pack)', onPress: () => updatePlayerPack(player.id, null) },
    ...selectablePacks.map(p => ({
      text: p.name.slice(0, 30),
      onPress: () => updatePlayerPack(player.id, p.id),
    })),
    { text: 'Cancel', style: 'cancel' },
  ]
);
```

**Platform behavior:**
- iOS: Native UIAlertController action sheet appearance (up to ~8 buttons cleanly)
- Android: Native AlertDialog with button list
- Web: Browser-native `confirm`/`alert` — does NOT render buttons beyond OK/Cancel; multi-button Alert degrades

**Web limitation:** `Alert.alert` with multiple buttons degrades on web — only the first two buttons render reliably (Cancel + one choice). [ASSUMED — based on React Native Web behavior patterns; exact button count cutoff may vary by browser]

**Claude's discretion recommendation:** Use a Platform guard: on web, show a simpler `<select>` dropdown or a Pressable that opens a modal instead of Alert.alert. However, since web uses only the bundled default pack and per-player pack selection is not meaningful on web (no downloaded packs), the cleanest approach is: **on web, do not render the pack chip as tappable** — show only the static "Default" badge. This avoids the Alert.alert web limitation entirely and correctly reflects that web users can't meaningfully choose different packs.

### Finding 6: Existing tests that need updating

**Test files that will require changes:**

1. **`apps/mobile/stores/gameStore.test.ts`** — HIGH impact
   - `startGame` tests mock `usePackStore.getState()` to return `{ activePackId: 'test-pack-id' }`. The new `startGame` also reads `availablePacks` from packStore to derive `playerCategories`. The mock needs to include `availablePacks: []` (or packs with categoryCounts).
   - `startGame` tests that assert on `completedCategories` shape also need `playerPackIds` and `playerCategories` in `beforeEach` state reset.
   - The `selectCategory` test that asserts `selectQuestion` was called with `'pink'` needs updating to expect the new signature `selectQuestion('pink', resolvedPackId)`.
   - The `markAnswer` "sets isChampionshipMode when answering the 6th category" test uses hardcoded `getActiveCategories()` logic. After the change, `markAnswer` will use `playerCategories[0]` from state, so the test needs `playerCategories: [ALL_CATEGORIES]` in the initial state setup. [VERIFIED: reading gameStore.test.ts lines 136-218, 222-254, 421-438]

2. **`apps/mobile/stores/playerStore.test.ts`** — LOW impact
   - Tests cover `addPlayer`, which initializes the player object. After adding `packId?: string | null`, tests that assert on the full player shape (e.g., "preserves other player properties when updating name", line 221) will need to include `packId: undefined` or `packId: null` in expected objects, or use `expect.objectContaining`. [VERIFIED: reading playerStore.test.ts lines 221-233]
   - New test needed: `updatePlayerPack` action (analogous to existing `updatePlayerName` tests).

3. **`apps/mobile/stores/questionStore.test.ts`** — currently broken (pre-existing parse error from React Native 0.85 `import typeof` syntax). Tests here cannot run. The `selectQuestion` signature change (adding optional `packId`) is backward compatible and won't break any currently-passing tests. [VERIFIED: running test suite — questionStore.test.ts shows RollupError, 0 tests collected]

4. **`apps/mobile/stores/packStore.test.ts`** — same pre-existing RollupError, 0 tests collected. Not impacted.

**Pre-existing failures (unrelated to this phase):**
- `packStore.test.ts` and `questionStore.test.ts`: RollupError parsing `import typeof` from React Native 0.85 — pre-existing, not caused by this phase
- `e2e/*.spec.ts`: Pre-existing environment failures
- `apps/generator/lib/storage/local.test.ts`: Pre-existing failures in the generator app

**The four store tests that currently PASS (gameStore, playerStore, checksum, versionCompare) must still pass after this phase.** [VERIFIED: running test suite]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform modal picker | Custom modal component | `Alert.alert` (+ web guard) | Already imported in setup.tsx; zero new deps |
| Pack name resolution | New service/hook | Inline `availablePacks.find(p => p.id === packId)?.name` | Single lookup, no caching needed |
| Category derivation | Complex helper service | Simple `Object.entries(categoryCounts).filter(count > 0)` inline | categoryCounts is already the right data shape |

---

## Common Pitfalls

### Pitfall 1: Forgetting the `enabledCategories` filter in `playerCategories` snapshot
**What goes wrong:** `startGame()` derives `playerCategories` only from `categoryCounts`, ignoring the existing `packStore.enabledCategories` game filter. The category filter feature silently stops working for pack-aware games.
**Why it happens:** The CONTEXT.md decision focuses on categoryCounts but doesn't explicitly mention the existing filter.
**How to avoid:** In `startGame()`, after deriving categories from categoryCounts, intersect with `enabledCategories` if non-null.
**Warning signs:** Category filter toggle in pack settings has no effect during gameplay.

### Pitfall 2: Mutating gameStore's `playerCategories` with the pack filter instead of the pack's natural categories
**What goes wrong:** If `enabledCategories` is snapshotted into `playerCategories`, then the "enable all" reset during a game can't recover without a new snapshot.
**How to avoid:** Snapshot both `playerCategories` (full pack categories, count > 0) AND apply the enabled filter at query time. Or snapshot only the filtered result and document the limitation.
**Recommendation:** Snapshot the intersection at game start — this matches the immutability contract (`playerCategories` is immutable during game, same as `playerPackIds`).

### Pitfall 3: Using `packStore.enabledCategories` inside `markAnswer` after the change
**What goes wrong:** The old `getActiveCategories()` helper reads `packStore.enabledCategories` live. After the refactor, `markAnswer` uses `playerCategories[currentPlayerIndex]` (snapshotted). If `getActiveCategories()` is left in any code path alongside the per-player logic, different players can get inconsistent win conditions.
**How to avoid:** Remove `getActiveCategories()` from `markAnswer` entirely. Use only `playerCategories[currentPlayerIndex]`.

### Pitfall 4: Alert.alert button limit on web
**What goes wrong:** Testing on iOS/Android works fine with 5 pack choices in Alert.alert. The web export shows only Cancel button.
**How to avoid:** Guard the tappable chip behind `Platform.OS !== 'web'`. On web, render a non-tappable "Default" badge (web users always use the bundled pack).

### Pitfall 5: TypeScript spread on `Player` breaking existing tests
**What goes wrong:** Adding `packId?: string | null` to `Player` makes tests that assert `toEqual(player)` with an exact match fail because the property is now `undefined` on players created via `addPlayer()`.
**How to avoid:** Change exact-match assertions that include player objects to use `expect.objectContaining()`, or ensure `addPlayer` initializes `packId: null` (not `undefined`) so comparisons are stable.

### Pitfall 6: `resetAskedQuestions` in `startGame` only resets one pack
**What goes wrong:** When players have different packs, `resetAskedQuestions()` currently resets only the `activePackId` pack. Questions from other players' packs remain marked as asked from a previous game.
**How to avoid:** `startGame()` should call `resetAskedQuestions()` for each unique pack ID in `playerPackIds` (plus `activePackId`). Alternatively, reset all packs — or accept this as a known limitation if resetting multiple packs on WatermelonDB is complex (the web path already handles this correctly via `askedQuestionIds` reset). [VERIFIED: reading questionStore.ts lines 192-237]

---

## Code Examples

### Add packId to Player and updatePlayerPack action

```typescript
// types/player.ts — add to Player interface
packId?: string | null;

// stores/playerStore.ts — add to PlayerState and implementation
updatePlayerPack: (id: string, packId: string | null) => void;

// implementation:
updatePlayerPack: (id: string, packId: string | null) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, packId } : p
  ),
})),
```

### Extend GameState with per-player snapshots

```typescript
// types/game.ts — add to GameState
/** Snapshotted pack IDs per player (index matches player order) */
playerPackIds: (string | null)[];
/** Snapshotted active categories per player (derived from pack + filter) */
playerCategories: Category[][];
```

### startGame snapshot logic

```typescript
// gameStore.ts — inside startGame()
const { players } = usePlayerStore.getState();
const { activePackId, availablePacks, enabledCategories } = usePackStore.getState();

const playerPackIds = players.map(p => p.packId ?? activePackId ?? null);

function deriveCategoriesForPack(packId: string | null): Category[] {
  if (!packId) return ALL_CATEGORIES;
  const pack = availablePacks.find(p => p.id === packId);
  if (!pack) return ALL_CATEGORIES;
  const packCats = (Object.entries(pack.categoryCounts) as [Category, number][])
    .filter(([, count]) => count > 0)
    .map(([cat]) => cat);
  // Apply game-level category filter if set
  return enabledCategories && enabledCategories.length > 0
    ? packCats.filter(c => (enabledCategories as Category[]).includes(c))
    : packCats;
}

const playerCategories = playerPackIds.map(deriveCategoriesForPack);

set({
  ...existingStartGameFields,
  playerPackIds,
  playerCategories,
});
```

### selectCategory threading packId to selectQuestion

```typescript
// gameStore.ts
selectCategory: async (category: PlayerColor) => {
  const { playerPackIds, currentPlayerIndex } = get();
  const packId = playerPackIds[currentPlayerIndex] ?? null;
  const question = await useQuestionStore.getState().selectQuestion(category, packId ?? undefined);
  set({ currentCategory: category, currentQuestion: question, phase: 'answering' });
},
```

### selectQuestion with optional packId param

```typescript
// questionStore.ts — updated signature
selectQuestion: async (category: PlayerColor, packId?: string) => {
  if (Platform.OS === 'web') {
    // Web: packId ignored — always uses bundled default pack
    const question = await getNextQuestion(category, get().askedQuestionIds);
    if (question) set({ currentQuestion: question, currentCategory: category });
    return question;
  }
  // Native: resolve packId → fall back to packStore.activePackId
  const { activePackId, enabledCategories, enabledDifficulties } = usePackStore.getState();
  const resolvedPackId = packId ?? activePackId;
  if (!resolvedPackId) { logger.error('No pack available'); return null; }
  // ... rest of WatermelonDB query using resolvedPackId instead of activePackId
}
```

### markAnswer using playerCategories snapshot

```typescript
// gameStore.ts — in markAnswer, replace getActiveCategories() call:

// BEFORE:
const allDone = getActiveCategories().every(c => newCompleted.includes(c));

// AFTER:
const { playerCategories } = get();
const thisPlayerCategories = playerCategories[currentPlayerIndex] ?? ALL_CATEGORIES;
const allDone = thisPlayerCategories.every(c => newCompleted.includes(c));
```

### Pack picker in setup.tsx (mobile-only)

```typescript
// setup.tsx — per-player pack chip tap handler
const handlePickPack = (playerId: string, currentPackId: string | null) => {
  if (Platform.OS === 'web') return; // web: always default pack
  const selectablePacks = availablePacks.filter(p =>
    downloadedPackIds.includes(p.id)
  );
  Alert.alert(
    'Select Pack for Player',
    undefined,
    [
      {
        text: 'Default (game pack)',
        onPress: () => updatePlayerPack(playerId, null),
      },
      ...selectablePacks.map(p => ({
        text: p.name.length > 28 ? p.name.slice(0, 25) + '…' : p.name,
        onPress: () => updatePlayerPack(playerId, p.id),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]
  );
};
```

### Turn screen progress strip with pack name

```typescript
// turn.tsx — in progress strip render
const { playerPackIds } = useGameStore();
const availablePacks = usePackStore((state) => state.availablePacks);

// in the map:
const playerPackName = (() => {
  const pid = playerPackIds[idx];
  if (!pid) return null;
  const pack = availablePacks.find(p => p.id === pid);
  return pack?.name ? pack.name.slice(0, 12) + (pack.name.length > 12 ? '…' : '') : null;
})();

// render alongside progressCount:
{playerPackName && (
  <Text style={styles.progressPack} numberOfLines={1}>{playerPackName}</Text>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Single global `activePackId` in gameStore | Per-player `playerPackIds[]` snapshot alongside existing `activePackId` | Backward compatible; existing single-pack games unaffected |
| `getActiveCategories()` reads packStore live during gameplay | `playerCategories[]` snapshot in gameStore, derived at `startGame()` | Deterministic; immune to packStore changes mid-game |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Alert.alert` with 3+ buttons degrades on web (shows only Cancel or nothing) | Finding 5, Pitfall 4 | If wrong, the web guard is unnecessary but still safe; no functional breakage |
| A2 | `downloadedPackIds` is always empty on web (refreshDownloadedPacks returns early) | Finding 3 | If wrong (some future web pack download mechanism), the web-only "Default" badge logic would show no choices anyway — safe |

---

## Open Questions

1. **`resetAskedQuestions` for multiple packs**
   - What we know: `resetAskedQuestions()` in `questionStore.ts` resets only `activePackId`'s questions on native. With per-player packs, other players' packs are not reset.
   - What's unclear: Is this a real problem for first-session play? (No — a freshly downloaded pack has no asked questions.) Does it matter for replays? (Yes — second game with same packs won't reset questions for non-active packs.)
   - Recommendation: For this phase, call `resetAskedQuestions()` once per unique pack in `playerPackIds` during `startGame()`. This is the minimal fix. Can be done by calling the reset for each unique packId if they differ, or by extending `resetAskedQuestions` to accept a `packId` param.

2. **Championship mode "all categories" semantics with 2 players using different packs**
   - What we know: Player A uses PackX (4 categories), Player B uses PackY (6 categories). They are compared against their own `playerCategories` array.
   - What's unclear: Should the UI communicate that players have different win conditions?
   - Recommendation: Show the player's pack name in the progress strip (already in CONTEXT.md decision). The `N / M` format in the progress count automatically reflects each player's own category count. No additional UI needed.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all tooling already in the project)

---

## Project Constraints (from CLAUDE.md)

- Git author: Faiser / keepbreakfastsimple@gmail.com
- Run `npx vitest run` (via `apps/mobile/node_modules/.bin/vitest run`) before commits
- All tests that currently pass must still pass after this phase
- No new TypeScript errors introduced (pre-existing errors in unchanged files are acceptable)
- TypeScript check: `npx tsc --noEmit` must complete without errors in changed files

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `apps/mobile/stores/questionStore.ts` — full implementation of selectQuestion, both web and native paths
- [VERIFIED: codebase] `apps/mobile/stores/gameStore.ts` — startGame, selectCategory, markAnswer implementations
- [VERIFIED: codebase] `apps/mobile/stores/playerStore.ts` — Player type and store actions
- [VERIFIED: codebase] `apps/mobile/stores/packStore.ts` — PackState, downloadedPackIds, availablePacks
- [VERIFIED: codebase] `packages/types/src/question-pack.ts` — PackIndexEntry schema with categoryCounts
- [VERIFIED: codebase] `packages/types/src/category.ts` — Category type (6 values)
- [VERIFIED: codebase] `apps/mobile/app/game/setup.tsx` — Alert.alert usage pattern, player row layout
- [VERIFIED: codebase] `apps/mobile/app/game/turn.tsx` — progress strip implementation
- [VERIFIED: codebase] `apps/mobile/services/questionProvider.ts` — getNextQuestion, platform dispatch
- [VERIFIED: test run] `apps/mobile/stores/gameStore.test.ts` — 48 tests passing, mock shapes confirmed
- [VERIFIED: test run] `apps/mobile/stores/playerStore.test.ts` — 38 tests passing

### Tertiary (LOW confidence, needs validation)
- A1: Alert.alert web multi-button degradation behavior (not verified in this session)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from codebase
- Architecture: HIGH — verified from reading all modified files end-to-end
- Pitfalls: HIGH (code-derived) / LOW (Alert.alert web behavior, assumed)

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (stable codebase, no moving dependencies)
