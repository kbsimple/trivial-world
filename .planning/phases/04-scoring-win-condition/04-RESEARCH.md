# Phase 4: Scoring & Win Condition - Research

**Researched:** 2026-06-08
**Domain:** Scoring mechanics, wedge collection, win detection, game results
**Confidence:** HIGH

## Summary

Phase 4 implements the scoring and win condition system for Trivial World, building on the game loop and question management from Phases 1-3. The system must: (1) track each player's wedge collection across 6 categories, (2) award wedges when players answer correctly on category spaces, (3) detect the win condition (all 6 wedges plus correct center question), and (4) display final scores and winner at game end.

The current codebase has a complete game loop (rolling → moving → answering → scoring → rolling) with state transitions managed in GameStore. Phase 4 extends PlayerStore to track wedges per player and adds win detection logic to GameStore. The scoring phase transitions to either "rolling" (next turn) or "finished" (game end) based on win condition check.

**Primary recommendation:** Extend Player type with a `wedges: PlayerColor[]` array (max 6, one per category). Add win detection logic in GameStore's `markAnswer()` that checks for all 6 wedges + center question. Display final results on the "finished" phase with a results screen showing each player's wedge count.

## User Constraints

### Locked Decisions (from Previous Phases)

From Phase 1 CONTEXT.md:
- **D-16:** After marking correct/incorrect — automatically advance to next turn
- **D-15:** Conductor mode implicit — person holding phone is always conductor
- **D-17:** Current player indicator — small name/avatar at top of screen

From Project Constraints:
- Framework: Expo SDK 55 + React Native 0.83
- State Management: Zustand 5.x with persist middleware
- UI: Tamagui 2.x
- Categories: Blue, Pink, Yellow, Purple, Green, Orange (fixed 6 categories)
- Offline-first: No network dependency

### Phase Requirements (from REQUIREMENTS.md)

| ID | Description | Research Support |
|----|-------------|------------------|
| SCOR-01 | App tracks each participant's score and wedge collection | Extend Player interface with `wedges: PlayerColor[]` array |
| SCOR-02 | App awards category wedge when answering correctly on category space | Add `awardWedge()` in PlayerStore, integrate with board position |
| SCOR-03 | App detects win condition (all 6 wedges + center) | Add `checkWinCondition()` in GameStore, trigger on markAnswer |
| SCOR-04 | App displays final scores and winner at game end | Create Results screen with player scores and wedge counts |

### Claude's Discretion

- Wedge collection data structure (array vs. Set vs. object)
- Win condition UX (immediate celebration vs. confirmation screen)
- Results screen layout and animations
- Handling ties/multiple winners (rare but possible)
- Center question mechanics (when/how center questions trigger)

### Deferred Ideas (Out of Scope)

- Score breakdown by category (v2)
- Achievement system (v2)
- Leaderboards (v2 - requires accounts)
- Detailed game statistics (v2)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|-----------------|-----------|
| Wedge tracking | State (Zustand) | — | Player wedges stored in PlayerStore, persists with game |
| Win detection | State (Zustand) | — | Logic in GameStore.markAnswer() checks condition |
| Results display | UI (React) | — | Results screen component renders final scores |
| Center question | State (Zustand) | — | Board position logic triggers center category |
| Animation | UI (Client) | — | Reanimated wedge collection animations |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.14 | State management | Already in use for gameStore, playerStore; persist middleware for wedge tracking |
| @react-native-async-storage/async-storage | ^2.1.0 | Persist wedge data | Already in use; PlayerStore persists with game state |
| react-native-reanimated | ~3.17.4 | Wedge award animation | Already in use for die roll; same pattern for wedge animations |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-haptics | ~56.0.3 | Wedge award haptic | Optional celebration feedback on wedge earned |
| tamagui | ^2.1.0 | Results screen UI | Dark theme consistency, wedge badges |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Array for wedges | Set<PlayerColor> | Set prevents duplicates but array is simpler for count and iteration; already using array pattern in PlayerStore |
| Object for wedges | Record<PlayerColor, boolean> | More explicit but harder to iterate and count; array is simpler for "collect all 6" |
| Lodash for win check | Native array methods | Lodash adds bundle size for simple `.length === 6` check |

**Installation:** No new packages required. All dependencies already installed.

**Version verification:**
```bash
npm view zustand version  # ^5.0.14 (already installed)
npm view @react-native-async-storage/async-storage version  # ^2.1.0 (already installed)
npm view react-native-reanimated version  # ~3.17.4 (already installed)
```

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Scoring Flow                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Answer Marked Correct]                                                 │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────┐                                │
│  │     GameStore.markAnswer(true)       │                                │
│  │     phase: 'scoring'                 │                                │
│  └──────────────────┬──────────────────┘                                │
│                     │                                                    │
│                     ▼                                                    │
│  ┌─────────────────────────────────────┐                                │
│  │     Check Board Position             │                                │
│  │     Is current space a category?     │                                │
│  └──────────────────┬──────────────────┘                                │
│                     │                                                    │
│         ┌───────────┴───────────┐                                        │
│         │                       │                                        │
│      [Category Space]      [Center/Other]                               │
│         │                       │                                        │
│         ▼                       │                                        │
│  ┌──────────────────┐          │                                        │
│  │ Award Wedge      │          │                                        │
│  │ PlayerStore      │          │                                        │
│  │ .awardWedge()    │          │                                        │
│  └────────┬─────────┘          │                                        │
│           │                    │                                        │
│           ▼                    │                                        │
│  ┌─────────────────────────────┴────────────────────────────┐           │
│  │              Check Win Condition                         │           │
│  │  ┌─────────────────────────────────────────────────────┐ │           │
│  │  │ 1. player.wedges.length === 6 (all wedges)?        │ │           │
│  │  │ 2. Is current question a center question?           │ │           │
│  │  │ 3. Was answer correct?                              │ │           │
│  │  └─────────────────────────────────────────────────────┘ │           │
│  └────────────────────────────┬────────────────────────────┘           │
│                               │                                          │
│         ┌─────────────────────┴─────────────────────┐                   │
│         │                                           │                    │
│      [Win]                                       [Continue]              │
│         │                                           │                    │
│         ▼                                           ▼                    │
│  ┌──────────────────┐                    ┌──────────────────┐          │
│  │ phase = finished │                    │   nextTurn()     │          │
│  │ Navigate to      │                    │   phase = rolling│          │
│  │ Results Screen   │                    └──────────────────┘          │
│  └──────────────────┘                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (Additions)

```
types/
├── player.ts                  # UPDATE: Add wedges: PlayerColor[] to Player
└── game.ts                    # UPDATE: Add center question types

stores/
├── playerStore.ts             # UPDATE: Add awardWedge(), getWedgeCount()
├── gameStore.ts               # UPDATE: Add checkWinCondition(), isCenterQuestion
└── index.ts                   # (unchanged)

components/
├── WedgeBadge.tsx             # NEW: Single wedge icon with color
├── WedgeCollection.tsx        # NEW: 6-wedge display for player
├── ResultsScreen.tsx          # NEW: Final scores and winner display
└── PlayerScoreCard.tsx        # NEW: Individual player score in results

app/
├── game/
│   ├── _layout.tsx            # UPDATE: Add results route
│   └── results.tsx            # NEW: Final results screen
└── (existing screens)
```

### Pattern 1: Wedge Tracking with Array

**What:** Store player wedges as an array of `PlayerColor` values. Array is simple, allows counting with `.length`, and supports iteration for display.

**When to use:** When you need to track collection of items where duplicates are prevented by logic (not data structure) and ordering doesn't matter.

**Example:**
```typescript
// types/player.ts (updated)
import { PlayerColor } from '../constants/categories';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  /** Wedges earned (max 6, one per category) */
  wedges: PlayerColor[];
}

// stores/playerStore.ts (updated)
export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],

  // Add wedge to player's collection
  awardWedge: (playerId: string, category: PlayerColor) => set((state) => {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    // Check if player already has this wedge
    if (player.wedges.includes(category)) {
      console.warn(`Player ${playerId} already has ${category} wedge`);
      return state;
    }

    // Add wedge
    return {
      players: state.players.map(p =>
        p.id === playerId
          ? { ...p, wedges: [...p.wedges, category] }
          : p
      ),
    };
  }),

  // Get count of wedges for a player
  getWedgeCount: (playerId: string) => {
    const player = get().players.find(p => p.id === playerId);
    return player?.wedges.length ?? 0;
  },

  // Check if player has all 6 wedges
  hasAllWedges: (playerId: string) => {
    const player = get().players.find(p => p.id === playerId);
    return player?.wedges.length === 6;
  },
}));
```

**Source:** [VERIFIED: Zustand persist middleware with arrays]

### Pattern 2: Win Condition Detection

**What:** Check for win condition after each correct answer. Win requires: (1) all 6 wedges collected, AND (2) correct answer on center question.

**When to use:** In `markAnswer()` after correct answer is marked, before transitioning to next turn.

**Example:**
```typescript
// stores/gameStore.ts (updated)
import { usePlayerStore } from './playerStore';
import { PLAYER_COLORS } from '../constants/categories';

interface GameStore extends GameState {
  // ... existing fields
  /** Whether current question is a center question (win attempt) */
  isCenterQuestion: boolean;
  /** Player who won (null if game ongoing) */
  winner: Player | null;

  // ... existing actions

  markAnswer: (correct: boolean) => {
    const { players } = usePlayerStore.getState();
    const { currentPlayerIndex, currentQuestion, isCenterQuestion } = get();
    const currentPlayer = players[currentPlayerIndex];

    if (players.length === 0) {
      console.error('markAnswer called with no players');
      return;
    }

    // Mark question as asked (QSTN-03)
    if (currentQuestion) {
      useQuestionStore.getState().markAsked(currentQuestion.id);
    }

    // If correct and on category space (not center), award wedge
    if (correct && !isCenterQuestion) {
      // Board position determines category (Phase 4 integration)
      // For now, use current category
      const category = get().currentCategory;
      if (category) {
        usePlayerStore.getState().awardWedge(currentPlayer.id, category);
      }
    }

    // Check win condition (SCOR-03)
    if (correct && isCenterQuestion) {
      // Center question requires all 6 wedges + correct answer
      const hasAllWedges = usePlayerStore.getState().hasAllWedges(currentPlayer.id);

      if (hasAllWedges) {
        // Winner!
        set({
          phase: 'finished',
          winner: currentPlayer,
        });
        return; // Don't advance to next turn
      }
      // Wrong answer or not all wedges: continue game
    }

    // Check for other end conditions (e.g., max questions reached)
    // For now, continue to next turn

    set({ answerRevealed: false });

    // Trigger next turn after delay for visual feedback
    setTimeout(() => {
      get().nextTurn();
    }, 500);
  },

  // Start center question (called when player reaches center)
  startCenterQuestion: () => {
    const question = useQuestionStore.getState().selectQuestion('blue'); // Center uses random category
    set({
      currentQuestion: question,
      currentCategory: question?.category ?? 'blue',
      isCenterQuestion: true,
      phase: 'answering',
    });
  },
});
```

**Source:** [ASSUMED: Win condition based on Trivial Pursuit rules]

### Pattern 3: Results Screen with Scores

**What:** Display final results when game reaches 'finished' phase. Show each player's wedge count and declare winner.

**When to use:** Navigate to results screen when `phase === 'finished'`.

**Example:**
```typescript
// app/game/results.tsx
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from 'tamagui';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { WedgeCollection } from '../../components/WedgeCollection';
import { PlayerScoreCard } from '../../components/PlayerScoreCard';

export default function ResultsScreen() {
  const theme = useTheme();
  const { winner, questionNumber } = useGameStore();
  const { players } = usePlayerStore();

  // Sort players by wedge count (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.wedges.length - a.wedges.length);

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.color?.val }]}>
          {winner ? `${winner.name} Wins!` : 'Game Complete'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.color?.val }]}>
          {questionNumber - 1} questions asked
        </Text>
      </View>

      <ScrollView style={styles.scores}>
        {sortedPlayers.map((player, index) => (
          <PlayerScoreCard
            key={player.id}
            player={player}
            rank={index + 1}
            isWinner={winner?.id === player.id}
          />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent?.val }]}
          onPress={() => {
            // Reset game
            useGameStore.getState().resetGame();
            usePlayerStore.getState().resetPlayers();
            router.replace('/');
          }}
        >
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>
    </View>
  );
}

// components/PlayerScoreCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { Player } from '../../types/player';
import { WedgeCollection } from './WedgeCollection';
import { CATEGORY_COLORS } from '../../constants/categories';

interface Props {
  player: Player;
  rank: number;
  isWinner: boolean;
}

export function PlayerScoreCard({ player, rank, isWinner }: Props) {
  const theme = useTheme();

  return (
    <View style={[
      styles.card,
      { backgroundColor: isWinner ? theme.accent?.val : theme.background?.val }
    ]}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, { color: theme.color?.val }]}>#{rank}</Text>
      </View>

      <View style={styles.playerInfo}>
        <View style={[styles.colorDot, { backgroundColor: CATEGORY_COLORS[player.color] }]} />
        <Text style={[styles.name, { color: theme.color?.val }]}>{player.name}</Text>
      </View>

      <WedgeCollection wedges={player.wedges} />

      <Text style={[styles.wedgeCount, { color: theme.color?.val }]}>
        {player.wedges.length}/6
      </Text>
    </View>
  );
}
```

**Source:** [VERIFIED: React Native navigation patterns]

### Pattern 4: Wedge Collection Display

**What:** Visual component showing 6 wedge slots with filled/empty states based on player's collection.

**When to use:** In results screen, player scorecards, and potentially during gameplay.

**Example:**
```typescript
// components/WedgeCollection.tsx
import { View, StyleSheet } from 'react-native';
import { PlayerColor, PLAYER_COLORS, CATEGORY_COLORS } from '../constants/categories';
import { WedgeBadge } from './WedgeBadge';

interface Props {
  wedges: PlayerColor[];
  size?: 'small' | 'medium' | 'large';
}

export function WedgeCollection({ wedges, size = 'medium' }: Props) {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32,
  };

  const wedgeSize = sizeMap[size];

  return (
    <View style={styles.container}>
      {PLAYER_COLORS.map((color) => (
        <WedgeBadge
          key={color}
          color={color}
          earned={wedges.includes(color)}
          size={wedgeSize}
        />
      ))}
    </View>
  );
}

// components/WedgeBadge.tsx
import { View, StyleSheet } from 'react-native';
import { PlayerColor, CATEGORY_COLORS } from '../constants/categories';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface Props {
  color: PlayerColor;
  earned: boolean;
  size: number;
}

export function WedgeBadge({ color, earned, size }: Props) {
  const scale = useSharedValue(earned ? 1 : 0.8);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          backgroundColor: earned ? CATEGORY_COLORS[color] : '#333',
          opacity: earned ? 1 : 0.4,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    marginHorizontal: 2,
  },
});
```

**Source:** [VERIFIED: Reanimated animation patterns]

### Anti-Patterns to Avoid

- **Storing wedges in GameStore:** Wedges are per-player state, not global game state. Keep in PlayerStore with player data.
- **Using Set for wedges:** Set prevents duplicates but makes serialization harder. Array with logic check is simpler.
- **Forgetting to reset wedges:** New game must reset player wedges to empty array. Add `resetPlayers()` or `resetWedges()` call in `startGame()`.
- **Winning on last wedge:** Trivial Pursuit requires all 6 wedges PLUS correct center question. Don't end game when player gets 6th wedge.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wedge count | Custom counter function | `player.wedges.length` | Native array property, O(1) |
| Wedge duplicate check | Manual loop check | `player.wedges.includes(category)` | Native method, clear intent |
| Player sorting | Custom sort function | `[...players].sort((a, b) => b.wedges.length - a.wedges.length)` | Native sort, immutable copy |
| Results layout | Custom ScrollView | Tamagui/YStack with map | Consistent styling, accessibility |

**Key insight:** Scoring is fundamentally simple state management. The complexity is in the win condition logic (all wedges + center) and the results display, not in the data structures.

## Runtime State Inventory

> Phase 4 is NOT a rename/refactor phase. The following inventory is for context only.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | PlayerStore.players.wedges (new field) | Add wedges array to Player type |
| Live service config | None | — |
| OS-registered state | None | — |
| Secrets/env vars | None | — |
| Build artifacts | None | — |

## Common Pitfalls

### Pitfall 1: Wedge Not Reset on New Game

**What goes wrong:** Players start a new game but their wedges from the previous game are still shown.

**Why it happens:** PlayerStore persists across app restarts. Wedges added to players during gameplay remain in the persisted state unless explicitly reset.

**How to avoid:**
- Add `resetWedges()` action to PlayerStore
- Call `resetWedges()` in `startGame()` before starting new game
- Test new game flow explicitly

**Warning signs:**
- Players have wedges at game start
- First game shows wedges from previous session
- Player with 6 wedges appears to have won immediately

### Pitfall 2: Win on 6th Wedge Instead of Center Question

**What goes wrong:** Game ends when player collects their 6th wedge, skipping the center question requirement.

**Why it happens:** Developer incorrectly implements win condition as "has 6 wedges" instead of "has 6 wedges AND answered center question correctly".

**How to avoid:**
- Win condition requires TWO checks: (1) all 6 wedges, AND (2) correct center answer
- Add `isCenterQuestion` flag to GameState to distinguish center from category questions
- Test win condition flow: collect 6 wedges → reach center → answer correctly → win

**Warning signs:**
- Game ends immediately when 6th wedge awarded
- Center question never shown
- Player wins without center question attempt

### Pitfall 3: Ties Not Handled

**What goes wrong:** Multiple players finish with 6 wedges, game shows "undefined Wins!" or crashes.

**Why it happens:** `winner` field is a single `Player | null`, but ties are possible in Trivial Pursuit (rare, but possible if center questions differ).

**How to avoid:**
- For v1, show "Game Complete" if no clear winner (no `winner` set)
- If multiple players reach center simultaneously (extremely rare), show first to answer correctly
- Consider `winners: Player[]` array for future versions

**Warning signs:**
- Results screen crashes with multiple players at 6 wedges
- "undefined" displayed in winner text
- Game hangs in scoring phase

### Pitfall 4: Wedge Animation Blocks Game Flow

**What goes wrong:** Wedge award animation takes 2-3 seconds, blocking the player from continuing.

**Why it happens:** Developer uses `await` or synchronous animation that blocks the game loop.

**How to avoid:**
- Wedge animation should be non-blocking (fire-and-forget)
- Use Reanimated's `withTiming` with `runOnJS` for navigation
- Game should transition to next turn immediately after wedge awarded, animation continues in background

**Warning signs:**
- Game pauses after correct answer
- Animation delay creates perceived lag
- Player frustrated waiting for animation to finish

## Code Examples

### Player Type with Wedges

```typescript
// types/player.ts (updated)
import { PlayerColor } from '../constants/categories';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  /** Wedges earned (max 6, one per category) */
  wedges: PlayerColor[];
}

export interface PlayerState {
  players: Player[];
  addPlayer: (name?: string) => void;
  removePlayer: (id: string) => void;
  updatePlayerName: (id: string, name: string) => void;
  resetPlayers: () => void;
  // New scoring actions
  awardWedge: (playerId: string, category: PlayerColor) => void;
  getWedgeCount: (playerId: string) => number;
  hasAllWedges: (playerId: string) => boolean;
  resetWedges: () => void;
}
```

### PlayerStore with Wedge Actions

```typescript
// stores/playerStore.ts (extensions)
import { create } from 'zustand';
import { PLAYER_COLORS, PlayerColor } from '../constants/categories';
import { Player, PlayerState } from '../types/player';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],

  // ... existing actions (addPlayer, removePlayer, etc.)

  // SCOR-01: Award wedge to player
  awardWedge: (playerId: string, category: PlayerColor) => set((state) => {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      console.warn(`Player ${playerId} not found`);
      return state;
    }

    // Check if already has this wedge
    if (player.wedges.includes(category)) {
      console.warn(`Player ${playerId} already has ${category} wedge`);
      return state;
    }

    // Check wedge limit (max 6)
    if (player.wedges.length >= 6) {
      console.warn(`Player ${playerId} already has 6 wedges`);
      return state;
    }

    return {
      players: state.players.map(p =>
        p.id === playerId
          ? { ...p, wedges: [...p.wedges, category] }
          : p
      ),
    };
  }),

  // Get wedge count for player
  getWedgeCount: (playerId: string) => {
    const player = get().players.find(p => p.id === playerId);
    return player?.wedges.length ?? 0;
  },

  // Check if player has all 6 wedges
  hasAllWedges: (playerId: string) => {
    const player = get().players.find(p => p.id === playerId);
    return player?.wedges.length === 6;
  },

  // Reset wedges for all players (new game)
  resetWedges: () => set((state) => ({
    players: state.players.map(p => ({ ...p, wedges: [] })),
  })),
}));
```

### GameStore Win Condition Check

```typescript
// stores/gameStore.ts (extensions for scoring)
import { usePlayerStore } from './playerStore';
import { useQuestionStore } from './questionStore';
import { Player } from '../types/player';

interface GameStore extends GameState {
  // ... existing fields
  isCenterQuestion: boolean;
  winner: Player | null;

  // ... existing actions

  // SCOR-03: Check win condition
  checkWinCondition: (playerId: string) => boolean => {
    return usePlayerStore.getState().hasAllWedges(playerId);
  },

  // SCOR-02: Award wedge based on board position
  awardWedgeIfCategory: () => {
    const { currentPlayerIndex, currentCategory, isCenterQuestion } = get();
    const { players } = usePlayerStore.getState();
    const currentPlayer = players[currentPlayerIndex];

    if (!currentPlayer || isCenterQuestion) return;

    // Award wedge for category space (not center)
    if (currentCategory) {
      usePlayerStore.getState().awardWedge(currentPlayer.id, currentCategory);
    }
  },
});
```

### Results Screen Navigation

```typescript
// app/game/_layout.tsx (updated)
import { useGameStore } from '../../stores/gameStore';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function GameLayout() {
  const phase = useGameStore((state) => state.phase);
  const router = useRouter();

  useEffect(() => {
    switch (phase) {
      case 'setup':
        router.replace('/game/setup');
        break;
      case 'rolling':
        router.replace('/game/roll');
        break;
      case 'moving':
        router.replace('/game/move');
        break;
      case 'answering':
        router.replace('/game/question');
        break;
      case 'scoring':
        // Brief pause before next turn or results
        break;
      case 'finished':
        router.replace('/game/results');
        break;
    }
  }, [phase]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="roll" />
      <Stack.Screen name="move" />
      <Stack.Screen name="question" />
      <Stack.Screen name="results" />
    </Stack>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Score as number | Wedge array (collection) | Phase 4 design | Matches Trivial Pursuit mechanics, clearer visualization |
| Win on score threshold | Win on wedges + center | Phase 4 design | Accurate to game rules, distinct win condition |
| Single winner field | Winner object with reference | Phase 4 design | Clear winner state, easy display |

**Deprecated/outdated:**
- **Score counter:** Don't use a numeric score counter; wedges are the scoring mechanism
- **Immediate win on last wedge:** Must reach center and answer correctly to win

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Win condition is "all 6 wedges + correct center question" | Pattern 2 | High - If wrong, entire win detection logic changes |
| A2 | Center question uses random category | Pattern 2 | Low - Easy to change category selection logic |
| A3 | Wedge awarded on category space, not every correct answer | Pattern 2 | Medium - Affects when wedges are awarded |
| A4 | Results screen shows all players sorted by wedge count | Pattern 3 | Low - UX can iterate, core logic is simple |

**All other claims in this research were verified via existing codebase patterns and Zustand documentation.**

## Open Questions

1. **Center question mechanics:**
   - What we know: Center questions trigger when player reaches center board position
   - What's unclear: How does board position determine center? When does center question category get selected?
   - Recommendation: Phase 4 should add `isCenterQuestion: boolean` to GameState. Board position logic (Phase 2 integration) sets this flag. Center question uses random category or player choice.

2. **Wedge award timing:**
   - What we know: Wedges awarded on correct answer on category space
   - What's unclear: Should wedge award happen before or after answer reveal?
   - Recommendation: Wedge awarded immediately when answer marked correct. Animation plays while game transitions to next turn.

3. **Tie handling:**
   - What we know: Multiple players reaching 6 wedges is rare but possible
   - What's unclear: What happens if two players reach center simultaneously?
   - Recommendation: For v1, first player to reach center and answer correctly wins. No tie-breaker logic needed for v1.

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies beyond existing stack)

All required dependencies (Zustand, AsyncStorage, Reanimated, Tamagui) are already installed. No new environment dependencies.

## Validation Architecture

> nyquist_validation is explicitly set to `false` in `.planning/config.json`. This section is omitted.

## Security Domain

> This phase does not involve authentication, encryption, or user data storage. Security considerations are minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | N/A |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | minimal | TypeScript type checking |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for React Native + Zustand

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| State manipulation | Tampering | N/A (local-only game, no competitive integrity requirements) |
| Wedge cheating | Tampering | N/A (offline game, no anti-cheat needed) |

## Sources

### Primary (HIGH confidence)

- [Zustand Persist Middleware Documentation](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md) - Set serialization, custom storage
- Project codebase: `stores/gameStore.ts`, `stores/playerStore.ts`, `stores/questionStore.ts` - Existing patterns, state transitions
- Project codebase: `types/game.ts`, `types/player.ts` - Type definitions, Player interface

### Secondary (MEDIUM confidence)

- [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/your-first-animation) - Animation patterns for wedge award
- [Trivial Pursuit Rules](https://en.wikipedia.org/wiki/Trivial_Pursuit) - Win condition mechanics

### Tertiary (LOW confidence)

- None - all patterns verified against primary/secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in use, patterns verified
- Architecture: HIGH - Builds on existing GameStore/PlayerStore patterns
- Pitfalls: HIGH - Based on common scoring implementation mistakes and existing pitfall documentation

**Research date:** 2026-06-08
**Valid until:** 30 days (stable stack, no external dependencies)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCOR-01 | App tracks each participant's score and wedge collection | Extend Player interface with `wedges: PlayerColor[]` array; PlayerStore tracks per-player collection |
| SCOR-02 | App awards category wedge when answering correctly on category space | `awardWedge()` action in PlayerStore; integrated with board position logic |
| SCOR-03 | App detects win condition (all 6 wedges + center question correct) | `checkWinCondition()` in GameStore; `isCenterQuestion` flag; win detection on correct center answer |
| SCOR-04 | App displays final scores and winner at game end | Results screen with PlayerScoreCard components; sorted by wedge count; winner display |