# Phase 17: Per-Player Pack and Difficulty - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 8
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/mobile/types/player.ts` | model | — | self (extend `packId` pattern) | exact |
| `apps/mobile/stores/playerStore.ts` | store | CRUD | self (extend `updatePlayerPack` action) | exact |
| `apps/mobile/types/game.ts` | model | — | self (extend `playerPackIds` pattern) | exact |
| `apps/mobile/stores/gameStore.ts` | store | CRUD | self (extend `startGame` + `selectCategory`) | exact |
| `apps/mobile/stores/questionStore.ts` | store | request-response | self (extend `selectQuestion` + difficulty filter) | exact |
| `apps/mobile/services/questionProvider.ts` | service | request-response | self (extend `getNextQuestionFromBundle` difficulty filter) | exact |
| `apps/mobile/app/game/setup.tsx` | component | event-driven | self (extend `handlePickPack` + `packChipRow`) | exact |
| `apps/mobile/app/game/turn.tsx` | component | request-response | self (extend progress strip `displayPackName` pattern) | exact |

All files are self-analogs — each file already contains the identical pattern (for `packId` / pack chips / pack names) that the difficulty feature mirrors exactly.

---

## Pattern Assignments

### `apps/mobile/types/player.ts` (model)

**Analog:** self — extend the existing `packId` field pattern.

**Current `Player` interface** (lines 7–18):
```typescript
export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  wedges: PlayerColor[];
  /** Per-player pack override — null means use game-level activePackId */
  packId?: string | null;
}
```

**Addition to make:**
```typescript
// Add after packId (line 17):
/** Per-player difficulty override — null means use game-level enabledDifficulties */
difficultyPreference?: Difficulty | null;
```

**Import to add** (line 1):
```typescript
import { Difficulty } from '@trivial-world/types';
```

**`PlayerState` interface action to add** (after `updatePlayerPack` at line 38):
```typescript
/** Assign a difficulty preference to a specific player (null = use game default) */
updatePlayerDifficulty: (id: string, difficulty: Difficulty | null) => void;
```

---

### `apps/mobile/stores/playerStore.ts` (store, CRUD)

**Analog:** self — mirror `updatePlayerPack` (lines 75–79).

**`updatePlayerPack` pattern to copy** (lines 75–79):
```typescript
updatePlayerPack: (id: string, packId: string | null) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, packId } : p
  ),
})),
```

**New action to add** (immediately after `updatePlayerPack`):
```typescript
updatePlayerDifficulty: (id: string, difficulty: Difficulty | null) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, difficultyPreference: difficulty } : p
  ),
})),
```

**`addPlayer` initial object to extend** (lines 43–54):
```typescript
// Current initial player object:
{
  id: generateId(),
  name: playerName,
  color: nextColor,
  wedges: [],
  packId: null,   // explicit null — stable serialization
}
// Add:
  difficultyPreference: null,  // explicit null — mirrors packId pattern
```

**Import to add** (top of file):
```typescript
import { Difficulty } from '@trivial-world/types';
```

---

### `apps/mobile/types/game.ts` (model)

**Analog:** self — mirror `playerPackIds` field (line 42).

**Current `playerPackIds` pattern** (lines 41–45):
```typescript
/** Snapshotted pack ID per player at game start (index matches player order).
 *  null = player inherited the game-level activePackId. */
playerPackIds: (string | null)[];
/** Snapshotted active categories per player (from pack categoryCounts + enabledCategories filter).
 *  Immutable during game — determines per-player championship condition. */
playerCategories: PlayerColor[][];
```

**Addition to make** (after `playerCategories`, line 45):
```typescript
/** Snapshotted difficulty preference per player at game start (index matches player order).
 *  null = player uses game-level enabledDifficulties fallback. */
playerDifficulties: (Difficulty | null)[];
```

**Import to add** (line 1):
```typescript
import { Difficulty } from '@trivial-world/types';
```

---

### `apps/mobile/stores/gameStore.ts` (store, CRUD)

**Analog:** self — extend three locations following existing `playerPackIds` pattern.

**Location 1 — Initial state** (line 48):
```typescript
// Current:
playerPackIds: [],
playerCategories: [],
// Add:
playerDifficulties: [],
```

**Location 2 — `startGame()` snapshot** (lines 66 and 98–111):

Existing `playerPackIds` derivation (line 66):
```typescript
const playerPackIds = players.map(p => p.packId ?? activePackId ?? null);
```

Add immediately after (same pattern):
```typescript
const playerDifficulties = players.map(p => p.difficultyPreference ?? null);
```

Existing `set()` call (lines 98–111):
```typescript
set({
  phase: 'selecting',
  // ...
  playerPackIds,
  playerCategories,
  // ADD:
  playerDifficulties,
});
```

**Location 3 — `selectCategory`** (lines 118–127):

Current implementation:
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

Modified implementation:
```typescript
selectCategory: async (category: PlayerColor) => {
  const { playerPackIds, playerDifficulties, currentPlayerIndex } = get();
  const packId = playerPackIds[currentPlayerIndex] ?? undefined;
  const difficulty = (playerDifficulties ?? [])[currentPlayerIndex] ?? undefined;
  const question = await useQuestionStore.getState().selectQuestion(category, packId, difficulty);
  set({
    currentCategory: category,
    currentQuestion: question,
    phase: 'answering',
  });
},
```

**Location 4 — `resetGame()`** (lines 228–243):

Current `resetGame` set call:
```typescript
resetGame: () => {
  set({
    phase: 'setup',
    // ...
    playerPackIds: [],
    playerCategories: [],
  });
},
```

Add to the set call:
```typescript
playerDifficulties: [],
```

**Location 5 — `partialize` callback** (lines 248–258):

Current:
```typescript
partialize: (state) => ({
  // ...
  playerPackIds: state.playerPackIds,
  playerCategories: state.playerCategories,
}),
```

Add:
```typescript
playerDifficulties: state.playerDifficulties,
```

---

### `apps/mobile/stores/questionStore.ts` (store, request-response)

**Analog:** self — extend `selectQuestion` signature and difficulty filter logic.

**Current interface declaration** (line 43):
```typescript
selectQuestion: (category: PlayerColor, packId?: string) => Promise<Question | null>;
```

**New signature:**
```typescript
selectQuestion: (category: PlayerColor, packId?: string, difficulty?: Difficulty) => Promise<Question | null>;
```

**Current difficulty filter** (lines 124–129) — the game-level `enabledDifficulties` filter to replace:
```typescript
// D-06: Apply difficulty filter if set
const filteredQuestions = enabledDifficulties && enabledDifficulties.length > 0
  ? questions.filter(q => {
      const qDifficulty = q.difficulty;
      return qDifficulty && enabledDifficulties.includes(qDifficulty as Difficulty);
    })
  : questions;
```

**Replacement — per-player difficulty with game-level fallback:**
```typescript
// D-06: Per-player difficulty takes precedence; fallback to game-level enabledDifficulties
const effectiveDifficulties: Difficulty[] | null =
  difficulty != null
    ? [difficulty]
    : (enabledDifficulties && enabledDifficulties.length > 0 ? enabledDifficulties : null);

const filteredQuestions = effectiveDifficulties
  ? questions.filter(q => {
      const qDifficulty = q.difficulty;
      return qDifficulty && effectiveDifficulties.includes(qDifficulty as Difficulty);
    })
  : questions;
```

**Web path** (lines 67–75) — add `difficulty` param forwarded to `getNextQuestion`:
```typescript
// Current:
selectQuestion: async (category: PlayerColor, packId?: string) => {
  if (Platform.OS === 'web') {
    const { activePackId } = usePackStore.getState();
    const resolvedPackId = packId ?? activePackId ?? undefined;
    const question = await getNextQuestion(category, get().askedQuestionIds, resolvedPackId);
// Modified:
selectQuestion: async (category: PlayerColor, packId?: string, difficulty?: Difficulty) => {
  if (Platform.OS === 'web') {
    const { activePackId } = usePackStore.getState();
    const resolvedPackId = packId ?? activePackId ?? undefined;
    const question = await getNextQuestion(category, get().askedQuestionIds, resolvedPackId, difficulty);
```

---

### `apps/mobile/services/questionProvider.ts` (service, request-response)

**Analog:** self — extend `getNextQuestion` and `getNextQuestionFromBundle` to accept and apply `difficulty`.

**Current `getNextQuestion` signature** (lines 55–59):
```typescript
export async function getNextQuestion(
  category: PlayerColor,
  excludeIds: string[],
  packId?: string
): Promise<Question | null> {
  if (Platform.OS === 'web') {
    return getNextQuestionFromBundle(playerColorToCategory(category), excludeIds, packId);
  }
```

**New signature** (add `difficulty` param, thread to both branches):
```typescript
export async function getNextQuestion(
  category: PlayerColor,
  excludeIds: string[],
  packId?: string,
  difficulty?: Difficulty
): Promise<Question | null> {
  if (Platform.OS === 'web') {
    return getNextQuestionFromBundle(playerColorToCategory(category), excludeIds, packId, difficulty);
  }
  return getNextQuestionFromDatabase(category, excludeIds, difficulty);
}
```

**Current `getNextQuestionFromBundle`** (lines 85–109):
```typescript
async function getNextQuestionFromBundle(
  category: Category,
  excludeIds: string[],
  packId?: string
): Promise<Question | null> {
  const pool = packId
    ? ((await fetchWebPackQuestions(packId)) ?? ALL_QUESTIONS)
    : ALL_QUESTIONS;

  const available = pool.filter(
    (q) => q.category === category && !excludeIds.includes(q.id)
  );
```

**Modified** — add difficulty filter after building `available`:
```typescript
async function getNextQuestionFromBundle(
  category: Category,
  excludeIds: string[],
  packId?: string,
  difficulty?: Difficulty
): Promise<Question | null> {
  const pool = packId
    ? ((await fetchWebPackQuestions(packId)) ?? ALL_QUESTIONS)
    : ALL_QUESTIONS;

  const available = pool.filter(
    (q) => q.category === category && !excludeIds.includes(q.id)
      && (difficulty == null || q.difficulty === difficulty)
  );
```

The exhausted-pool fallback (lines 100–106) should also apply the difficulty filter:
```typescript
  if (available.length === 0) {
    const categoryQuestions = pool.filter(
      (q) => q.category === category
        && (difficulty == null || q.difficulty === difficulty)
    );
    if (categoryQuestions.length === 0) return null;
    // ...
  }
```

**`getNextQuestionFromDatabase`** (lines 115–212) already has the game-level `enabledDifficulties` filter at lines 179–184. Add `difficulty` param and apply the same per-player-first logic:

```typescript
async function getNextQuestionFromDatabase(
  category: PlayerColor,
  excludeIds: string[],
  difficulty?: Difficulty       // ADD
): Promise<Question | null> {
  // ...
  const { activePackId, enabledCategories, enabledDifficulties } = usePackStore.getState();
  // ...
  // Replace lines 179-184:
  const effectiveDifficulties: Difficulty[] | null =
    difficulty != null
      ? [difficulty]
      : (enabledDifficulties && enabledDifficulties.length > 0 ? enabledDifficulties : null);

  const filteredQuestions = effectiveDifficulties
    ? questions.filter(q => {
        const qDifficulty = q.difficulty;
        return qDifficulty && effectiveDifficulties.includes(qDifficulty as Difficulty);
      })
    : questions;
```

---

### `apps/mobile/app/game/setup.tsx` (component, event-driven)

**Analog:** self — mirror the `handlePickPack` / `packChipRow` / `packChip` pattern exactly.

**Destructure addition** (line 27):
```typescript
// Current:
const { players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack } = usePlayerStore();
// Modified:
const { players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack, updatePlayerDifficulty } = usePlayerStore();
```

**`handlePickPack` pattern** (lines 90–110) — copy for difficulty:
```typescript
const handlePickDifficulty = (playerId: string) => {
  if (Platform.OS === 'web') return;
  Alert.alert(
    'Select Difficulty',
    undefined,
    [
      { text: 'Any Difficulty', onPress: () => updatePlayerDifficulty(playerId, null) },
      { text: 'Easy', onPress: () => updatePlayerDifficulty(playerId, 'easy') },
      { text: 'Medium', onPress: () => updatePlayerDifficulty(playerId, 'medium') },
      { text: 'Hard', onPress: () => updatePlayerDifficulty(playerId, 'hard') },
      { text: 'Cancel', style: 'cancel' as const },
    ]
  );
};
```

**Pack chip label pattern** (lines 176–181) — copy for difficulty:
```typescript
const difficultyLabel = player.difficultyPreference
  ? player.difficultyPreference.charAt(0).toUpperCase() + player.difficultyPreference.slice(1)
  : 'Any Difficulty';
```

**`packChipRow` JSX** (lines 208–223) — current:
```typescript
{Platform.OS !== 'web' && (
  <View style={styles.packChipRow}>
    <Pressable
      style={[
        styles.packChip,
        playerPackName ? styles.packChipActive : styles.packChipDefault,
      ]}
      onPress={() => handlePickPack(player.id)}
    >
      <Text style={styles.packChipText} numberOfLines={1}>
        {chipLabel}
      </Text>
    </Pressable>
  </View>
)}
```

**Modified** — add difficulty chip to the same row (add `gap: 4` to `packChipRow` style):
```typescript
{Platform.OS !== 'web' && (
  <View style={styles.packChipRow}>
    <Pressable
      style={[
        styles.packChip,
        playerPackName ? styles.packChipActive : styles.packChipDefault,
      ]}
      onPress={() => handlePickPack(player.id)}
    >
      <Text style={styles.packChipText} numberOfLines={1}>
        {chipLabel}
      </Text>
    </Pressable>
    <Pressable
      style={[
        styles.packChip,
        player.difficultyPreference ? styles.packChipActive : styles.packChipDefault,
      ]}
      onPress={() => handlePickDifficulty(player.id)}
    >
      <Text style={styles.packChipText} numberOfLines={1}>
        {difficultyLabel}
      </Text>
    </Pressable>
  </View>
)}
```

**`packChipRow` style addition** (lines 350–355):
```typescript
packChipRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingLeft: 36,
  marginTop: 4,
  gap: 4,   // ADD — 4px between pack chip and difficulty chip
},
```

No new styles needed — `packChip`, `packChipDefault`, `packChipActive`, and `packChipText` are reused verbatim for the difficulty chip.

---

### `apps/mobile/app/game/turn.tsx` (component, request-response)

**Analog:** self — mirror `displayPackName` / `progressPack` pattern in the progress strip.

**`useGameStore` destructure** (lines 21–28):
```typescript
// Current:
const {
  selectCategory,
  currentPlayerIndex,
  completedCategories,
  isChampionshipMode,
  playerPackIds,
  playerCategories,
} = useGameStore();
// Add:
  playerDifficulties,
```

**`displayPackName` pattern** (lines 114–120) — copy for difficulty:
```typescript
const pid = playerPackIds[idx];
const rawPackName = pid
  ? (availablePacks.find(p => p.id === pid)?.name ?? null)
  : null;
const displayPackName = rawPackName
  ? (rawPackName.length > 12 ? rawPackName.slice(0, 12) + '...' : rawPackName)
  : null;
```

Add after `displayPackName`:
```typescript
const difficultyLabel = playerDifficulties?.[idx] != null
  ? (playerDifficulties[idx] as string).charAt(0).toUpperCase()
    + (playerDifficulties[idx] as string).slice(1)
  : null;
```

**`progressEntry` JSX** (lines 122–133) — current:
```typescript
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
```

**Modified** — add difficulty label between pack and count:
```typescript
<View key={player.id} style={styles.progressEntry}>
  <View style={[styles.progressDot, { backgroundColor: CATEGORY_COLORS[player.color] }]} />
  <Text style={styles.progressName} numberOfLines={1}>
    {player.name}
  </Text>
  {displayPackName && (
    <Text style={styles.progressPack} numberOfLines={1}>{displayPackName}</Text>
  )}
  {difficultyLabel && (
    <Text style={styles.progressDifficulty} numberOfLines={1}>{difficultyLabel}</Text>
  )}
  <Text style={styles.progressCount}>
    {champ ? '🏆' : `${count}/${totalCats}`}
  </Text>
</View>
```

**New style** (after `progressPack` at lines 250–254):
```typescript
progressPack: {
  color: '#888',
  fontSize: 11,
  marginRight: 4,
},
// ADD:
progressDifficulty: {
  color: '#888',
  fontSize: 11,
  marginRight: 4,
},
```

`progressName` stays as `flex: 1` (line 239–242) to push pack/difficulty/count to the right — no change needed.

---

## Shared Patterns

### Zustand store field extension
**Source:** `apps/mobile/stores/playerStore.ts` lines 75–79 (`updatePlayerPack`)
**Source:** `apps/mobile/stores/gameStore.ts` lines 66, 98–111 (`playerPackIds` snapshot in `startGame`)
**Apply to:** `playerStore.ts`, `gameStore.ts`

The canonical pattern for adding a new per-player field:
1. Add field to the `Player` interface (optional, `?:`)
2. Initialize to `null` explicitly in `addPlayer` (avoids `undefined` serialization issues)
3. Add a `updatePlayer<Field>` action using `.map(p => p.id === id ? { ...p, field } : p)`
4. Add `<Field>State` action signature to the interface in `types/player.ts`
5. Snapshot in `gameStore.startGame()` as `playerField = players.map(p => p.field ?? null)`
6. Add to `set()` in `startGame`, `resetGame`, and `partialize`

### Alert.alert picker (platform-guarded)
**Source:** `apps/mobile/app/game/setup.tsx` lines 90–110 (`handlePickPack`)
**Apply to:** `setup.tsx` (`handlePickDifficulty`)

```typescript
const handlePickX = (playerId: string) => {
  if (Platform.OS === 'web') return;
  Alert.alert(
    'Title',
    undefined,
    [
      { text: 'Default option', onPress: () => updatePlayerX(playerId, null) },
      { text: 'Option A', onPress: () => updatePlayerX(playerId, 'a') },
      { text: 'Cancel', style: 'cancel' as const },
    ]
  );
};
```

### Chip component (inline Pressable + Text, reuse existing styles)
**Source:** `apps/mobile/app/game/setup.tsx` lines 209–222 (pack chip JSX) and lines 356–370 (styles)
**Apply to:** difficulty chip in `setup.tsx`

Reuse styles `packChip`, `packChipDefault`, `packChipActive`, `packChipText` — no new style entries needed for the chip itself.

### Progress strip secondary label
**Source:** `apps/mobile/app/game/turn.tsx` lines 126–129 (`displayPackName` + `progressPack`)
**Apply to:** difficulty label in `turn.tsx`

```typescript
// Pattern: conditional text node with same color/size as progressPack
{labelValue && (
  <Text style={styles.progressDifficulty} numberOfLines={1}>{labelValue}</Text>
)}
// Style: { color: '#888', fontSize: 11, marginRight: 4 } — identical to progressPack
```

### Difficulty filter with per-player-first fallback
**Source:** `apps/mobile/stores/questionStore.ts` lines 124–129 (existing `enabledDifficulties` filter)
**Apply to:** `questionStore.ts` and `questionProvider.ts`

```typescript
const effectiveDifficulties: Difficulty[] | null =
  difficulty != null
    ? [difficulty]
    : (enabledDifficulties && enabledDifficulties.length > 0 ? enabledDifficulties : null);
```

`difficulty != null` (not `!difficulty`) is intentional — both `null` and `undefined` fall through to the game-level default.

---

## No Analog Found

None — all 8 files are self-analogs. Every pattern in Phase 17 is a direct extension of an identical existing pattern introduced by Phase 15 (per-player packs).

---

## Metadata

**Analog search scope:** `apps/mobile/types/`, `apps/mobile/stores/`, `apps/mobile/services/`, `apps/mobile/app/game/`
**Files scanned:** 8 (all read in full; none exceed 300 lines)
**Pattern extraction date:** 2026-06-13
