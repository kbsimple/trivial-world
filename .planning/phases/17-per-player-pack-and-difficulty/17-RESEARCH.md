# Phase 17: Per-Player Pack and Difficulty - Research

**Researched:** 2026-06-13
**Domain:** Zustand store extension, React Native setup UI, per-player game state
**Confidence:** HIGH

---

## Summary

Phase 17 adds per-player difficulty configuration alongside the per-player pack selection that Phase 15 already built. The core data model work is minimal because the `Difficulty` type (`'easy' | 'medium' | 'hard'`) is already defined in `@trivial-world/types`, the `questions` WatermelonDB table already has a `difficulty` column (schema v3), and `packStore.enabledDifficulties` already drives difficulty filtering in `questionStore.selectQuestion`.

What is missing is the per-player binding: today the difficulty filter is a single game-level toggle in `packStore` (`enabledDifficulties: Difficulty[] | null`). Phase 17 needs to snapshot a per-player difficulty preference at `startGame()` — the same pattern used for per-player packs (`playerPackIds` snapshotted into `gameStore` at game start). During gameplay, `selectQuestion` must receive the active player's difficulty preference alongside their pack ID.

The setup UI already has per-player pack chips in `app/game/setup.tsx` (native-only, row 2 of each `ParticipantRow`). Adding a difficulty chip per player follows the identical pattern.

**Primary recommendation:** Mirror the `playerPackIds` pattern exactly: add `playerDifficulties: (Difficulty | null)[]` to `GameState`, snapshot it in `startGame()`, thread the active player's difficulty into `selectQuestion`, and show a difficulty chip in the setup UI next to the existing pack chip.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-player difficulty preference (pre-game) | Mobile app (`playerStore`) | — | Player entity already holds `packId`; difficulty follows same pattern |
| Snapshot player difficulties at game start | Mobile app (`gameStore.startGame`) | — | Same snapshot pattern as `playerPackIds` — immutable during game |
| Thread difficulty into question selection | Mobile app (`questionStore.selectQuestion`) | — | Already receives `packId`; add `difficulty` param alongside it |
| Setup UI difficulty chip per player | Mobile app (`app/game/setup.tsx`) | — | Existing pack chip is on mobile-only row 2; difficulty chip goes same row |
| Progress strip difficulty display | Mobile app (`app/game/turn.tsx`) | — | Already shows pack name per player; difficulty label fits same line |
| Game-level default difficulty (fallback) | Mobile app (`packStore.enabledDifficulties`) | — | Already exists; used when player has no difficulty set |

---

## Standard Stack

No new dependencies required. All libraries are already installed.

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | 5.x | State management | Already drives `gameStore`, `playerStore`, `packStore` [VERIFIED: package.json] |
| `@trivial-world/types` | workspace | `Difficulty` type (`'easy' | 'medium' | 'hard'`) | Already defines `DifficultySchema` and `Difficulty` type [VERIFIED: packages/types/src/category.ts] |
| `@nozbe/watermelondb` | installed | `difficulty` column in `questions` table already exists | Schema v3 — column added in Phase 16 [VERIFIED: apps/mobile/database/schema.ts line 43] |
| React Native `Alert` | built-in | Pack chip uses `Alert.alert` for picker; difficulty follows same pattern | Already used in `setup.tsx` [VERIFIED: app/game/setup.tsx line 95] |

---

## Architecture Patterns

### System Architecture Diagram

```
Setup Screen (app/game/setup.tsx)
  │  Per-player row: [color dot] [name input] [×]
  │                  [pack chip] [difficulty chip]  ← new
  │
  │  player.difficultyPreference = 'easy'|'medium'|'hard'|null
  │  (stored in playerStore via updatePlayerDifficulty)
  │
  ▼
gameStore.startGame()
  │  playerPackIds      = players.map(p => p.packId ?? activePackId)     (existing)
  │  playerDifficulties = players.map(p => p.difficultyPreference ?? null) ← new
  │  Snapshots both arrays; immutable during game.
  │
  ▼
gameStore.selectCategory(category)
  │  packId     = playerPackIds[currentPlayerIndex]        (existing)
  │  difficulty = playerDifficulties[currentPlayerIndex]   ← new
  │
  ▼
questionStore.selectQuestion(category, packId, difficulty?)
  │  Mobile (WatermelonDB):
  │    If difficulty is non-null → filter questions by that difficulty
  │    If difficulty is null → use game-level enabledDifficulties (fallback)
  │  Web (bundled pool):
  │    Same: if difficulty is non-null, filter pool by difficulty
  │    Otherwise use existing path (no difficulty filter)
  │
  ▼
Turn Screen (app/game/turn.tsx)
  │  Progress strip: [dot] [name] [pack] [difficulty] [N/total]  ← difficulty label new
  └─ Shows active player's difficulty preference
```

### Recommended Project Structure

No new files are strictly required. Changes are additions/extensions to existing files:

```
apps/mobile/
├── types/player.ts                  # Add difficultyPreference field to Player interface
├── stores/playerStore.ts            # Add updatePlayerDifficulty action
├── types/game.ts                    # Add playerDifficulties to GameState
├── stores/gameStore.ts              # Snapshot playerDifficulties in startGame(); thread to selectCategory
├── stores/questionStore.ts          # Add difficulty param to selectQuestion signature
├── services/questionProvider.ts     # Add difficulty filter in getNextQuestionFromBundle (web)
└── app/game/
    ├── setup.tsx                    # Add difficulty chip per player (native-only, row 2)
    └── turn.tsx                     # Show difficulty in progress strip
```

### Pattern 1: Player Model — difficultyPreference field

**What:** Extend `Player` type with an optional `difficultyPreference` field, mirroring `packId`.
**When to use:** When player has a custom difficulty override; `null` = use game-level default.

```typescript
// Source: apps/mobile/types/player.ts — existing Player interface (verified)
export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  wedges: PlayerColor[];
  packId?: string | null;          // existing Phase 15
  difficultyPreference?: Difficulty | null;  // NEW Phase 17
}
```

### Pattern 2: playerStore — updatePlayerDifficulty action

**What:** New action on playerStore mirroring the existing `updatePlayerPack`.

```typescript
// Source: apps/mobile/stores/playerStore.ts — updatePlayerPack pattern (verified)
updatePlayerDifficulty: (id: string, difficulty: Difficulty | null) =>
  set((state) => ({
    players: state.players.map(p =>
      p.id === id ? { ...p, difficultyPreference: difficulty } : p
    ),
  })),
```

Add `updatePlayerDifficulty` to the `PlayerState` interface with the same signature pattern.

### Pattern 3: GameState — playerDifficulties snapshot

**What:** Add `playerDifficulties: (Difficulty | null)[]` to `GameState`, snapshotted at `startGame()` in parallel with `playerPackIds`.

```typescript
// Source: apps/mobile/types/game.ts — GameState interface (verified)
// Add to GameState:
playerDifficulties: (Difficulty | null)[];

// Source: apps/mobile/stores/gameStore.ts — startGame() (verified lines 66, 81)
const playerDifficulties = players.map(p => p.difficultyPreference ?? null);

// In the set() call (line 98+):
set({
  // ...existing fields
  playerPackIds,
  playerCategories,
  playerDifficulties,  // NEW
});
```

Also persist `playerDifficulties` in the `partialize` callback (line 248) alongside `playerPackIds`.

### Pattern 4: selectCategory — thread difficulty

**What:** Pass `playerDifficulties[currentPlayerIndex]` into `selectQuestion`.

```typescript
// Source: apps/mobile/stores/gameStore.ts — selectCategory (verified lines 118-127)
selectCategory: async (category: PlayerColor) => {
  const { playerPackIds, playerDifficulties, currentPlayerIndex } = get();
  const packId = playerPackIds[currentPlayerIndex] ?? undefined;
  const difficulty = playerDifficulties?.[currentPlayerIndex] ?? undefined;
  const question = await useQuestionStore.getState().selectQuestion(category, packId, difficulty);
  // ...
},
```

### Pattern 5: selectQuestion — difficulty parameter

**What:** Extend `selectQuestion` signature to accept optional `difficulty?: Difficulty`.

```typescript
// Source: apps/mobile/stores/questionStore.ts — selectQuestion (verified lines 66-161)
// Change signature:
selectQuestion: (category: PlayerColor, packId?: string, difficulty?: Difficulty) => Promise<Question | null>

// Mobile path: replace existing enabledDifficulties logic:
// If per-player difficulty is set, use it; otherwise fall back to game-level enabledDifficulties
const effectiveDifficulties: Difficulty[] | null = difficulty
  ? [difficulty]
  : (enabledDifficulties && enabledDifficulties.length > 0 ? enabledDifficulties : null);

const filteredQuestions = effectiveDifficulties
  ? questions.filter(q => {
      const qDiff = q.difficulty;
      return qDiff && effectiveDifficulties.includes(qDiff as Difficulty);
    })
  : questions;
```

The same fallback logic applies to `questionProvider.ts` for the web path (`getNextQuestionFromBundle`).

### Pattern 6: Setup UI — difficulty chip per player

**What:** Below the existing pack chip row in `setup.tsx`, add a difficulty chip for native.
**Pattern to mirror:** The existing `packChipRow` (lines 208-224 in setup.tsx).

```typescript
// Source: apps/mobile/app/game/setup.tsx — handlePickPack pattern (verified lines 90-110)
const handlePickDifficulty = (playerId: string) => {
  if (Platform.OS === 'web') return;
  Alert.alert(
    'Select Difficulty',
    undefined,
    [
      { text: 'Default (game setting)', onPress: () => updatePlayerDifficulty(playerId, null) },
      { text: 'Easy', onPress: () => updatePlayerDifficulty(playerId, 'easy') },
      { text: 'Medium', onPress: () => updatePlayerDifficulty(playerId, 'medium') },
      { text: 'Hard', onPress: () => updatePlayerDifficulty(playerId, 'hard') },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
};
```

The chip label: `player.difficultyPreference ?? 'All'`. Place it to the right of the pack chip (or on the same row 2).

### Pattern 7: Progress strip — show difficulty

**What:** In `turn.tsx` progress strip, add difficulty label alongside pack name.

```typescript
// Source: apps/mobile/app/game/turn.tsx — progressEntry (verified lines 110-134)
const difficultyLabel = playerDifficulties?.[idx] ?? null;
// In the JSX:
{difficultyLabel && (
  <Text style={styles.progressDifficulty} numberOfLines={1}>{difficultyLabel}</Text>
)}
```

### Anti-Patterns to Avoid

- **Do not add difficulty to packStore as a per-player concept.** `packStore.enabledDifficulties` is the game-level default. Per-player difficulty lives on the `Player` model and is snapshotted into `gameStore.playerDifficulties` at game start — exactly like `packId` / `playerPackIds`.
- **Do not alter the WatermelonDB schema for this phase.** The `difficulty` column already exists in schema v3 (Phase 16). No migration needed.
- **Do not remove the `enabledDifficulties` fallback path.** A player with `difficultyPreference = null` should fall through to the game-level `enabledDifficulties`. If `enabledDifficulties` is also null, all difficulties are enabled — this is the existing behavior.
- **Do not apply difficulty chip on web.** Web uses the bundled question pool and has no per-player pack selection (decision D-v4-06). Difficulty chip on web would be inconsistent; guard with `Platform.OS !== 'web'`.
- **Do not reset `difficultyPreference` on `removePlayer`.** `removePlayer` reassigns colors but does not clear other player fields — the existing `updatePlayerPack` follows this pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Difficulty picker UI | Custom modal/sheet | `Alert.alert` with options (existing pattern) | Already used for pack chip; consistent UX, zero new deps |
| Per-player difficulty storage | New Zustand store | Extend `Player` model in existing `playerStore` | Pack selection lives here; difficulty is same kind of player config |
| Difficulty filtering at query time | Complex WatermelonDB query clauses | In-memory filter after fetch (existing pattern) | WatermelonDB query for `difficulty` is optional — existing code already uses post-fetch `.filter()` |
| New snapshotting infrastructure | Custom game-start hook | Extend existing `startGame()` `set()` call | `playerPackIds` pattern is identical; just add one more array |

---

## Runtime State Inventory

This phase is a feature addition (new fields on existing models), not a rename or migration.

**Stored data:** None — no database schema changes (difficulty column already exists at schema v3). The new `playerDifficulties` array is in-memory Zustand state, persisted via `platformStorage` (sessionStorage on web, AsyncStorage on mobile). Existing persisted game states will deserialize with `playerDifficulties: undefined` — treat `undefined` as `null` (no per-player difficulty) which is the correct fallback behavior. [VERIFIED: gameStore `partialize` serializes what it includes; missing keys become `undefined` on rehydration]

**Live service config:** None.

**OS-registered state:** None.

**Secrets/env vars:** None.

**Build artifacts:** None.

---

## Common Pitfalls

### Pitfall 1: Stale `playerDifficulties` not reset on `resetGame`

**What goes wrong:** `resetGame()` clears `playerPackIds: []` but if `playerDifficulties` is not included in the reset, a restarted game carries over the previous game's per-player difficulty snapshot.
**Why it happens:** `resetGame` is a manual `set()` call that lists fields explicitly — any new field not added will be silently omitted.
**How to avoid:** Add `playerDifficulties: []` to the `resetGame` `set()` call alongside `playerPackIds: []`.
**Warning signs:** After a game finishes and a new one starts with different players, old difficulty preferences leak into the new game.

### Pitfall 2: `enabledDifficulties` fallback swallowed by `undefined` vs `null`

**What goes wrong:** `difficulty` param to `selectQuestion` is `undefined` when `playerDifficulties[idx]` is out-of-bounds or unset. The fallback logic `difficulty ? [difficulty] : enabledDifficulties` evaluates `undefined` as falsy — that's correct. But explicitly storing `null` in `playerDifficulties` also evaluates as falsy — also correct. Both `null` and `undefined` correctly fall through to `enabledDifficulties`.
**Why it happens:** No bug, but the intent must be documented so future maintainers don't "fix" it.
**How to avoid:** Use `difficulty != null ? [difficulty] : enabledDifficulties` to be explicit about intentional null/undefined collapse.

### Pitfall 3: `playerDifficulties` not included in `partialize`

**What goes wrong:** If `playerDifficulties` is added to state but omitted from `gameStore`'s `partialize` callback, it will not survive app backgrounding on mobile (AsyncStorage only stores partialize output).
**Why it happens:** `partialize` is a whitelist — new state fields are excluded unless explicitly added.
**How to avoid:** Add `playerDifficulties: state.playerDifficulties` to the `partialize` callback alongside `playerPackIds`.
**Warning signs:** Per-player difficulty is correctly set before backgrounding the app but appears as the default when resuming.

### Pitfall 4: playerStore `updatePlayerDifficulty` not in `PlayerState` interface

**What goes wrong:** TypeScript will error when calling `updatePlayerDifficulty` if the method is added to the store implementation but not declared in the `PlayerState` interface.
**Why it happens:** `playerStore.ts` exports both the store and the `PlayerState` interface; both must be updated together.
**How to avoid:** Add `updatePlayerDifficulty: (id: string, difficulty: Difficulty | null) => void` to `PlayerState` in `types/player.ts` at the same time as the store implementation.

### Pitfall 5: `questionProvider.ts` web path does not receive difficulty

**What goes wrong:** `questionStore.selectQuestion` has two paths: WatermelonDB (mobile) and `getNextQuestion` (web). The mobile path reads `difficulty` from the new param. The web path calls `getNextQuestion(category, excludeIds, packId)` — if `difficulty` is not forwarded, web users never get per-player difficulty filtering.
**Why it happens:** `getNextQuestion` in `questionProvider.ts` has a different signature from `selectQuestion`.
**How to avoid:** Extend `getNextQuestion` to accept an optional `difficulty?: Difficulty` parameter and apply in-memory filtering in `getNextQuestionFromBundle`.

### Pitfall 6: `updatePlayerDifficulty` not called in `setup.tsx`

**What goes wrong:** The handler `handlePickDifficulty` is written but `updatePlayerDifficulty` is not destructured from `usePlayerStore()`.
**Why it happens:** `setup.tsx` currently destructures `{ players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack }` from `usePlayerStore`. Adding `updatePlayerDifficulty` to the implementation but forgetting the destructure means it silently does nothing.
**How to avoid:** Add `updatePlayerDifficulty` to the destructure at the top of `SetupScreen`.

---

## Code Examples

### Full selectQuestion signature extension

```typescript
// Source: apps/mobile/stores/questionStore.ts — QuestionState interface + selectQuestion (verified)
// CHANGE: Add difficulty param to interface
selectQuestion: (category: PlayerColor, packId?: string, difficulty?: Difficulty) => Promise<Question | null>;

// In the implementation (mobile WatermelonDB path, after fetching rawQuestions):
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

### gameStore startGame() additions

```typescript
// Source: apps/mobile/stores/gameStore.ts — startGame lines 63-115 (verified)
// After existing playerPackIds derivation:
const playerDifficulties = players.map(p => p.difficultyPreference ?? null);

// In the set() call, add:
playerDifficulties,

// In partialize callback, add:
playerDifficulties: state.playerDifficulties,
```

### selectCategory with difficulty threading

```typescript
// Source: apps/mobile/stores/gameStore.ts — selectCategory lines 118-127 (verified)
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

### Setup UI difficulty chip (native-only)

```typescript
// Source: apps/mobile/app/game/setup.tsx — handlePickPack pattern lines 90-110 (verified)
// Add after pack chip row in the player map:
{Platform.OS !== 'web' && (
  <View style={styles.packChipRow}>
    <Pressable
      style={[
        styles.packChip,
        player.difficultyPreference ? styles.packChipActive : styles.packChipDefault,
      ]}
      onPress={() => handlePickDifficulty(player.id)}
    >
      <Text style={styles.packChipText} numberOfLines={1}>
        {player.difficultyPreference
          ? player.difficultyPreference.charAt(0).toUpperCase() + player.difficultyPreference.slice(1)
          : 'Any Difficulty'}
      </Text>
    </Pressable>
  </View>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single global difficulty filter | Per-player difficulty snapshot | Phase 17 | Each player gets questions at their own difficulty level |
| Difficulty filter as pre-game setting (packStore) | Per-player setting (playerStore) + game-level fallback (packStore) | Phase 17 | Game-level `enabledDifficulties` becomes a fallback, not the only source |

**No deprecations.** The game-level `enabledDifficulties` in `packStore` remains functional as a fallback — it is not removed.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Difficulty chip uses `Alert.alert` same as pack chip | Code Examples §Setup UI | If wrong, user may prefer a different picker UI (segmented control inline); scope increases |
| A2 | Difficulty chip lives on the same "row 2" as the pack chip (both chips side by side) | Architecture Patterns §Pattern 6 | If wrong, each chip gets its own row — minor layout change only |
| A3 | `playerDifficulties` is `(Difficulty | null)[]` — null means "use game-level default" | Architecture Patterns §Pattern 3 | If wrong and user wants "no filter" as a distinct state from "fallback to game default", a different sentinel is needed |
| A4 | No changes to WatermelonDB schema are needed — difficulty column already exists | Common Pitfalls §Pitfall 1 preamble | If Phase 16 was not yet executed, schema is v2 and the column does not exist — but Phase 17 depends on Phase 16 |

---

## Open Questions

1. **Should the difficulty chip be on the same row as the pack chip, or its own row?**
   - What we know: Current row 2 has one pack chip, horizontal flex row, space available.
   - What's unclear: At narrow screen widths, two chips on one row may truncate.
   - Recommendation: Place both chips on row 2 side by side (pack chip left, difficulty chip right). If truncation is a problem, difficulty gets its own row 3 — easy to adjust in plan.

2. **Should `playerDifficulties` be initialized when `addPlayer` is called (defaulting to `null`)?**
   - What we know: `packId` is initialized to `null` explicitly in `addPlayer` to avoid undefined serialization issues.
   - What's unclear: Whether to add `difficultyPreference: null` to the initial player object in `addPlayer`.
   - Recommendation: Yes — initialize `difficultyPreference: null` in `addPlayer` for consistent serialization (mirroring `packId` behavior).

---

## Environment Availability

Step 2.6: SKIPPED — Phase 17 is purely code/UI changes to existing mobile app files. No new external tools, services, CLIs, runtimes, or databases are required. All dependencies (Zustand, WatermelonDB, React Native, Expo Router, Tamagui) are already installed.

---

## Validation Architecture

`workflow.nyquist_validation` is `false` in `.planning/config.json`. Section skipped.

---

## Security Domain

Phase 17 adds UI pickers and in-memory player state. No authentication, session management, access control, or cryptography is involved.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this phase |
| V3 Session Management | No | No session tokens |
| V4 Access Control | No | Local gameplay, no server |
| V5 Input Validation | Yes (trivial) | Difficulty values come from a fixed Alert.alert option list — no free-text input; Zod `DifficultySchema` validates downstream |
| V6 Cryptography | No | No crypto |

---

## Sources

### Primary (HIGH confidence)
- `packages/types/src/category.ts` — confirmed `DifficultySchema` and `Difficulty` type (`'easy' | 'medium' | 'hard'`) [VERIFIED: read directly]
- `packages/types/src/question-pack.ts` — confirmed `QuestionSchema` has `difficulty: DifficultySchema.optional()` [VERIFIED: read directly]
- `apps/mobile/database/schema.ts` — confirmed schema v3, `difficulty` column exists in `questions` table as optional string [VERIFIED: read directly]
- `apps/mobile/database/models/Question.ts` — confirmed `@field('difficulty') difficulty?: Difficulty` on QuestionModel [VERIFIED: read directly]
- `apps/mobile/types/player.ts` — confirmed `Player.packId?: string | null` pattern to mirror [VERIFIED: read directly]
- `apps/mobile/types/game.ts` — confirmed `GameState.playerPackIds` and `playerCategories` fields to mirror [VERIFIED: read directly]
- `apps/mobile/stores/playerStore.ts` — confirmed `updatePlayerPack` action pattern [VERIFIED: read directly]
- `apps/mobile/stores/gameStore.ts` — confirmed `startGame()` playerPackIds snapshot, `selectCategory` pack threading, `partialize` callback, `resetGame` explicit field list [VERIFIED: read directly]
- `apps/mobile/stores/questionStore.ts` — confirmed `selectQuestion(category, packId?)` signature, `enabledDifficulties` post-fetch filter logic [VERIFIED: read directly]
- `apps/mobile/services/questionProvider.ts` — confirmed `getNextQuestion` web path that also needs difficulty param [VERIFIED: read directly]
- `apps/mobile/app/game/setup.tsx` — confirmed pack chip pattern (row 2, native-only, `Alert.alert` picker, `handlePickPack` pattern) [VERIFIED: read directly]
- `apps/mobile/app/game/turn.tsx` — confirmed progress strip shows `displayPackName` per player [VERIFIED: read directly]

### Secondary (MEDIUM confidence)
- `.planning/phases/16-cli-question-generation/16-RESEARCH.md` — tidbits/difficulty schema history, WatermelonDB migration context

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new deps; all existing libraries verified in source files
- Architecture: HIGH — every file referenced was read; patterns are direct copies/extensions of existing Phase 15 patterns
- Pitfalls: HIGH — derived from reading actual code (partialize whitelist, resetGame explicit field list, PlayerState interface)

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable domain; all patterns are internal to this codebase)
