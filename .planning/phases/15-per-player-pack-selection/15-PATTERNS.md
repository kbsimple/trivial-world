# Phase 15: Per-Player Pack Selection - Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/mobile/types/player.ts` | model | — | `apps/mobile/types/game.ts` | exact (same file pattern: interface extension) |
| `apps/mobile/stores/playerStore.ts` | store | CRUD | `apps/mobile/stores/playerStore.ts` itself — add action alongside `updatePlayerName` | exact |
| `apps/mobile/types/game.ts` | model | — | `apps/mobile/types/game.ts` itself — add fields to `GameState` | exact |
| `apps/mobile/stores/gameStore.ts` | store | CRUD | `apps/mobile/stores/gameStore.ts` itself — update `startGame`, `selectCategory`, `markAnswer` | exact |
| `apps/mobile/stores/questionStore.ts` | store | request-response | `apps/mobile/stores/questionStore.ts` itself — add optional param to `selectQuestion` | exact |
| `apps/mobile/app/game/setup.tsx` | component | request-response | `apps/mobile/app/game/setup.tsx` itself — extend player row + Alert.alert picker | exact |
| `apps/mobile/app/game/turn.tsx` | component | request-response | `apps/mobile/app/game/turn.tsx` itself — extend progress strip | exact |

---

## Pattern Assignments

### `apps/mobile/types/player.ts` (model — field addition)

**Analog:** `apps/mobile/types/player.ts` (existing interface shape)

**Existing interface pattern** (lines 7–16):
```typescript
export interface Player {
  /** Unique identifier */
  id: string;
  /** Display name (default: "Player N") */
  name: string;
  /** Auto-assigned color matching category */
  color: PlayerColor;
  /** Wedges earned (max 6, one per category) - SCOR-01 */
  wedges: PlayerColor[];
}
```

**Field to add** — append after `wedges`:
```typescript
  /** Per-player pack override — null means use game-level activePackId */
  packId?: string | null;
```

**State interface to extend** — `PlayerState` (lines 22–44): add action declaration after `resetPlayers`:
```typescript
  /** Assign a question pack to a specific player (null = use game default) */
  updatePlayerPack: (id: string, packId: string | null) => void;
```

---

### `apps/mobile/stores/playerStore.ts` (store — new action)

**Analog:** `updatePlayerName` action (lines 68–72) — identical shape, different field.

**Core action pattern** (lines 68–72):
```typescript
updatePlayerName: (id: string, name: string) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, name } : p
  ),
})),
```

**New action to add** — directly after `updatePlayerName`, same pattern:
```typescript
updatePlayerPack: (id: string, packId: string | null) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, packId } : p
  ),
})),
```

**addPlayer initialization** (lines 43–53): The object literal in `addPlayer` must include `packId: null` to keep the shape stable for tests that do exact-match assertions on player objects:
```typescript
return {
  players: [
    ...state.players,
    {
      id: generateId(),
      name: playerName,
      color: nextColor,
      wedges: [],
      packId: null,          // NEW — explicit null so persisted shape is deterministic
    },
  ],
};
```

**Persist block** (lines 122–126): no changes needed — `packId` is a plain serializable field, the existing `createJSONStorage(() => platformStorage)` handles it.

---

### `apps/mobile/types/game.ts` (model — field additions to GameState)

**Analog:** Existing `GameState` interface (lines 29–46). Pattern: JSDoc comment + typed array fields parallel to `completedCategories`/`isChampionshipMode`.

**Fields to add** inside `GameState` after `winner`:
```typescript
  /** Snapshotted pack ID per player at game start (index matches player order).
   *  null = player inherited the game-level activePackId. */
  playerPackIds: (string | null)[];
  /** Snapshotted active categories per player (from pack categoryCounts + enabledCategories filter).
   *  Immutable during game — determines per-player championship condition. */
  playerCategories: PlayerColor[][];
```

**Action to add** in `GameState` actions block:
```typescript
  selectCategory: (category: PlayerColor) => Promise<void>;
```
Note: `selectCategory` is currently only on `GameStore` (the internal interface) in `gameStore.ts`, not on the exported `GameState` type. No change needed here for `selectCategory` — it is not part of `GameState`.

---

### `apps/mobile/stores/gameStore.ts` (store — update 3 functions + initial state)

**Analog:** The file itself. All patterns are self-referential.

**Imports pattern** (lines 1–10): Add `PackIndexEntry` is not needed — `availablePacks` already typed via `PackState`. No new imports required beyond what exists.

**Initial state block** (lines 43–53): Add two new fields with empty-array defaults:
```typescript
// add after activePackId: null,
playerPackIds: [],
playerCategories: [],
```

**`startGame` — existing pattern** (lines 55–86):
```typescript
startGame: async () => {
  const { activePackId } = usePackStore.getState();
  if (!activePackId) {
    console.error('No active pack selected');
    return;
  }
  const playerCount = usePlayerStore.getState().players.length;
  if (playerCount === 0) {
    console.error('No players added');
    return;
  }

  try {
    await useQuestionStore.getState().resetAskedQuestions();

    set({
      phase: 'selecting',
      // ... other fields
      activePackId,
    });
  } catch (error) {
    console.error('Error starting game:', error);
    set({ phase: 'setup' });
  }
},
```

**`startGame` — additions** inside the `try` block, before `set(...)`:
```typescript
const { players } = usePlayerStore.getState();
const { activePackId, availablePacks, enabledCategories } = usePackStore.getState();

const playerPackIds = players.map(p => p.packId ?? activePackId ?? null);

function deriveCategoriesForPack(packId: string | null): PlayerColor[] {
  if (!packId) return ALL_CATEGORIES;
  const pack = availablePacks.find(p => p.id === packId);
  if (!pack) return ALL_CATEGORIES;
  const packCats = (Object.entries(pack.categoryCounts) as [PlayerColor, number][])
    .filter(([, count]) => count > 0)
    .map(([cat]) => cat);
  // Preserve existing enabledCategories filter (Pitfall 1 from RESEARCH.md)
  return enabledCategories && enabledCategories.length > 0
    ? packCats.filter(c => (enabledCategories as PlayerColor[]).includes(c))
    : packCats;
}

const playerCategories = playerPackIds.map(deriveCategoriesForPack);
```

Then add to the `set({...})` call:
```typescript
set({
  // ... existing fields
  playerPackIds,
  playerCategories,
});
```

**`selectCategory` — existing pattern** (lines 88–95):
```typescript
selectCategory: async (category: PlayerColor) => {
  const question = await useQuestionStore.getState().selectQuestion(category);
  set({
    currentCategory: category,
    currentQuestion: question,
    phase: 'answering',
  });
},
```

**`selectCategory` — replacement** (thread packId):
```typescript
selectCategory: async (category: PlayerColor) => {
  const { playerPackIds, currentPlayerIndex } = get();
  const packId = playerPackIds[currentPlayerIndex] ?? undefined;
  const question = await useQuestionStore.getState().selectQuestion(category, packId);
  set({
    currentCategory: category,
    currentQuestion: question,
    phase: 'answering',
  });
},
```

**`markAnswer` — existing championship check** (line 144):
```typescript
const allDone = getActiveCategories().every(c => newCompleted.includes(c));
```

**`markAnswer` — replacement** (use per-player snapshot, Pitfall 3 from RESEARCH.md):
```typescript
const { playerCategories } = get();
const thisPlayerCategories = playerCategories[currentPlayerIndex] ?? ALL_CATEGORIES;
const allDone = thisPlayerCategories.every(c => newCompleted.includes(c));
```

**`resetGame`** (lines 194–207): Add the two new fields to the reset object:
```typescript
playerPackIds: [],
playerCategories: [],
```

**`partialize`** (lines 212–220): Add the new fields so they survive app restart:
```typescript
partialize: (state) => ({
  activePackId: state.activePackId,
  completedCategories: state.completedCategories,
  isChampionshipMode: state.isChampionshipMode,
  currentPlayerIndex: state.currentPlayerIndex,
  phase: state.phase,
  questionNumber: state.questionNumber,
  winner: state.winner,
  playerPackIds: state.playerPackIds,       // NEW
  playerCategories: state.playerCategories, // NEW
}),
```

---

### `apps/mobile/stores/questionStore.ts` (store — optional param on `selectQuestion`)

**Analog:** The file itself. Platform-dispatch pattern already in `selectQuestion` (lines 65–156).

**Existing signature** (line 65):
```typescript
selectQuestion: async (category: PlayerColor) => {
```

**New signature** — add optional param:
```typescript
selectQuestion: async (category: PlayerColor, packId?: string) => {
```

**Web path** (lines 66–71): no change needed — `packId` is accepted but ignored (RESEARCH.md Finding 1).

**Native path** — existing `activePackId` resolution (lines 81–83):
```typescript
const { activePackId, enabledCategories, enabledDifficulties } = usePackStore.getState();

if (!activePackId) {
  logger.error('No active pack selected');
  return null;
}
```

**Native path — replacement** (resolve packId with fallback, RESEARCH.md Finding 2):
```typescript
const { activePackId, enabledCategories, enabledDifficulties } = usePackStore.getState();
const resolvedPackId = packId ?? activePackId;

if (!resolvedPackId) {
  logger.error('No active pack selected');
  return null;
}
```

Then replace all subsequent references to `activePackId` in the native path (lines 96–98) with `resolvedPackId`:
```typescript
// Line 96-98 original:
const packs = await database.get('question_packs')
  .query(Q.where('pack_id', activePackId))
  .fetch();

// Replacement:
const packs = await database.get('question_packs')
  .query(Q.where('pack_id', resolvedPackId))
  .fetch();
```

**State interface** (lines 42–43): Update the `selectQuestion` declaration to match the new signature:
```typescript
selectQuestion: (category: PlayerColor, packId?: string) => Promise<Question | null>;
```

---

### `apps/mobile/app/game/setup.tsx` (component — player row extension)

**Analog:** The file itself. Three patterns to follow:

**Imports pattern** (lines 1–13):
```typescript
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { usePackStore } from '../../stores/packStore';
// ... rest unchanged
```

Add `Platform` to the react-native import:
```typescript
import { Platform, View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
```

**Store destructure pattern** (line 27): Add `updatePlayerPack` and pack store fields:
```typescript
const { players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack } = usePlayerStore();
const downloadedPackIds = usePackStore((state) => state.downloadedPackIds);
// availablePacks already destructured at line 30
```

**Alert.alert pattern — existing guard** (lines 91–98):
```typescript
Alert.alert(
  'No Pack Selected',
  'Please select a question pack before starting the game.',
  [{ text: 'OK', style: 'default' }]
);
```

**Alert.alert pattern — new pack picker** (same call shape, multi-button):
```typescript
const handlePickPack = (playerId: string) => {
  if (Platform.OS === 'web') return; // web: always default pack (RESEARCH.md Finding 3, Pitfall 4)
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

**Player row layout pattern** (lines 146–172): The existing row is a `View` with `flexDirection: 'row'`. The pack chip goes inside the row or as a second sub-row. Prefer a wrapping column structure:
```typescript
{players.map((player, index) => {
  const playerPackName = player.packId
    ? availablePacks.find(p => p.id === player.packId)?.name ?? 'Custom Pack'
    : null;

  return (
    <View key={player.id} style={styles.playerRow}>
      {/* existing: color indicator + name input + remove button */}
      <View style={[styles.colorIndicator, { backgroundColor: CATEGORY_COLORS[player.color as PlayerColor] }]} />
      <TextInput
        style={[styles.nameInput, { color: theme.color?.val as string }]}
        value={player.name}
        onChangeText={(name) => handleNameChange(player.id, name)}
        placeholder={`Player ${index + 1}`}
        placeholderTextColor={theme.color?.val as string}
      />
      {/* NEW: pack chip */}
      {Platform.OS !== 'web' && (
        <Pressable
          style={[styles.packChip, playerPackName ? styles.packChipActive : styles.packChipDefault]}
          onPress={() => handlePickPack(player.id)}
        >
          <Text style={styles.packChipText} numberOfLines={1}>
            {playerPackName ? playerPackName.slice(0, 12) + (playerPackName.length > 12 ? '…' : '') : 'Default'}
          </Text>
        </Pressable>
      )}
      <Pressable style={styles.removeButton} onPress={() => handleRemovePlayer(player.id)}>
        <Text style={styles.removeButtonText}>×</Text>
      </Pressable>
    </View>
  );
})}
```

**StyleSheet additions** — follow the existing chip-adjacent style pattern (e.g., `removeButton` at lines 287–289):
```typescript
packChip: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
  marginHorizontal: 4,
},
packChipDefault: {
  backgroundColor: 'rgba(255,255,255,0.12)',
},
packChipActive: {
  backgroundColor: 'rgba(255,255,255,0.28)',
},
packChipText: {
  fontSize: 11,
  color: '#ccc',
},
```

---

### `apps/mobile/app/game/turn.tsx` (component — progress strip extension)

**Analog:** The file itself. Progress strip render pattern (lines 107–125).

**New store subscriptions** (add after line 28 `enabledCategories`):
```typescript
const { playerPackIds, playerCategories } = useGameStore();
const availablePacks = usePackStore((state) => state.availablePacks);
```

**Existing progress strip** (lines 107–125):
```typescript
{players.length > 1 && (
  <View style={styles.progressStrip}>
    {players.map((player, idx) => {
      const count = (completedCategories[idx] ?? []).length;
      const champ = isChampionshipMode[idx] ?? false;
      return (
        <View key={player.id} style={styles.progressEntry}>
          <View style={[styles.progressDot, { backgroundColor: CATEGORY_COLORS[player.color] }]} />
          <Text style={styles.progressName} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={styles.progressCount}>
            {champ ? '🏆' : `${count}/${activeCategories.length}`}
          </Text>
        </View>
      );
    })}
  </View>
)}
```

**Updated progress strip** — change `activeCategories.length` to per-player total, add pack name:
```typescript
{players.length > 1 && (
  <View style={styles.progressStrip}>
    {players.map((player, idx) => {
      const count = (completedCategories[idx] ?? []).length;
      const champ = isChampionshipMode[idx] ?? false;
      const totalCats = (playerCategories[idx] ?? PLAYER_COLORS).length;
      const pid = playerPackIds[idx];
      const packName = pid
        ? (availablePacks.find(p => p.id === pid)?.name ?? null)
        : null;
      const displayPackName = packName
        ? (packName.length > 12 ? packName.slice(0, 12) + '…' : packName)
        : null;
      return (
        <View key={player.id} style={styles.progressEntry}>
          <View style={[styles.progressDot, { backgroundColor: CATEGORY_COLORS[player.color] }]} />
          <Text style={styles.progressName} numberOfLines={1}>
            {player.name}
          </Text>
          {displayPackName && (
            <Text style={styles.progressPack} numberOfLines={1}>{displayPackName}</Text>
          )}
          <Text style={styles.progressCount}>
            {champ ? '🏆' : `${count}/${totalCats}`}
          </Text>
        </View>
      );
    })}
  </View>
)}
```

**StyleSheet addition** (after `progressCount` at line 230):
```typescript
progressPack: {
  color: '#888',
  fontSize: 11,
  marginRight: 4,
},
```

**Note on `activeCategories` usage** (lines 29–32, 68–70, 77, 119): The local `activeCategories` variable in `turn.tsx` is still used for the current player's category grid. After this change it should derive from `playerCategories[currentPlayerIndex]` instead of `enabledCategories` from packStore, to be consistent with the snapshotted values:
```typescript
// Replace lines 29-32:
const activeCategories: PlayerColor[] =
  playerCategories[currentPlayerIndex] ?? PLAYER_COLORS;
// enabledCategories subscription can be removed if no longer needed elsewhere
```

---

## Shared Patterns

### Zustand store creation
**Source:** All store files (e.g., `apps/mobile/stores/playerStore.ts` lines 26–127)
**Apply to:** `playerStore.ts`, `gameStore.ts`, `questionStore.ts` — no structural changes, add fields/actions within the existing `create<T>()(persist(...))` wrapper.
```typescript
export const useXxxStore = create<XxxState>()(
  persist(
    (set, get) => ({
      // state fields...
      // actions...
    }),
    {
      name: 'trivial-world-xxx',
      storage: createJSONStorage(() => platformStorage),
      partialize: (state) => ({ /* persisted subset */ }),
    }
  )
);
```

### Cross-store reads inside actions
**Source:** `apps/mobile/stores/gameStore.ts` lines 55–65
**Apply to:** `gameStore.ts` `startGame` (reads `playerStore` + `packStore`)
```typescript
// Pattern: call .getState() on sibling stores inside async actions
const { players } = usePlayerStore.getState();
const { activePackId, availablePacks, enabledCategories } = usePackStore.getState();
```

### Platform guard for native-only features
**Source:** `apps/mobile/stores/packStore.ts` line 96; `apps/mobile/stores/questionStore.ts` line 66
**Apply to:** `setup.tsx` pack picker, `questionStore.ts` native DB path
```typescript
if (Platform.OS === 'web') return; // or early-exit / skip feature
```

### Alert.alert multi-button pattern
**Source:** `apps/mobile/app/game/setup.tsx` lines 91–98
**Apply to:** `setup.tsx` pack picker handler
```typescript
Alert.alert(
  'Title',
  undefined,
  [
    { text: 'Option A', onPress: () => { /* ... */ } },
    { text: 'Cancel', style: 'cancel' as const },
  ]
);
```

### Zustand `useXxxStore((state) => state.field)` selector
**Source:** `apps/mobile/app/game/setup.tsx` lines 29–30; `apps/mobile/app/game/turn.tsx` line 28
**Apply to:** `turn.tsx` new `availablePacks` subscription
```typescript
const availablePacks = usePackStore((state) => state.availablePacks);
```

### Zustand destructure from hook (no selector)
**Source:** `apps/mobile/app/game/turn.tsx` lines 21–27
**Apply to:** `turn.tsx` — destructure `playerPackIds`, `playerCategories` from `useGameStore()`
```typescript
const {
  selectCategory,
  currentPlayerIndex,
  completedCategories,
  isChampionshipMode,
  playerPackIds,     // NEW
  playerCategories,  // NEW
} = useGameStore();
```

---

## Test Pattern Assignments

### `apps/mobile/stores/playerStore.test.ts`

**Analog:** `apps/mobile/stores/playerStore.test.ts` — same file, extend existing tests.

**`beforeEach` reset pattern** (lines 34–37):
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  usePlayerStore.setState({ players: [] });
});
```

**`updatePlayerName` test pattern** (lines 200–233) — mirror for `updatePlayerPack`:
```typescript
describe('updatePlayerPack', () => {
  it('sets packId for a player by ID', () => {
    getStore().addPlayer('Alice');
    const store = getStore();
    const playerId = store.players[0].id;

    store.updatePlayerPack(playerId, 'pack-123');
    const afterStore = getStore();

    expect(afterStore.players[0].packId).toBe('pack-123');
  });

  it('clears packId when set to null', () => {
    getStore().addPlayer('Alice');
    const store = getStore();
    const playerId = store.players[0].id;

    store.updatePlayerPack(playerId, 'pack-123');
    store.updatePlayerPack(playerId, null);
    const afterStore = getStore();

    expect(afterStore.players[0].packId).toBeNull();
  });

  it('does nothing for non-existent ID', () => {
    getStore().addPlayer('Alice');
    const store = getStore();

    store.updatePlayerPack('non-existent-id', 'pack-123');
    const afterStore = getStore();

    expect(afterStore.players[0].packId).toBeNull(); // unchanged
  });
});
```

**Test that needs updating** — line 221–233 `'preserves other player properties when updating name'`: After adding `packId: null` to `addPlayer`, the assertion `expect(afterStore.players[0].wedges).toEqual([])` is fine, but any test doing `toEqual(player)` with a full object must include `packId: null` or switch to `expect.objectContaining(...)`.

### `apps/mobile/stores/gameStore.test.ts`

**Analog:** `apps/mobile/stores/gameStore.test.ts` — same file, update mocks + `beforeEach`.

**`beforeEach` state reset** (lines 89–103): Add new fields:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  useGameStore.setState({
    phase: 'setup',
    currentPlayerIndex: 0,
    questionNumber: 1,
    answerRevealed: false,
    currentQuestion: null,
    currentCategory: null,
    completedCategories: [],
    isChampionshipMode: [],
    winner: null,
    activePackId: null,
    playerPackIds: [],      // NEW
    playerCategories: [],   // NEW
  });
});
```

**packStore mock** (lines 33–38): Must include `availablePacks` for `startGame` category derivation:
```typescript
vi.mock('./packStore', () => ({
  usePackStore: {
    getState: vi.fn(() => ({
      activePackId: 'test-pack-id',
      availablePacks: [],          // NEW — required by startGame's deriveCategoriesForPack
      enabledCategories: null,     // NEW — required by startGame's category filter logic
    })),
  },
}));
```

**`selectCategory` test** (line 229–231): Update expected call signature:
```typescript
// BEFORE:
expect(selectQuestion).toHaveBeenCalledWith('pink');

// AFTER: packId is undefined when playerPackIds is [] (no snapshot yet in unit test)
expect(selectQuestion).toHaveBeenCalledWith('pink', undefined);
```

**`markAnswer` championship test** (tests around line 421–438 per RESEARCH.md): Set `playerCategories` in state before the test so `markAnswer` can use `playerCategories[currentPlayerIndex]`:
```typescript
useGameStore.setState({
  // ... existing setup
  playerCategories: [ALL_CATEGORIES],  // NEW — one player, all 6 categories
  playerPackIds: [null],               // NEW
});
```

---

## No Analog Found

All 7 files have close analogs in the codebase. No file requires falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `apps/mobile/types/`, `apps/mobile/stores/`, `apps/mobile/app/game/`, `apps/mobile/services/`
**Files scanned:** 11 primary files read in full
**Pattern extraction date:** 2026-06-12
