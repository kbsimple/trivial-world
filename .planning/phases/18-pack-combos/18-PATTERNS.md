# Phase 18: Pack Combos - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/types/src/question-pack.ts` | model/schema | transform | itself (add alongside `PackIndexEntrySchema`) | exact — same file, same pattern |
| `packages/types/src/index.ts` | config/export | transform | itself (add alongside `PackIndexEntry`) | exact |
| `apps/mobile/types/player.ts` | model | transform | itself (`packId?: string | null` as template) | exact |
| `apps/mobile/types/game.ts` | model | transform | itself (`playerDifficulties` as template for `playerPackIdLists`) | exact |
| `apps/mobile/stores/packStore.ts` | store | CRUD | itself (`activePackId` / `downloadedPackIds` persist pattern) | exact |
| `apps/mobile/stores/playerStore.ts` | store | CRUD | itself (`updatePlayerPack` / `updatePlayerDifficulty` pattern) | exact |
| `apps/mobile/stores/gameStore.ts` | store | event-driven | itself (`startGame`, `selectCategory`, `partialize`) | exact |
| `apps/mobile/stores/questionStore.ts` | store | request-response | itself (current `selectQuestion` signature + WatermelonDB loop) | exact |
| `apps/mobile/services/questionProvider.ts` | service | request-response | itself (`getNextQuestionFromBundle`, `fetchWebPackQuestions`) | exact |
| `apps/mobile/app/game/setup.tsx` | component | request-response | itself (`handlePickPack`, `handlePickDifficulty` Alert.alert chips) | exact |
| `apps/mobile/app/packs/combos.tsx` | component | CRUD | `apps/mobile/app/packs/index.tsx` (FlatList + Pressable + router) | role-match |
| `apps/mobile/stores/gameStore.test.ts` | test | — | itself (mock shape for `packStore`, `questionStore`, `playerStore`) | exact |

---

## Pattern Assignments

### `packages/types/src/question-pack.ts` (model/schema, transform)

**Analog:** itself — add `PackComboSchema` immediately after `PackIndexEntrySchema` (line 64)

**Existing schema pattern to copy** (lines 64–75):
```typescript
export const PackIndexEntrySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  author: z.string(),
  version: z.string(),
  totalQuestions: z.number(),
  categoryCounts: z.record(CategorySchema, z.number()),
  downloadUrl: z.string().url(),
  checksum: z.string(),
  size: z.number(),
});
export type PackIndexEntry = z.infer<typeof PackIndexEntrySchema>;
```

**New schema to add after line 75:**
```typescript
/**
 * Pack Combo schema
 * A named blend of 2+ pack IDs. Stored in Zustand (not WatermelonDB).
 */
export const PackComboSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Combo name is required').max(50),
  packIds: z.array(z.string().uuid()).min(2, 'A combo needs at least 2 packs'),
  createdAt: z.string().datetime(),
});
export type PackCombo = z.infer<typeof PackComboSchema>;
```

---

### `packages/types/src/index.ts` (config/export, transform)

**Analog:** itself — add `PackComboSchema` and `PackCombo` to the existing question-pack export block (lines 8–13)

**Existing export block pattern** (lines 8–13):
```typescript
export {
  QuestionSchema,
  PackMetadataSchema,
  QuestionPackSchema,
  PackIndexEntrySchema,
} from './question-pack.js';
export type { Question, PackMetadata, QuestionPack, PackIndexEntry } from './question-pack.js';
```

**Change to:**
```typescript
export {
  QuestionSchema,
  PackMetadataSchema,
  QuestionPackSchema,
  PackIndexEntrySchema,
  PackComboSchema,
} from './question-pack.js';
export type { Question, PackMetadata, QuestionPack, PackIndexEntry, PackCombo } from './question-pack.js';
```

---

### `apps/mobile/types/player.ts` (model, transform)

**Analog:** itself — `packId?: string | null` (line 18) and `difficultyPreference?: Difficulty | null` (line 20) are the exact template for `comboId`

**Existing field pattern to copy** (lines 8–21):
```typescript
export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  wedges: PlayerColor[];
  /** Per-player pack override — null means use game-level activePackId */
  packId?: string | null;
  /** Per-player difficulty override — null means use game-level enabledDifficulties */
  difficultyPreference?: Difficulty | null;
}
```

**Add `comboId` after `packId`:**
```typescript
  packId?: string | null;
  /** Per-player combo override — null means use game-level combo or pack. Mutually exclusive with packId. */
  comboId?: string | null;
  difficultyPreference?: Difficulty | null;
```

**Add `updatePlayerCombo` to `PlayerState` interface** (after `updatePlayerPack` on line 41):
```typescript
updatePlayerPack: (id: string, packId: string | null) => void;
/** Assign a combo to a specific player (null = clear combo, inherit game default). Clears packId. */
updatePlayerCombo: (id: string, comboId: string | null) => void;
```

---

### `apps/mobile/types/game.ts` (model, transform)

**Analog:** itself — `playerDifficulties: (Difficulty | null)[]` (line 49) is the exact template for `playerPackIdLists`

**Existing snapshot field pattern** (lines 43–49):
```typescript
  /** Snapshotted pack ID per player at game start (index matches player order).
   *  null = player inherited the game-level activePackId. */
  playerPackIds: (string | null)[];
  /** Snapshotted active categories per player (from pack categoryCounts + enabledCategories filter).
   *  Immutable during game — determines per-player championship condition. */
  playerCategories: PlayerColor[][];
  /** Snapshotted difficulty preference per player at game start (index matches player order).
   *  null = player uses game-level enabledDifficulties fallback. */
  playerDifficulties: (Difficulty | null)[];
```

**Add after `playerDifficulties`:**
```typescript
  /** Resolved list of pack IDs per player — from combo.packIds or [packId] at startGame().
   *  null = player inherits game-level fallback. Drives selectQuestion for multi-pack draw.
   *  Parallel to playerPackIds (kept for display); playerPackIdLists drives question selection. */
  playerPackIdLists: (string[] | null)[];
```

---

### `apps/mobile/stores/packStore.ts` (store, CRUD)

**Analog:** itself — `activePackId`, `downloadedPackIds`, `selectPack`, and the `partialize` block are all direct templates

**Existing `PackState` interface pattern** (lines 13–40):
```typescript
interface PackState {
  availablePacks: PackIndexEntry[];
  downloadedPackIds: string[];
  activePackId: string | null;
  enabledCategories: Category[] | null;
  enabledDifficulties: Difficulty[] | null;
  isLoading: boolean;
  // ...
  selectPack: (packId: string) => Promise<void>;
  setEnabledCategories: (categories: Category[] | null) => void;
  // ...
}
```

**Add to `PackState` interface (after `activePackId` line 19):**
```typescript
  savedCombos: PackCombo[];
  activeComboId: string | null;
  // ...
  createCombo: (name: string, packIds: string[]) => void;
  deleteCombo: (comboId: string) => void;
  selectCombo: (comboId: string | null) => void;
```

**Existing `selectPack` action pattern** (lines 101–108) — template for `selectCombo`:
```typescript
selectPack: async (packId: string) => {
  if (Platform.OS !== 'web') {
    await setActivePack(packId);
  }
  set({ activePackId: packId });
},
```

**New combo actions (synchronous — no async needed):**
```typescript
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
```

**Existing `partialize` block** (lines 129–134) — must add new fields:
```typescript
partialize: (state) => ({
  downloadedPackIds: state.downloadedPackIds,
  activePackId: state.activePackId,
  enabledCategories: state.enabledCategories,
  enabledDifficulties: state.enabledDifficulties,
}),
```

**Add `savedCombos` and `activeComboId` to partialize:**
```typescript
partialize: (state) => ({
  downloadedPackIds: state.downloadedPackIds,
  activePackId: state.activePackId,
  enabledCategories: state.enabledCategories,
  enabledDifficulties: state.enabledDifficulties,
  savedCombos: state.savedCombos,
  activeComboId: state.activeComboId,
}),
```

**Import addition:** Add `PackCombo` to the import from `@trivial-world/types` (line 5).

---

### `apps/mobile/stores/playerStore.ts` (store, CRUD)

**Analog:** itself — `updatePlayerPack` (lines 77–81) and `updatePlayerDifficulty` (lines 83–87) are the exact templates

**Existing `updatePlayerPack` pattern** (lines 77–81):
```typescript
updatePlayerPack: (id: string, packId: string | null) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, packId } : p
  ),
})),
```

**New `updatePlayerCombo` action — mirrors `updatePlayerPack` with mutual-exclusion enforcement:**
```typescript
updatePlayerCombo: (id: string, comboId: string | null) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, comboId, packId: comboId !== null ? null : p.packId } : p
  ),
})),
```

**`updatePlayerPack` must also clear `comboId` — change existing (lines 77–81) to:**
```typescript
updatePlayerPack: (id: string, packId: string | null) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, packId, comboId: packId !== null ? null : p.comboId } : p
  ),
})),
```

**`addPlayer` initialization pattern** (lines 44–56) — add `comboId: null` alongside `packId: null`:
```typescript
{
  id: generateId(),
  name: playerName,
  color: nextColor,
  wedges: [],
  packId: null,
  comboId: null,          // NEW — explicit null mirrors packId pattern
  difficultyPreference: null,
},
```

**ID generation pattern** (lines 12–19) — reuse `generateId()` unchanged for combo IDs in packStore:
```typescript
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `player-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
```

---

### `apps/mobile/stores/gameStore.ts` (store, event-driven)

**Analog:** itself — `startGame` (lines 51–119), `selectCategory` (lines 121–131), `resetGame` (lines 232–248), and `partialize` (lines 253–264) are all direct change points

**Existing `startGame` snapshot pattern** (lines 67–83) — template for `playerPackIdLists`:
```typescript
const playerPackIds = players.map(p => p.packId ?? activePackId ?? null);
const playerDifficulties = players.map(p => p.difficultyPreference ?? null);

function deriveCategoriesForPack(packId: string | null): PlayerColor[] {
  if (!packId) return ALL_CATEGORIES;
  const pack = availablePacks.find(p => p.id === packId);
  if (!pack) return ALL_CATEGORIES;
  const packCats = (Object.entries(pack.categoryCounts) as [PlayerColor, number][])
    .filter(([, count]) => count > 0)
    .map(([cat]) => cat);
  return enabledCategories && enabledCategories.length > 0
    ? packCats.filter(c => (enabledCategories as PlayerColor[]).includes(c))
    : packCats;
}
const playerCategories = playerPackIds.map(deriveCategoriesForPack);
```

**Add after `playerDifficulties` derivation — `resolvePlayerPackIdList` helper and `playerPackIdLists` snapshot:**
```typescript
// Read combo state from packStore
const { savedCombos, activeComboId } = usePackStore.getState();

function resolvePlayerPackIdList(player: Player): string[] {
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

const playerPackIdLists = players.map(resolvePlayerPackIdList);
```

**Existing `resetAskedQuestions` loop pattern** (lines 88–98) — extend to use `playerPackIdLists` for full reset coverage:
```typescript
// Current: uses playerPackIds (only first pack per player)
const uniquePackIds = [...new Set(playerPackIds.filter((id): id is string => id !== null))];

// New: use playerPackIdLists to cover all packs in combos
const uniquePackIdsForReset = [
  ...new Set(
    playerPackIdLists
      .flatMap(list => list ?? [])
      .filter((id): id is string => Boolean(id))
  )
];
for (const pid of uniquePackIdsForReset) {
  if (pid !== activePackId) {
    usePackStore.setState({ activePackId: pid });
    await useQuestionStore.getState().resetAskedQuestions();
  }
}
```

**`set(...)` in `startGame` must add `playerPackIdLists`** (lines 100–114):
```typescript
set({
  phase: 'selecting',
  // ... existing fields ...
  playerPackIds,
  playerPackIdLists,    // NEW
  playerCategories,
  playerDifficulties,
});
```

**Existing `selectCategory` pattern** (lines 121–131) — change to read `playerPackIdLists`:
```typescript
// Current:
selectCategory: async (category: PlayerColor) => {
  const { playerPackIds, playerDifficulties, currentPlayerIndex } = get();
  const packId = playerPackIds[currentPlayerIndex] ?? undefined;
  const difficulty = (playerDifficulties ?? [])[currentPlayerIndex] ?? undefined;
  const question = await useQuestionStore.getState().selectQuestion(category, packId, difficulty);
  // ...
},

// New:
selectCategory: async (category: PlayerColor) => {
  const { playerPackIdLists, playerPackIds, playerDifficulties, currentPlayerIndex, activePackId } = get();
  const packIds = playerPackIdLists[currentPlayerIndex]
    ?? (activePackId ? [activePackId] : undefined);
  const difficulty = (playerDifficulties ?? [])[currentPlayerIndex] ?? undefined;
  const question = await useQuestionStore.getState().selectQuestion(category, packIds, difficulty);
  set({
    currentCategory: category,
    currentQuestion: question,
    phase: 'answering',
  });
},
```

**Existing `resetGame` pattern** (lines 232–248) — add `playerPackIdLists: []`:
```typescript
resetGame: () => {
  set({
    // ... existing fields ...
    playerPackIds: [],
    playerPackIdLists: [],    // NEW
    playerCategories: [],
    playerDifficulties: [],
  });
},
```

**Existing `partialize` block** (lines 253–264) — add `playerPackIdLists`:
```typescript
partialize: (state) => ({
  activePackId: state.activePackId,
  completedCategories: state.completedCategories,
  isChampionshipMode: state.isChampionshipMode,
  currentPlayerIndex: state.currentPlayerIndex,
  phase: state.phase,
  questionNumber: state.questionNumber,
  winner: state.winner,
  playerPackIds: state.playerPackIds,
  playerPackIdLists: state.playerPackIdLists,    // NEW
  playerCategories: state.playerCategories,
  playerDifficulties: state.playerDifficulties,
}),
```

**`GameStore` interface** (lines 14–23) — `startGame` is already `() => Promise<void>` but `GameState.startGame` is typed `() => void` in `types/game.ts`. No change needed to interface; `playerPackIdLists` is added to `GameState` in `types/game.ts`.

---

### `apps/mobile/stores/questionStore.ts` (store, request-response)

**Analog:** itself — `selectQuestion` (lines 66–166) is the exact change point

**Existing signature** (line 43):
```typescript
selectQuestion: (category: PlayerColor, packId?: string, difficulty?: Difficulty) => Promise<Question | null>;
```

**New signature:**
```typescript
selectQuestion: (category: PlayerColor, packIds?: string[], difficulty?: Difficulty) => Promise<Question | null>;
```

**Existing web path** (lines 67–75):
```typescript
if (Platform.OS === 'web') {
  const { activePackId } = usePackStore.getState();
  const resolvedPackId = packId ?? activePackId ?? undefined;
  const question = await getNextQuestion(category, get().askedQuestionIds, resolvedPackId, difficulty);
  if (question) {
    set({ currentQuestion: question, currentCategory: category });
  }
  return question;
}
```

**New web path — pass array to `getNextQuestion` (signature change in questionProvider too):**
```typescript
if (Platform.OS === 'web') {
  const { activePackId } = usePackStore.getState();
  const resolvedPackIds = packIds ?? (activePackId ? [activePackId] : undefined);
  const question = await getNextQuestion(category, get().askedQuestionIds, resolvedPackIds, difficulty);
  if (question) {
    set({ currentQuestion: question, currentCategory: category });
  }
  return question;
}
```

**Existing native path single-pack lookup** (lines 84–118) — change to multi-pack loop:
```typescript
// Current single-pack:
const resolvedPackId = packId ?? activePackId;
if (!resolvedPackId) { logger.error('No active pack selected'); return null; }

const packs = await database.get('question_packs').query(Q.where('pack_id', resolvedPackId)).fetch();
if (packs.length === 0) { logger.error('Active pack not found in database'); return null; }
const rawQuestions = await query.fetch();
const questions = rawQuestions as QuestionModelType[];
```

**New native path — pool from multiple packs:**
```typescript
const resolvedPackIds = packIds ?? (activePackId ? [activePackId] : []);
if (resolvedPackIds.length === 0) {
  logger.error('No packs available for question selection');
  return null;
}

let allQuestions: QuestionModelType[] = [];
for (const pid of resolvedPackIds) {
  const packs = await database.get('question_packs')
    .query(Q.where('pack_id', pid))
    .fetch();
  if (packs.length === 0) continue;
  const qs = await database.get('questions')
    .query(
      Q.where('question_pack_id', packs[0].id),
      Q.where('category', category),
      Q.where('asked_at', null)
    )
    .fetch();
  allQuestions = [...allQuestions, ...(qs as QuestionModelType[])];
}
// Then apply difficulty filter + random pick as before
```

**Existing difficulty + random pick pattern** (lines 123–161) — unchanged structure, just operates on `allQuestions` instead of per-pack `questions`:
```typescript
const effectiveDifficulties: Difficulty[] | null =
  difficulty != null
    ? [difficulty]
    : (enabledDifficulties && enabledDifficulties.length > 0 ? enabledDifficulties : null);

const filteredQuestions = effectiveDifficulties
  ? allQuestions.filter(q => {
      const qDifficulty = q.difficulty;
      return qDifficulty && effectiveDifficulties.includes(qDifficulty as Difficulty);
    })
  : allQuestions;

if (filteredQuestions.length === 0) {
  logger.warn(`All questions exhausted for category ${category}`);
  return null;
}
const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
const selected = filteredQuestions[randomIndex];
```

---

### `apps/mobile/services/questionProvider.ts` (service, request-response)

**Analog:** itself — `getNextQuestion` (lines 55–65) and `getNextQuestionFromBundle` (lines 86–116) are the change points

**Existing `getNextQuestion` signature** (lines 55–65):
```typescript
export async function getNextQuestion(
  category: PlayerColor,
  excludeIds: string[],
  packId?: string,
  difficulty?: Difficulty
): Promise<Question | null>
```

**New signature to accept array:**
```typescript
export async function getNextQuestion(
  category: PlayerColor,
  excludeIds: string[],
  packIds?: string[],
  difficulty?: Difficulty
): Promise<Question | null>
```

**Existing web pool construction in `getNextQuestionFromBundle`** (lines 93–95):
```typescript
const pool = packId
  ? ((await fetchWebPackQuestions(packId)) ?? ALL_QUESTIONS)
  : ALL_QUESTIONS;
```

**New multi-pack pool construction:**
```typescript
let pool: Question[];
if (packIds && packIds.length > 0) {
  const poolArrays = await Promise.all(packIds.map(pid => fetchWebPackQuestions(pid)));
  const fetched = poolArrays.flatMap(qs => qs ?? []);
  pool = fetched.length > 0 ? fetched : ALL_QUESTIONS;
} else {
  pool = ALL_QUESTIONS;
}
```

**Existing filter + random pick pattern** (lines 97–115) — unchanged, operates on `pool`:
```typescript
const available = pool.filter(
  (q) => q.category === category && !excludeIds.includes(q.id)
    && (difficulty != null ? q.difficulty === difficulty : true)
);
if (available.length === 0) {
  const categoryQuestions = pool.filter(
    (q) => q.category === category
      && (difficulty != null ? q.difficulty === difficulty : true)
  );
  if (categoryQuestions.length === 0) return null;
  const selected = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
  logger.debug(`All questions exhausted for category ${category}, re-asking: ${selected.id}`);
  return selected;
}
return available[Math.floor(Math.random() * available.length)];
```

---

### `apps/mobile/app/game/setup.tsx` (component, request-response)

**Analog:** itself — `handlePickPack` (lines 90–110) and `handlePickDifficulty` (lines 112–125) are the templates for `handlePickSource`

**Existing `handlePickPack` Alert.alert pattern** (lines 90–110):
```typescript
const handlePickPack = (playerId: string) => {
  if (Platform.OS === 'web') return;
  const selectablePacks = availablePacks.filter(p => downloadedPackIds.includes(p.id));
  Alert.alert(
    'Select Pack for Player',
    undefined,
    [
      { text: 'Default (game pack)', onPress: () => updatePlayerPack(playerId, null) },
      ...selectablePacks.map(p => ({
        text: p.name.length > 28 ? p.name.slice(0, 25) + '...' : p.name,
        onPress: () => updatePlayerPack(playerId, p.id),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]
  );
};
```

**Replace with `handlePickSource` — extends Alert to include combos:**
```typescript
const handlePickSource = (playerId: string) => {
  if (Platform.OS === 'web') return;
  const selectablePacks = availablePacks.filter(p => downloadedPackIds.includes(p.id));
  Alert.alert(
    'Select Pack or Combo',
    undefined,
    [
      {
        text: 'Default (game source)',
        onPress: () => { updatePlayerPack(playerId, null); updatePlayerCombo(playerId, null); },
      },
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

**Existing chip label derivation** (lines 191–199) — extend to show combo name when `player.comboId` is set:
```typescript
// Current:
const playerPackName = player.packId
  ? (availablePacks.find(p => p.id === player.packId)?.name ?? 'Custom Pack')
  : null;
const chipLabel = playerPackName
  ? (playerPackName.length > 12 ? playerPackName.slice(0, 12) + '...' : playerPackName)
  : 'Default';

// New — combo takes precedence:
const playerComboName = player.comboId
  ? (savedCombos.find(c => c.id === player.comboId)?.name ?? 'Custom Combo')
  : null;
const playerPackName = !playerComboName && player.packId
  ? (availablePacks.find(p => p.id === player.packId)?.name ?? 'Custom Pack')
  : null;
const displayName = playerComboName ?? playerPackName;
const chipLabel = displayName
  ? (displayName.length > 12 ? displayName.slice(0, 12) + '...' : displayName)
  : 'Default';
```

**Imports change** — add `updatePlayerCombo` and `savedCombos` to destructuring:
```typescript
// Line 27 — add updatePlayerCombo:
const { players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack, updatePlayerCombo, updatePlayerDifficulty } = usePlayerStore();

// Lines 29-31 — add savedCombos from packStore:
const savedCombos = usePackStore((state) => state.savedCombos);
```

**Chip `onPress` change** (line 233) — replace `handlePickPack` with `handlePickSource`:
```typescript
onPress={() => handlePickSource(player.id)}
```

---

### `apps/mobile/app/packs/combos.tsx` (component, CRUD) — NEW FILE

**Analog:** `apps/mobile/app/packs/index.tsx` — FlatList + Pressable + router pattern

**Imports pattern from `packs/index.tsx`** (lines 1–12):
```typescript
import { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePackStore } from '../../stores/packStore';
import type { PackCombo } from '@trivial-world/types';
```

**FlatList pattern from `packs/index.tsx`** (structure):
```typescript
<FlatList
  data={savedCombos}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View style={styles.comboCard}>
      <Text style={styles.comboName}>{item.name}</Text>
      <Text style={styles.comboDetail}>{item.packIds.length} packs</Text>
      <Pressable onPress={() => handleDeleteCombo(item.id)}>
        <Text style={styles.deleteText}>Remove</Text>
      </Pressable>
    </View>
  )}
  ListEmptyComponent={<Text style={styles.emptyText}>No combos yet</Text>}
/>
```

**Alert pattern for delete confirmation from `packs/index.tsx` style:**
```typescript
const handleDeleteCombo = (comboId: string) => {
  Alert.alert(
    'Remove Combo',
    'Are you sure you want to remove this combo?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteCombo(comboId) },
    ]
  );
};
```

---

### `apps/mobile/stores/gameStore.test.ts` (test)

**Analog:** itself — `packStore` mock (lines 33–43) must be extended before adding combo-reading code to `startGame`

**Existing `packStore` mock** (lines 33–43):
```typescript
vi.mock('./packStore', () => ({
  usePackStore: {
    getState: vi.fn(() => ({
      activePackId: 'test-pack-id',
      availablePacks: [],
      enabledCategories: null,
      enabledDifficulties: null,
    })),
    setState: vi.fn(),
  },
}));
```

**Add `savedCombos` and `activeComboId` to mock:**
```typescript
vi.mock('./packStore', () => ({
  usePackStore: {
    getState: vi.fn(() => ({
      activePackId: 'test-pack-id',
      availablePacks: [],
      enabledCategories: null,
      enabledDifficulties: null,
      savedCombos: [],
      activeComboId: null,
    })),
    setState: vi.fn(),
  },
}));
```

**`selectQuestion` mock** (called from `mockQuestionStore`) — update expected signature to accept `packIds?: string[]` instead of `packId?: string`. The mock itself (`vi.fn()`) doesn't enforce signatures, but any test that asserts `selectQuestion` was called with a specific `packId` argument must be updated to assert `packIds` (an array).

---

## Shared Patterns

### Zustand `persist` + `partialize` whitelist
**Source:** `apps/mobile/stores/packStore.ts` lines 127–135, `apps/mobile/stores/gameStore.ts` lines 253–264
**Apply to:** All new state fields in `packStore` (`savedCombos`, `activeComboId`) and `gameStore` (`playerPackIdLists`)
```typescript
// Pattern: EVERY new field added to store state must be explicitly added to partialize.
// Omitting a field silently excludes it from AsyncStorage — lost on app kill/resume.
partialize: (state) => ({
  ...existingFields,
  newField: state.newField,   // explicit whitelist entry required
}),
```

### Mutual exclusion on paired optional fields
**Source:** `apps/mobile/stores/playerStore.ts` lines 77–87 (`updatePlayerPack` / `updatePlayerDifficulty` both clear sibling when setting)
**Apply to:** `updatePlayerPack` (must clear `comboId` when setting non-null) and `updatePlayerCombo` (must clear `packId` when setting non-null)
```typescript
// Pattern: when setting one optional override, clear the sibling to prevent stale state
p.id === id ? { ...p, packId, comboId: packId !== null ? null : p.comboId } : p
```

### `crypto.randomUUID()` with fallback
**Source:** `apps/mobile/stores/playerStore.ts` lines 12–19
**Apply to:** `packStore.createCombo()` for generating combo IDs
```typescript
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `combo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
```

### Dynamic import guard (`Platform.OS !== 'web'`)
**Source:** `apps/mobile/stores/questionStore.ts` lines 67–75, `apps/mobile/services/questionProvider.ts` lines 61–65
**Apply to:** All WatermelonDB access in the multi-pack loop — must remain inside the `Platform.OS !== 'web'` branch
```typescript
// Pattern: WatermelonDB is mobile-only; web path uses bundled questions
if (Platform.OS === 'web') {
  // web path — bundled or fetched questions
  return webImpl(...);
}
// mobile path — WatermelonDB
const { getDatabase } = await import('../database');
```

### Zod schema + type export pair
**Source:** `packages/types/src/question-pack.ts` — every schema has a paired `z.infer<>` type export
**Apply to:** `PackComboSchema` → `PackCombo`
```typescript
export const PackComboSchema = z.object({ ... });
export type PackCombo = z.infer<typeof PackComboSchema>;
```

---

## No Analog Found

All files for Phase 18 have direct analogs in the codebase. No greenfield patterns are needed.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | — |

---

## Metadata

**Analog search scope:** `packages/types/src/`, `apps/mobile/stores/`, `apps/mobile/types/`, `apps/mobile/services/`, `apps/mobile/app/game/`, `apps/mobile/app/packs/`
**Files read:** 12 source files
**Pattern extraction date:** 2026-06-13
