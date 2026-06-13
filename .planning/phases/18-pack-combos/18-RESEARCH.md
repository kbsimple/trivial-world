# Phase 18: Pack Combos - Research

**Researched:** 2026-06-13
**Domain:** Zustand store design, React Native UI, WatermelonDB schema, per-player multi-pack question selection
**Confidence:** HIGH

---

## Summary

Phase 18 adds the ability to create a named "Pack Combo" — a blend of multiple question packs — that can be selected at the game level or per-player level, exactly where a single pack is selected today. A combo is a composition object: it holds a display name and an ordered list of pack IDs. At question-draw time, the game draws randomly from the union of all packs in the combo, respecting the existing difficulty and category filters.

The critical architectural question is whether a combo should be stored in WatermelonDB (durable, survives app kills) or in Zustand (transient, session-only). Given that combos are created by the user before a game, are named, and are expected to persist across sessions so they can be reused, they should live in **Zustand with persistence** — no WatermelonDB table is needed. Combos reference pack IDs (UUIDs) that WatermelonDB manages; the combo itself is metadata that lives neatly in the Zustand `packStore` alongside `activePackId`, `availablePacks`, and `downloadedPackIds`. A WatermelonDB table for combos would add schema-migration overhead with no real benefit over Zustand's persist middleware for a handful of saved combo objects.

Question selection from a combo requires one change: `selectQuestion(category, packId?, difficulty?)` currently receives a single optional `packId`. With combos, the concept expands to an optional `comboPackIds: string[]` (the combo's pack list). The mobile WatermelonDB path repeats the per-pack query for each pack in the combo and pools the results before random selection. The web path pools questions from each fetched pack. This is a contained change — callers in `gameStore.selectCategory` just pass a different argument shape.

The per-player model mirrors exactly what Phases 15 and 17 established. The player can have either a single `packId` or a reference to a combo. The cleanest representation is a union type on `Player`: `packId?: string | null` stays for a single pack; a new `comboId?: string | null` is added for a combo reference. At `startGame()`, the snapshot logic resolves each player's effective pack list (one pack → `[packId]`, combo → `combo.packIds`) into `playerPackIds` but must change that field's type from `(string | null)[]` to `(string[] | null)[]` — or alternatively, introduce a `playerComboIds` snapshot alongside the existing `playerPackIds`.

The simplest compatible design (recommended): keep `playerPackIds: (string | null)[]` for backwards compatibility, and add `playerPackIdLists: (string[] | null)[]` — where `null` means "use game-level defaults" and `string[]` means "draw from this list of pack IDs". `playerPackIds` can then become the flattened fallback used only where a single pack ID is needed (turn display label). Question selection switches to reading `playerPackIdLists[idx]`.

**Primary recommendation:** Implement Pack Combos as named Zustand entities in `packStore`. Add a `comboId?: string | null` field to `Player`. Snapshot a `playerPackIdLists: (string[] | null)[]` into `GameState` at `startGame()`. Extend `selectQuestion` to accept `packIds?: string[]`. Build a combo management UI on the existing packs screen (or a new `/packs/combos` route). No WatermelonDB schema change needed.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Combo definition storage | Mobile app (Zustand `packStore`) | — | Combos are named user preferences, same tier as `activePackId` and `downloadedPackIds` |
| Combo CRUD UI | Mobile app (`/packs/combos` screen or inline on packs screen) | — | UI-layer concern; no server needed |
| Player combo assignment | Mobile app (Zustand `playerStore`) | — | Same pattern as per-player `packId` — player metadata |
| Combo snapshot at game start | Mobile app (`gameStore.startGame`) | packStore (source) | Resolves combo → pack ID list at snapshot time, same as `playerPackIds` |
| Multi-pack question draw | Mobile app (`questionStore.selectQuestion`) | WatermelonDB (native) / web bundle | Extends existing per-pack query to loop over pack list |
| Game-level combo selection | Mobile app (packs screen) | — | `activePackId` → replaced/extended with `activeComboId` or single-vs-combo dispatch |
| Turn screen display | Mobile app (`turn.tsx`) | — | Show combo name instead of pack name in progress strip |

---

## Standard Stack

No new dependencies required. All changes use existing libraries.

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | 5.x | Combo storage in `packStore` | Already drives all stores; persist middleware handles combo durability [VERIFIED: `apps/mobile/stores/packStore.ts`] |
| `@trivial-world/types` | workspace | Zod schemas for `PackCombo` type | Already owns `PackIndexEntry`, `Category`, `Difficulty` — combo schema belongs here [VERIFIED: `packages/types/src/question-pack.ts`] |
| `@nozbe/watermelondb` | installed | Multi-pack query by looping pack IDs | Already used in `selectQuestion` native path [VERIFIED: `apps/mobile/stores/questionStore.ts` line 113] |
| React Native `Alert` | built-in | Combo picker in setup screen — same pattern as pack chip and difficulty chip | Already used in `setup.tsx` lines 95-109, 114-125 [VERIFIED: `apps/mobile/app/game/setup.tsx`] |
| `expo-router` | installed | Navigation to combo management screen if added as new route | Already drives app navigation [VERIFIED: `apps/mobile/app/`] |

### No new installs required
[VERIFIED: checking `apps/mobile/package.json` not needed — all libraries confirmed via store and UI code reads]

---

## Architecture Patterns

### System Architecture Diagram

```
Packs Screen (app/packs/index.tsx) — extended or new /packs/combos route
  │  "Create Combo" button → name input + multi-select from downloadedPackIds
  │  packStore.createCombo({ name, packIds })
  │  Saved combos listed alongside individual packs
  │
  ▼
Pack Selection Screen / Setup Screen
  │  Game-level: user selects either a single pack OR a combo as the "active source"
  │    packStore.activePackId (single) OR packStore.activeComboId (combo)
  │
  │  Per-player chip (setup.tsx, native only, Row 2):
  │    Player can override with a single pack OR a combo
  │    player.packId (single pack) OR player.comboId (combo reference)
  │
  ▼
gameStore.startGame()
  │  For each player:
  │    if player.comboId → resolve combo.packIds → playerPackIdLists[i] = combo.packIds
  │    elif player.packId → playerPackIdLists[i] = [player.packId]
  │    else (game-level):
  │      if activeComboId → resolve → playerPackIdLists[i] = activeCombo.packIds
  │      else → playerPackIdLists[i] = [activePackId]
  │  Also derive playerCategories (union of all packs' categoryCounts)
  │  Also derive playerPackIds (flattened display label: first pack in list or combo name)
  │
  ▼
gameStore.selectCategory(category)
  │  packIdList = playerPackIdLists[currentPlayerIndex] ?? [activePackId]
  │  difficulty = playerDifficulties[currentPlayerIndex] ?? undefined
  │  → questionStore.selectQuestion(category, packIds, difficulty)
  │
  ▼
questionStore.selectQuestion(category, packIds?, difficulty?)
  │  Mobile (WatermelonDB):
  │    For each packId in packIds:
  │      fetch pack record, query questions WHERE category + not asked + pack_id
  │    Pool all results, apply difficulty filter, random pick
  │  Web (bundled):
  │    For each packId in packIds:
  │      await fetchWebPackQuestions(packId) → pool results
  │    Apply category + difficulty + excludeIds filter, random pick
  │
  ▼
Turn Screen (app/game/turn.tsx)
  │  Progress strip: show combo name if player used a combo, else pack name (existing logic)
  │  Source: playerComboDisplayNames[idx] ?? displayPackName (derived at snapshot or computed inline)
```

### Recommended Project Structure

New/changed files only — no structural reorganization needed:

```
packages/types/src/
└── question-pack.ts         # Add PackComboSchema + PackCombo type

apps/mobile/
├── stores/packStore.ts      # Add savedCombos[], activeComboId, combo CRUD actions
├── stores/playerStore.ts    # Add comboId?: string | null to Player; updatePlayerCombo action
├── types/game.ts            # Add playerPackIdLists: (string[] | null)[] to GameState
├── types/player.ts          # Add comboId?: string | null to Player interface
├── stores/gameStore.ts      # Extend startGame() to resolve combos; change selectCategory
├── stores/questionStore.ts  # Change selectQuestion signature: packIds?: string[]
├── services/questionProvider.ts # Multi-pack pooling in getNextQuestionFromBundle + database path
└── app/
    ├── game/setup.tsx       # Extend per-player chip to show/select combos
    ├── packs/index.tsx      # Add combo management UI or link to combos route
    └── packs/combos.tsx     # NEW: Combo list + create/edit screen (optional new file)
```

### Pattern 1: PackCombo type (packages/types)

**What:** New Zod schema in `packages/types` defining a named blend of pack IDs.
**When to use:** Whenever a combo is created, stored, or validated.

```typescript
// Source: packages/types/src/question-pack.ts — add alongside PackIndexEntrySchema
export const PackComboSchema = z.object({
  id: z.string().uuid(),           // generated at creation time
  name: z.string().min(1).max(50), // user-visible display name
  packIds: z.array(z.string().uuid()).min(2, 'A combo needs at least 2 packs'),
  createdAt: z.string().datetime(),
});
export type PackCombo = z.infer<typeof PackComboSchema>;
```

Minimum 2 packs enforces the "blend" concept — a single-pack combo is just a regular pack selection.

### Pattern 2: packStore — savedCombos + activeComboId

**What:** Two new fields in `PackState` plus three new actions.
**When to use:** Combo creation/deletion and game-level combo selection.

```typescript
// Source: apps/mobile/stores/packStore.ts — PackState interface (verified)
// Add to PackState:
savedCombos: PackCombo[];          // user-created combos, persisted
activeComboId: string | null;      // selected combo for current game-level (null = single pack)

// Add actions:
createCombo: (name: string, packIds: string[]) => void;
deleteCombo: (comboId: string) => void;
selectCombo: (comboId: string | null) => void; // null clears combo, falls back to activePackId
```

In `partialize`, add `savedCombos` and `activeComboId` alongside existing `activePackId`.

Note: `activeComboId` and `activePackId` are mutually exclusive in use — when a combo is selected, `activePackId` remains as a fallback or is superseded by the combo. The cleanest pattern: `activeComboId` takes precedence; when non-null, the game uses the combo's pack list; when null, game uses `activePackId` (single pack). This preserves full backward compatibility.

### Pattern 3: Player model — comboId

**What:** Add `comboId?: string | null` to `Player`, mirroring the `packId` field.
**When to use:** When a player overrides to a combo rather than a single pack.

```typescript
// Source: apps/mobile/types/player.ts — Player interface (verified)
export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  wedges: PlayerColor[];
  packId?: string | null;            // existing — single pack override
  comboId?: string | null;           // NEW — combo override
  difficultyPreference?: Difficulty | null; // existing
}
```

`packId` and `comboId` are mutually exclusive per player — selecting one clears the other. When neither is set, the player inherits the game-level combo or pack.

### Pattern 4: GameState — playerPackIdLists snapshot

**What:** Add `playerPackIdLists: (string[] | null)[]` to `GameState`. This replaces the role of `playerPackIds` for question selection while `playerPackIds` is retained for display purposes.
**When to use:** `startGame()` resolves each player's effective pack source into this list.

```typescript
// Source: apps/mobile/types/game.ts — GameState interface (verified)
// Add to GameState:
/** Resolved list of pack IDs per player — may be from combo or single pack.
 *  null = use game-level fallback. Used by selectQuestion for multi-pack draw. */
playerPackIdLists: (string[] | null)[];
```

The existing `playerPackIds: (string | null)[]` is kept but becomes the "primary display pack ID" — the first pack in the list (for the progress strip name label). A new field `playerComboNames: (string | null)[]` can be added for display if a combo name should be shown instead.

### Pattern 5: startGame() combo resolution

**What:** In `gameStore.startGame()`, resolve each player's pack source before snapshotting.

```typescript
// Source: apps/mobile/stores/gameStore.ts — startGame (verified lines 51-119)
// Resolution priority per player (after reading from packStore):
// 1. player.comboId → find combo → packIds
// 2. player.packId → [packId]
// 3. activeComboId → find combo → packIds
// 4. activePackId → [activePackId]

function resolvePlayerPackIdList(
  player: Player,
  activePackId: string | null,
  activeComboId: string | null,
  savedCombos: PackCombo[]
): string[] {
  if (player.comboId) {
    const combo = savedCombos.find(c => c.id === player.comboId);
    if (combo) return combo.packIds;
  }
  if (player.packId) return [player.packId];
  if (activeComboId) {
    const combo = savedCombos.find(c => c.id === activeComboId);
    if (combo) return combo.packIds;
  }
  if (activePackId) return [activePackId];
  return [];
}
```

`playerPackIdLists` is then `players.map(p => resolvePlayerPackIdList(p, ...))`.

### Pattern 6: selectQuestion — multi-pack pooling (native WatermelonDB)

**What:** Change the signature of `selectQuestion` to accept `packIds?: string[]` instead of `packId?: string`. The mobile path queries WatermelonDB for each pack ID, pools results, applies difficulty filter, and random-picks.

```typescript
// Source: apps/mobile/stores/questionStore.ts — selectQuestion (verified lines 66-166)
// Signature change:
selectQuestion: (category: PlayerColor, packIds?: string[], difficulty?: Difficulty) => Promise<Question | null>

// Mobile path — replace single-pack lookup with loop:
const resolvedPackIds = packIds ?? (activePackId ? [activePackId] : []);
if (resolvedPackIds.length === 0) { logger.error('No packs available'); return null; }

let allQuestions: QuestionModelType[] = [];
for (const pid of resolvedPackIds) {
  const packs = await database.get('question_packs').query(Q.where('pack_id', pid)).fetch();
  if (packs.length === 0) continue;
  const qs = await database.get('questions').query(
    Q.where('question_pack_id', packs[0].id),
    Q.where('category', category),
    Q.where('asked_at', null)
  ).fetch();
  allQuestions = [...allQuestions, ...(qs as QuestionModelType[])];
}
// Then apply difficulty filter and random pick as before
```

### Pattern 7: selectQuestion — multi-pack pooling (web bundle)

**What:** The web path already has `fetchWebPackQuestions(packId)` for a single pack. Extend to loop.

```typescript
// Source: apps/mobile/services/questionProvider.ts — getNextQuestionFromBundle (verified lines 86-116)
// Replace single-pack pool construction:
const poolArrays = await Promise.all(
  (packIds ?? []).map(pid => pid ? fetchWebPackQuestions(pid) : null)
);
const pool: Question[] = poolArrays.some(Boolean)
  ? poolArrays.flatMap(qs => qs ?? [])
  : ALL_QUESTIONS; // fallback to bundled default

// Then apply category + excludeIds + difficulty filter as before
```

### Pattern 8: Setup UI — combo chip

**What:** Extend the per-player chip row in `setup.tsx` to allow selecting a combo. The pack chip currently shows "Default | PackName" — extend to show "Default | PackName | ComboName" choice.

```typescript
// Source: apps/mobile/app/game/setup.tsx — handlePickPack (verified lines 90-110)
const handlePickSource = (playerId: string) => {
  if (Platform.OS === 'web') return;
  const selectablePacks = availablePacks.filter(p => downloadedPackIds.includes(p.id));
  Alert.alert(
    'Select Pack or Combo',
    undefined,
    [
      { text: 'Default (game source)', onPress: () => { updatePlayerPack(playerId, null); updatePlayerCombo(playerId, null); } },
      ...selectablePacks.map(p => ({
        text: p.name.length > 28 ? p.name.slice(0, 25) + '...' : p.name,
        onPress: () => { updatePlayerPack(playerId, p.id); updatePlayerCombo(playerId, null); },
      })),
      ...savedCombos.map(c => ({
        text: `Combo: ${c.name.length > 22 ? c.name.slice(0, 19) + '...' : c.name}`,
        onPress: () => { updatePlayerCombo(playerId, c.id); updatePlayerPack(playerId, null); },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]
  );
};
```

The chip label changes: if `player.comboId` is set, show combo name; if `player.packId` is set, show pack name; otherwise "Default".

### Pattern 9: Category derivation for combos

**What:** `deriveCategoriesForPack` in `startGame()` currently derives categories from one pack's `categoryCounts`. For combos, take the **union** of all packs' categories.

```typescript
// Source: apps/mobile/stores/gameStore.ts — deriveCategoriesForPack (verified lines 70-82)
function deriveCategoriesForPackList(packIds: string[]): PlayerColor[] {
  const { availablePacks } = usePackStore.getState();
  const allCats = new Set<PlayerColor>();
  for (const pid of packIds) {
    const pack = availablePacks.find(p => p.id === pid);
    if (!pack) continue;
    (Object.entries(pack.categoryCounts) as [PlayerColor, number][])
      .filter(([, count]) => count > 0)
      .forEach(([cat]) => allCats.add(cat));
  }
  return allCats.size > 0 ? [...allCats] : ALL_CATEGORIES;
}
```

### Anti-Patterns to Avoid

- **Do not store combos in WatermelonDB.** Combos are user configuration, not downloaded content. Zustand persist is sufficient and avoids schema migration complexity. WatermelonDB is for immutable question content.
- **Do not make `packId` and `comboId` co-exist as independently truthy on a player.** They are mutually exclusive: selecting one must clear the other in the `updatePlayerPack` / `updatePlayerCombo` actions.
- **Do not change `playerPackIds` type to `string[][] | null[]`.** This would break existing tests and the type signature of downstream consumers. Instead, add the parallel `playerPackIdLists` field and keep `playerPackIds` as a flattened display artifact.
- **Do not pool questions by fetching all questions first and then filtering.** For the native WatermelonDB path, loop per pack ID and let WatermelonDB do the filtering — avoid loading all questions from all packs into memory.
- **Do not forget to reset asked questions for all packs in a combo.** The existing `resetAskedQuestions` loop in `startGame()` already iterates over unique pack IDs; extend it to include all pack IDs from combos.
- **Do not let the web path pool from an empty list.** If `packIds` is empty or all fetches fail, fall back to `ALL_QUESTIONS` so the game doesn't silently die.
- **Do not allow a combo with fewer than 2 packs.** A single-pack combo is semantically a pack selection. Validate at creation time.

---

## Open Architecture Decision: How Many Zustand Fields?

Two valid designs exist. The planner should pick one.

### Option A: `playerPackIdLists` parallel to `playerPackIds` (recommended)

**Add:** `playerPackIdLists: (string[] | null)[]` to `GameState`
**Keep:** `playerPackIds: (string | null)[]` for turn-screen display (first pack ID label)
**Trade-off:** Two overlapping fields, but no breaking change to existing code paths. `playerPackIds[i]` continues to serve as the "primary display pack" and as the key for `resetAskedQuestions`. `playerPackIdLists[i]` drives question selection.

### Option B: Replace `playerPackIds` with `playerPackIdLists`

**Change:** `playerPackIds: (string | null)[]` → `playerPackIdLists: (string[] | null)[]` where each entry is a list (1 or more IDs)
**Trade-off:** Cleaner type, but requires updating every consumer of `playerPackIds` (turn.tsx, gameStore tests, question reset loop). Requires a migration of existing serialized Zustand state that has `playerPackIds` shape.

**Recommendation:** Option A for this phase. Option B is a future refactor.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combo persistence | SQLite/WatermelonDB table | Zustand `persist` in `packStore` | Combos are config-like data; ~10 combos max; Zustand is already the storage for similar data (`activePackId`, `downloadedPackIds`) |
| Multi-pack random question draw | Custom question service | Loop in existing `selectQuestion` with array param | Existing WatermelonDB query pattern is already per-pack; looping adds minimal code |
| UUID generation for combo IDs | Custom ID library | `crypto.randomUUID()` (existing fallback in `playerStore.ts`) | Already used for player IDs; same pattern works for combo IDs [VERIFIED: `playerStore.ts` lines 13-18] |
| Combo validation | Manual length/UUID checks | `PackComboSchema` (Zod) in `@trivial-world/types` | Consistent with all other types in the project; Zod already handles UUID and min-2 validation |
| Category union for combo | Complex merge logic | `Set` + `Object.entries(categoryCounts)` loop | `categoryCounts` is already the right shape; union is a simple Set operation |

---

## Common Pitfalls

### Pitfall 1: `playerPackIds` still used in `resetAskedQuestions` loop but doesn't cover combo packs

**What goes wrong:** `startGame()` already loops over `uniquePackIds` from `playerPackIds` to reset asked questions. If `playerPackIds` is set to just the first pack ID in a combo (for display), but `playerPackIdLists` has the full multi-pack list, the reset loop won't clear asked questions for packs 2..N of each combo.

**Why it happens:** The reset loop was designed for single-pack-per-player. Combos add multiple pack IDs that aren't captured in `playerPackIds`.

**How to avoid:** In `startGame()`, compute `uniquePackIdsForReset` from the full `playerPackIdLists` (flatten + deduplicate), not from `playerPackIds`. Pass this full set to the reset loop.

**Warning signs:** Second game with a combo sees repeat questions from all packs except the first.

### Pitfall 2: `selectCategory` still passes `packId` (singular) instead of `packIds` (list)

**What goes wrong:** `gameStore.selectCategory` reads `playerPackIds[currentPlayerIndex]` and passes it as `packId` to `selectQuestion`. If the signature change is not propagated through `selectCategory`, combos silently fall back to single-pack behavior.

**Why it happens:** `selectCategory` is a call site that needs updating but is not part of `questionStore`. It's easy to forget one layer in the chain.

**How to avoid:** Update `selectCategory` to read `playerPackIdLists[currentPlayerIndex]` and pass it as `packIds` to `selectQuestion`. Check that `selectQuestion`'s mock in `gameStore.test.ts` is updated to expect the new signature.

**Warning signs:** Combo games only draw questions from the first pack in the combo.

### Pitfall 3: `player.packId` not cleared when `player.comboId` is set (and vice versa)

**What goes wrong:** `updatePlayerCombo` sets `comboId` but doesn't clear `packId`. `resolvePlayerPackIdList` in `startGame()` checks `comboId` first, so it works at game start — but the UI shows stale pack chip state because `packId` is still set.

**Why it happens:** The two fields are conceptually exclusive but technically independent. Neither store action automatically clears the other.

**How to avoid:** In `updatePlayerCombo(id, comboId)`: if `comboId` is non-null, also set `packId: null`. In `updatePlayerPack(id, packId)`: if `packId` is non-null, also set `comboId: null`. Clearing null-to-null is harmless; this keeps the fields mutually exclusive.

### Pitfall 4: Combo packs not all downloaded on native

**What goes wrong:** A combo references 3 packs. The user has only downloaded 2 of them. The third has no WatermelonDB rows, so `selectQuestion` gets zero questions from it (not an error, just no contribution). If the user doesn't notice, they think the combo is working but it's actually drawing from a partial set.

**Why it happens:** Combo creation UI allows selecting any pack from `availablePacks` (index), not just `downloadedPackIds`. On native, only downloaded packs have WatermelonDB data.

**How to avoid:** Combo creation UI should only show packs that are both in `availablePacks` AND in `downloadedPackIds` (same filter as the existing per-player pack picker). Show a warning badge on a combo if any of its packs are not downloaded. At game start, log a warning if any pack in a player's combo has no WatermelonDB record.

### Pitfall 5: `playerPackIdLists` not in `partialize` → lost on app backgrounding

**What goes wrong:** Same as the Phase 17 pitfall with `playerDifficulties` — if the new field is added to state but not to `partialize`, it is excluded from AsyncStorage and is lost on app resume.

**Why it happens:** `partialize` is a whitelist in `gameStore`. Every new state field requires explicit addition.

**How to avoid:** Add `playerPackIdLists: state.playerPackIdLists` to the `partialize` callback at the same time as the field is added to `GameState`.

### Pitfall 6: `savedCombos` not in `packStore`'s `partialize` → combos disappear after app kill

**What goes wrong:** User creates combos, closes app, reopens — combos are gone. This is the most user-visible bug.

**Why it happens:** `packStore`'s `partialize` currently includes `downloadedPackIds`, `activePackId`, `enabledCategories`, `enabledDifficulties`. New fields are excluded unless added.

**How to avoid:** Add `savedCombos: state.savedCombos` and `activeComboId: state.activeComboId` to `packStore`'s `partialize` callback.

### Pitfall 7: Alert.alert button count limit when showing many packs + combos

**What goes wrong:** The per-player source picker shows individual packs + combos in a single `Alert.alert`. If the user has 6 downloaded packs and 4 combos, the list is 10+ options. Alert.alert on iOS renders all buttons but can become very long; on web it may degrade (existing known limitation from Phase 15).

**Why it happens:** Alert.alert is unbounded in length.

**How to avoid:** Consider splitting the picker into two steps ("pick type: pack or combo" → "pick item"), or apply a reasonable limit. Since combos are user-created, a user with 10 combos is unlikely but possible. A modal Pressable list is an alternative — but this phase should match the existing Alert.alert pattern and flag the issue in the plan for the developer to evaluate. The web guard (`if (Platform.OS === 'web') return`) already prevents this on web.

### Pitfall 8: `gameStore.test.ts` mock for `packStore` doesn't include `savedCombos`

**What goes wrong:** Existing test mocks return `{ activePackId: 'test-pack-id', availablePacks: [], enabledCategories: null }`. The new `startGame()` also reads `savedCombos` and `activeComboId` from packStore. If these are undefined in the mock, `combo.packIds` access throws.

**Why it happens:** The mock is an incomplete object cast as `any`.

**How to avoid:** Add `savedCombos: [], activeComboId: null` to the packStore mock in `gameStore.test.ts` before adding any new combo-reading code in `startGame()`.

---

## Code Examples

### PackCombo type in packages/types

```typescript
// Source: packages/types/src/question-pack.ts — add after PackIndexEntrySchema (verified file)
export const PackComboSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Combo name is required').max(50),
  packIds: z.array(z.string().uuid()).min(2, 'A combo needs at least 2 packs'),
  createdAt: z.string().datetime(),
});
export type PackCombo = z.infer<typeof PackComboSchema>;
```

Export from `packages/types/src/index.ts` alongside `PackIndexEntry`.

### packStore additions

```typescript
// Source: apps/mobile/stores/packStore.ts — PackState interface (verified)
// Add to PackState:
savedCombos: PackCombo[];
activeComboId: string | null;

createCombo: (name: string, packIds: string[]) => void;
deleteCombo: (comboId: string) => void;
selectCombo: (comboId: string | null) => void;

// Implementation:
savedCombos: [],
activeComboId: null,

createCombo: (name, packIds) => {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `combo-${Date.now()}`;
  const combo: PackCombo = { id, name, packIds, createdAt: new Date().toISOString() };
  set((state) => ({ savedCombos: [...state.savedCombos, combo] }));
},
deleteCombo: (comboId) => set((state) => ({
  savedCombos: state.savedCombos.filter(c => c.id !== comboId),
  activeComboId: state.activeComboId === comboId ? null : state.activeComboId,
})),
selectCombo: (comboId) => set({ activeComboId: comboId }),

// In partialize, add:
savedCombos: state.savedCombos,
activeComboId: state.activeComboId,
```

### Player model extension

```typescript
// Source: apps/mobile/types/player.ts — Player interface (verified)
export interface Player {
  // ... existing fields
  packId?: string | null;
  comboId?: string | null;           // NEW
  difficultyPreference?: Difficulty | null;
}

// Source: apps/mobile/types/player.ts — PlayerState interface (verified)
export interface PlayerState {
  // ... existing actions
  updatePlayerPack: (id: string, packId: string | null) => void;
  updatePlayerCombo: (id: string, comboId: string | null) => void;  // NEW
  // ...
}
```

In `playerStore.ts`:
- `addPlayer`: initialize `comboId: null` alongside `packId: null`
- `updatePlayerPack`: when `packId` is non-null, also set `comboId: null`
- `updatePlayerCombo`: set `comboId`, and also set `packId: null` when non-null

### GameState additions

```typescript
// Source: apps/mobile/types/game.ts — GameState interface (verified)
// Add:
/** Resolved pack ID list per player (from combo or single pack). Drives question selection. */
playerPackIdLists: (string[] | null)[];
```

In `gameStore.ts`'s `resetGame` and initial state: `playerPackIdLists: []`. In `partialize`: add `playerPackIdLists: state.playerPackIdLists`.

### selectQuestion signature change

```typescript
// Source: apps/mobile/stores/questionStore.ts — QuestionState interface (verified line 43)
// CHANGE from:
selectQuestion: (category: PlayerColor, packId?: string, difficulty?: Difficulty) => Promise<Question | null>;
// TO:
selectQuestion: (category: PlayerColor, packIds?: string[], difficulty?: Difficulty) => Promise<Question | null>;
```

Note: callers in `gameStore.selectCategory` must also change from passing `packId` → `packIds`.

### selectCategory threading change

```typescript
// Source: apps/mobile/stores/gameStore.ts — selectCategory (verified lines 121-131)
selectCategory: async (category: PlayerColor) => {
  const { playerPackIdLists, playerDifficulties, currentPlayerIndex, activePackId } = get();
  const packIds = playerPackIdLists[currentPlayerIndex] ?? (activePackId ? [activePackId] : undefined);
  const difficulty = (playerDifficulties ?? [])[currentPlayerIndex] ?? undefined;
  const question = await useQuestionStore.getState().selectQuestion(category, packIds, difficulty);
  set({
    currentCategory: category,
    currentQuestion: question,
    phase: 'answering',
  });
},
```

---

## Runtime State Inventory

This phase adds new fields to existing Zustand stores (no rename/refactor).

**Stored data:** `packStore` gains `savedCombos[]` and `activeComboId`. These are new fields — existing persisted state will rehydrate with them as `undefined`, which Zustand's `partialize` merge treats as absent. The implementation must initialize them to `[]` / `null` in store initial state so the `?? []` fallback is clean. No data migration needed. [VERIFIED: `packStore.ts` partialize pattern]

**Live service config:** None.

**OS-registered state:** None.

**Secrets/env vars:** None.

**Build artifacts:** None — `packages/types` gains a new export but this is handled by `pnpm build` as normal.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 18 is purely code changes to existing files plus a new screen. No new external tools, services, CLIs, runtimes, or databases are required.

---

## State of the Art

| Old Approach | Current Approach (Post Phase 18) | Impact |
|--------------|----------------------------------|--------|
| Single `packId` per player | Player can hold `packId` (single) OR `comboId` (multi-pack blend) | Richer configuration; no breaking change to single-pack path |
| `selectQuestion(category, packId?)` | `selectQuestion(category, packIds?)` | Multi-pack question pooling enabled |
| `playerPackIds: (string | null)[]` | + `playerPackIdLists: (string[] | null)[]` | Full pack list available for question draw without breaking display label field |
| Per-player pack chip shows only packs | Per-player chip shows packs + combos | UI extends naturally within existing chip row |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Combos should be stored in Zustand (not WatermelonDB) | Summary, Pattern 2 | If wrong (user wants combos synced/exported), a WatermelonDB table or file-based storage would be needed — increases scope |
| A2 | Minimum 2 packs in a combo enforced at creation | Pattern 1 | If wrong (1-pack combos allowed), the distinction between a combo and a pack disappears — UI confusion |
| A3 | `playerPackIds` is kept as-is (display only) and `playerPackIdLists` is added as a parallel field | Open Architecture Decision | If planner chooses Option B (replace `playerPackIds`), all consumers must be updated and a serialized state migration is needed |
| A4 | Alert.alert is sufficient for the per-player source picker (pack or combo) with the existing Web guard | Pattern 8 | If user has many packs + many combos, Alert.alert becomes unwieldy — alternative: modal list or two-step picker |
| A5 | No web support for combo-based question selection (same as per-player pack: web uses bundled pool) | System Architecture Diagram | If wrong and web should support combos via fetched pack JSON, `getNextQuestionFromBundle` needs the multi-pack pool path — already described in Pattern 7 |
| A6 | `packId` and `comboId` are mutually exclusive per player | Pattern 3 | If wrong (user wants a pack + a combo simultaneously), the model and resolution logic must change significantly |

---

## Open Questions

1. **Should combo management be inline on the existing packs screen or a separate `/packs/combos` route?**
   - What we know: The packs screen (`app/packs/index.tsx`) is already moderately complex (FlatList, download progress, modal, category/difficulty filters). Adding a combo section inline would require visual separation.
   - What's unclear: How often will users create/edit combos vs just selecting one? If combo management is rare, a separate route is cleaner.
   - Recommendation: Add a "Combos" button or tab to the packs screen that navigates to `app/packs/combos.tsx` — a dedicated combo list + create/edit screen. Keeps the existing packs screen from growing unbounded. The planner can decide.

2. **Should `activeComboId` replace `activePackId` at the game level, or coexist with it?**
   - What we know: Currently `activePackId` is the single source for game-level pack selection. Adding `activeComboId` means two fields can represent the "active source".
   - What's unclear: User experience when both are set (stale state from previous selections).
   - Recommendation: Treat them as mutually exclusive: `selectCombo()` sets `activeComboId` and clears `activePackId` (or vice versa via `selectPack()`). This mirrors the `packId`/`comboId` mutual exclusion on `Player`. The planner should decide how the game-level pack/combo UI communicates this.

3. **What happens when a pack in a combo is deleted/overwritten?**
   - What we know: Pack deletion is not currently a supported operation in the UI (packs can be re-downloaded but there's no explicit delete). However, a pack update downloads a new version.
   - What's unclear: If a combo references a pack UUID that no longer exists in WatermelonDB (e.g., after a data wipe), should the combo silently drop that pack or throw an error?
   - Recommendation: Silently skip missing packs during question draw (emit a warning log). Show a "partial" or "stale" indicator on the combo card if any referenced packs are not in `downloadedPackIds`.

---

## Validation Architecture

`workflow.nyquist_validation` is `false` in `.planning/config.json`. Section skipped.

---

## Security Domain

Phase 18 adds UI pickers and in-memory/persisted combo state. No authentication, session management, access control, or cryptography is involved. Combo names are user-typed strings displayed in the app only — no injection surface.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this phase |
| V3 Session Management | No | No session tokens |
| V4 Access Control | No | Local gameplay, no server |
| V5 Input Validation | Yes (trivial) | Combo name is max-50-char string; `PackComboSchema` (Zod) validates at creation |
| V6 Cryptography | No | No crypto |

---

## Sources

### Primary (HIGH confidence)
- `apps/mobile/stores/packStore.ts` — confirmed `PackState` fields, `partialize` callback, `availablePacks`, `downloadedPackIds` [VERIFIED: read directly]
- `apps/mobile/stores/playerStore.ts` — confirmed `updatePlayerPack` pattern, `packId: null` initialization in `addPlayer`, `updatePlayerDifficulty` analogue [VERIFIED: read directly]
- `apps/mobile/stores/gameStore.ts` — confirmed full `startGame()` implementation including combo-ready `resolvePlayerPackIdList` pattern, `selectCategory` flow, `playerDifficulties` snapshot, `resetGame` field list, `partialize` whitelist [VERIFIED: read directly, lines 51-267]
- `apps/mobile/stores/questionStore.ts` — confirmed `selectQuestion(category, packId?, difficulty?)` current signature, WatermelonDB per-pack query pattern (lines 99-134), difficulty filter logic [VERIFIED: read directly]
- `apps/mobile/services/questionProvider.ts` — confirmed `getNextQuestionFromBundle` with `packId?` → `fetchWebPackQuestions` → pool pattern; per-pack web fetch cache [VERIFIED: read directly]
- `apps/mobile/app/game/setup.tsx` — confirmed per-player chip Row 2 (lines 226-252), `handlePickPack` / `handlePickDifficulty` Alert.alert patterns [VERIFIED: read directly]
- `apps/mobile/app/game/turn.tsx` — confirmed progress strip combo-ready structure (lines 109-145): already reads `playerPackIds` and `playerDifficulties` per-index [VERIFIED: read directly]
- `apps/mobile/app/packs/index.tsx` — confirmed packs screen structure (FlatList, modal, filters) for informing combo management placement decision [VERIFIED: read directly]
- `apps/mobile/types/player.ts` — confirmed `Player` with `packId?: string | null` and `difficultyPreference?: Difficulty | null` as template [VERIFIED: read directly]
- `apps/mobile/types/game.ts` — confirmed `GameState` fields `playerPackIds`, `playerCategories`, `playerDifficulties` [VERIFIED: read directly]
- `packages/types/src/question-pack.ts` — confirmed `PackIndexEntrySchema` shape as template for `PackComboSchema` [VERIFIED: read directly]
- `apps/mobile/database/schema.ts` — confirmed no WatermelonDB change needed (schema v3, no combos table) [VERIFIED: read directly]
- `apps/mobile/database/migrations/index.ts` — confirmed migration v1→v3 pattern for reference [VERIFIED: read directly]
- `apps/mobile/stores/gameStore.test.ts` — confirmed `packStore` mock shape (lines 33-43) that must be extended with `savedCombos`, `activeComboId` [VERIFIED: read directly]
- `.planning/config.json` — confirmed `nyquist_validation: false` [VERIFIED: read directly]

### Secondary (MEDIUM confidence)
- `.planning/phases/15-per-player-pack-selection/15-RESEARCH.md` — confirmed original per-player pack design decisions that Phase 18 extends
- `.planning/phases/17-per-player-pack-and-difficulty/17-RESEARCH.md` — confirmed `playerDifficulties` snapshot pattern as exact model for `playerPackIdLists`

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new deps; all existing libraries verified in source files
- Architecture: HIGH — every file referenced was read; patterns are direct extensions of Phase 15/17 patterns already in production
- Pitfalls: HIGH — derived from reading actual code (partialize whitelists, selectCategory call site, mock shapes in tests, mutual-exclusion design)
- Open questions: MEDIUM — architectural choices (Option A vs B, combo storage location) are design decisions for the planner to confirm

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable domain; all patterns are internal to this codebase)
