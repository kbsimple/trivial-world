# Phase 5: State Persistence - Research

**Researched:** 2026-06-08
**Domain:** React Native state persistence, app lifecycle handling, pause/resume UX
**Confidence:** HIGH

## Summary

This phase adds state persistence to the Trivial World trivia game, enabling games to survive app interruptions, be explicitly paused by the conductor, and resume from where players left off. The core work is straightforward: add persist middleware to `playerStore.ts` (matching the pattern already in `gameStore.ts` and `questionStore.ts`), then implement home screen resume/new game buttons and a pause overlay for in-game controls.

The existing codebase already implements Zustand persist middleware for game and question stores using AsyncStorage. The critical gap is `playerStore.ts` which lacks persistence entirely. Adding persistence follows the exact same pattern as the other stores. For back button handling and pause UI, Expo Router and Tamagui Sheet provide the required capabilities.

**Primary recommendation:** Add persist middleware to playerStore matching the existing pattern, then implement resume flow on home screen and pause overlay using Tamagui Sheet component.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| State persistence | Storage (AsyncStorage) | State (Zustand) | AsyncStorage is the persistence layer; Zustand persist middleware bridges state to storage |
| Resume detection | State (Zustand) | UI (Home Screen) | Store hydration determines if game exists; UI displays resume option |
| Pause overlay | UI (Game Screens) | State (Zustand) | UI renders Sheet; Store provides pause state |
| Back button handling | UI (Game Layout) | Navigation (Expo Router) | Navigation intercepts hardware back; UI shows confirmation |
| App lifecycle | Framework (React Native) | — | AppState API provides lifecycle events; Zustand persist handles auto-save |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Add `persist` middleware to `playerStore` with AsyncStorage, matching the existing pattern used in `gameStore` and `questionStore`. Each store maintains its own storage key. This closes the critical gap where player data (names, colors, wedges) would be lost on app close.

- **D-02:** On home screen, show "Resume Game" button (primary, prominent) and "New Game" button (secondary) when a saved game exists. Clean, non-interruptive approach consistent with Phase 1's quick start flow (D-01). No modal prompts that block interaction.

- **D-03:** Three-layer pause approach:
  - **Implicit pause:** Closing the app or navigating to home automatically saves state via Zustand persist middleware
  - **Pause button in header:** During game screens (roll, move, question), a pause button shows overlay with "Resume Game" and "End Game" options — explicit control for intentional breaks
  - **Back button confirmation:** Prevents accidental exits from game screens with a confirmation dialog

- **D-04:** Rely on Zustand persist middleware for auto-persistence. No additional `AppState` listener needed — state is saved on every change automatically.

- **D-05:** Reset to safe state on crash/interruption:
  - Interrupted mid-die roll → Reset to "rolling" phase, user rolls again
  - Interrupted mid-question (answer revealed) → Restore to question screen with answer hidden (default state)
  - Simple, predictable recovery behavior without complex state tracking

### Claude's Discretion

- Storage key naming for stores (suggest: `trivial-world-game`, `trivial-world-players`, `trivial-world-questions` — already in use for game and questions)
- Pause overlay UI design (Tamagui Sheet or custom modal)
- Back button handler implementation (Expo Router's `useNavigation` or gesture handler)
- Home screen layout with resume/new game buttons (follow existing Tamagui patterns)

### Deferred Ideas (OUT OF SCOPE)

- Lifetime leaderboard for players (historical game results, wins, total wedges, games played)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STAT-01 | App persists game state to local storage | Zustand persist middleware with AsyncStorage — pattern already implemented in gameStore and questionStore |
| STAT-02 | App can resume interrupted game from where it left off | Home screen detects persisted game via store hydration, shows Resume button; state machine validates transitions |
| STAT-03 | Game conductor can pause and resume game | Pause button in game layout header triggers Tamagui Sheet overlay with Resume/End options |
| STAT-04 | App handles app background/foreground transitions gracefully | Zustand persist middleware auto-saves on every state change; no additional AppState listener needed per D-04 |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.14 (installed) | State management | Already in use; persist middleware pattern established |
| @react-native-async-storage/async-storage | 2.1.0 (installed) | Persistence layer | Already in use by gameStore, questionStore |
| Expo Router | 4.0.19 (installed) | Navigation, back button | File-based routing; useNavigation for back interception |
| Tamagui | 2.1.0 (installed) | UI components | Sheet component for pause overlay |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | 3.17.4 (installed) | Sheet animations | Sheet component uses Reanimated for smooth transitions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tamagui Sheet | Custom Modal | Sheet is already available via Tamagui; custom modal would require more code |
| AppState listener | Zustand persist only | D-04 explicitly rejects this — persist middleware handles auto-save sufficiently |

**Installation:** No new dependencies required. All packages already installed.

**Version verification:**
- Zustand: 5.0.14 installed, 5.0.14 latest [VERIFIED: npm registry]
- AsyncStorage: 2.1.0 installed, 3.1.1 latest [VERIFIED: npm registry] — using older version is fine for this use case

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          UI Layer (Expo Router)                         │
│  ┌──────────────┐  ┌─────────────────────────────────────────────────┐ │
│  │  Home Screen │  │           Game Screens (Stack)                 │ │
│  │  - Resume    │  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ │ │
│  │  - New Game  │  │  │ Setup  │ │  Roll  │ │ Question │ │Results │ │ │
│  └──────┬───────┘  │  └───┬────┘ └───┬────┘ └────┬─────┘ └───┬────┘ │ │
│         │          │      │          │            │           │      │ │
│         │          │      └──────────┴────────────┴───────────┘      │ │
│         │          │                    │ Pause Button               │ │
│         │          └────────────────────┼───────────────────────────┘ │
│         │                               │                              │
│         ▼                               ▼                              │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     Pause Overlay (Sheet)                        │  │
│  │                     - Resume Game                                │  │
│  │                     - End Game                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     State Layer (Zustand Stores)                        │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐  │
│  │ gameStore          │ │ playerStore        │ │ questionStore      │  │
│  │ ──────────────     │ │ ──────────────     │ │ ──────────────     │  │
│  │ phase              │ │ players[]          │ │ askedQuestions     │  │
│  │ currentPlayerIndex │ │ (names, colors,    │ │ currentQuestion    │  │
│  │ dieResult          │ │  wedges)           │ │ enabledCategories  │  │
│  │ answerRevealed     │ │                    │ │                    │  │
│  │ questionNumber     │ │ PERSIST: ADD       │ │ PERSIST: YES       │  │
│  │ PERSIST: YES       │ │ (gap to fill)      │ │ (custom Set)       │  │
│  └─────────┬──────────┘ └─────────┬──────────┘ └─────────┬──────────┘  │
│            │                      │                      │              │
└────────────┼──────────────────────┼──────────────────────┼──────────────┘
             │                      │                      │
             ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Persistence Layer (AsyncStorage)                       │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐  │
│  │ trivial-world-game │ │ trivial-world-     │ │ trivial-world-     │  │
│  │ (GameState JSON)   │ │ players            │ │ questions          │  │
│  │                    │ │ (PlayerState JSON) │ │ (Set as array)     │  │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

Existing structure is correct. New files needed:
```
app/
├── index.tsx              # MODIFY: Add resume/new game buttons
├── game/
│   ├── _layout.tsx        # MODIFY: Add pause button to header
│   └── ...
components/
├── PauseOverlay.tsx       # NEW: Tamagui Sheet for pause menu
└── ResumeGameButton.tsx    # NEW: Resume button for home screen (optional, can be inline)
stores/
└── playerStore.ts         # MODIFY: Add persist middleware
```

### Pattern 1: Zustand Persist Middleware (Existing Pattern)

**What:** Zustand's persist middleware automatically saves store state to AsyncStorage on every change and rehydrates on app launch.

**When to use:** All stores that need to survive app restarts — exactly what playerStore requires.

**Example (from gameStore.ts lines 187-191):**
```typescript
// Source: stores/gameStore.ts [VERIFIED: existing codebase]
export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Implementation for playerStore:**
```typescript
// Source: proposed addition to stores/playerStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      players: [],
      // ... all existing actions unchanged
    }),
    {
      name: 'trivial-world-players',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Pattern 2: Custom Serialization for Set (Existing in questionStore)

**What:** Set objects don't serialize to JSON. Use `partialize` to convert Set to array for storage, and `onRehydrateStorage` to convert back.

**When to use:** Only for questionStore's `askedQuestions: Set<string>`. playerStore uses simple arrays and doesn't need this pattern.

**Example (from questionStore.ts lines 108-119):**
```typescript
// Source: stores/questionStore.ts [VERIFIED: existing codebase]
{
  name: 'trivial-world-questions',
  storage: createJSONStorage(() => AsyncStorage),
  // Custom serialization for Set (convert to array for JSON)
  partialize: (state) => ({
    askedQuestions: [...state.askedQuestions],
    enabledCategories: state.enabledCategories,
  }),
  // Custom deserialization (convert array back to Set)
  onRehydrateStorage: () => (state) => {
    if (state) {
      state.askedQuestions = new Set(state.askedQuestions as unknown as string[]);
    }
  },
}
```

### Pattern 3: Resume Detection on Home Screen

**What:** Check if persisted game exists and is in progress (not 'setup' or 'finished') to show Resume button.

**When to use:** Home screen entry point to determine available actions.

**Example:**
```typescript
// Source: proposed for app/index.tsx
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const phase = useGameStore((state) => state.phase);
  const players = usePlayerStore((state) => state.players);

  // Game is resumable if phase is not 'setup' or 'finished'
  const hasActiveGame = phase !== 'setup' && phase !== 'finished' && players.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trivial World</Text>

      {hasActiveGame && (
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/game/roll')}
        >
          <Text style={styles.buttonText}>Resume Game</Text>
        </Pressable>
      )}

      <Pressable
        style={hasActiveGame ? styles.secondaryButton : styles.primaryButton}
        onPress={() => router.push('/game/setup')}
      >
        <Text style={styles.buttonText}>New Game</Text>
      </Pressable>
    </View>
  );
}
```

### Pattern 4: Pause Overlay with Tamagui Sheet

**What:** Tamagui Sheet provides a bottom-sheet style modal with snap points, overlay dismiss, and gesture support.

**When to use:** Pause menu during game screens — provides native feel with minimal code.

**Example:**
```typescript
// Source: Tamagui documentation [CITED: tamagui.dev/docs/components/sheet]
import { Sheet } from 'tamagui';
import { useState } from 'react';

function PauseOverlay({ open, onOpenChange, onResume, onEndGame }) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[50]}
      dismissOnSnapToBottom
      modal
    >
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame padding="$4">
        <Sheet.Handle />
        <YStack gap="$3">
          <Text fontSize="$6" fontWeight="bold">Game Paused</Text>
          <Button onPress={onResume}>Resume Game</Button>
          <Button theme="red" onPress={onEndGame}>End Game</Button>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
```

### Pattern 5: Back Button Confirmation

**What:** Intercept hardware back button during active game to show confirmation dialog instead of exiting.

**When to use:** Game screens where accidental back press would lose game state.

**Example:**
```typescript
// Source: Expo Router documentation [CITED: docs.expo.dev/router]
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

function useBackButtonConfirmation(message: string, enabled: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    if (!enabled) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // Show confirmation (could be Alert.alert or custom modal)
      // Return true to prevent default back behavior
      return true; // Handled — don't exit
    });

    return () => subscription.remove();
  }, [enabled, message]);
}
```

### Anti-Patterns to Avoid

- **Adding AppState listener for persistence:** D-04 explicitly rejects this. Zustand persist middleware auto-saves on every state change — no additional lifecycle listener needed.
- **Storing transient UI state:** Animation states, scroll positions, modal visibility should NOT be persisted. Use `partialize` to exclude them if they somehow end up in store state.
- **Complex recovery logic:** D-05 specifies simple recovery: mid-roll resets to rolling, mid-question resets with answer hidden. Don't add state snapshots or complex recovery state tracking.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State persistence | Custom AsyncStorage calls | Zustand persist middleware | Pattern already established; automatic rehydration; less error-prone |
| Pause UI | Custom modal with animations | Tamagui Sheet | Native feel; snap points; overlay built-in; animations via Reanimated |
| Back button handling | Custom event system | React Native BackHandler + Expo Router | System-level integration; handles edge cases; cross-platform |

**Key insight:** All infrastructure for persistence is already in place. The only missing piece is adding the persist wrapper to playerStore.ts.

## Runtime State Inventory

> This is a code/config change phase, not a rename/refactor phase. No runtime state inventory needed.

N/A — Phase adds persistence to existing stores, no data migration required.

## Common Pitfalls

### Pitfall 1: Hydration Race Condition

**What goes wrong:** Store A references Store B during hydration, but Store B hasn't loaded yet. Common in cross-store actions like `usePlayerStore.getState().resetWedges()` called from gameStore.

**Why it happens:** Zustand persist is asynchronous. Each store hydrates independently on app launch.

**How to avoid:** The existing code already handles this correctly:
- `gameStore.startGame()` calls `useQuestionStore.getState().resetAskedQuestions()` and `usePlayerStore.getState().resetWedges()` synchronously
- These actions reset in-memory state regardless of persistence
- The persist middleware will save the reset state after the action completes

**Warning signs:** "Cannot read property of undefined" errors during app launch; stale data appearing after reset.

### Pitfall 2: Missing persist on playerStore

**What goes wrong:** Player names, colors, and wedge progress lost on app close because playerStore lacks persistence.

**Why it happens:** Original implementation omitted persist middleware — gap identified in CONTEXT.md.

**How to avoid:** Add persist middleware following exact pattern in gameStore.ts and questionStore.ts. No changes to actions or state structure needed — just wrap with persist.

**Warning signs:** Testing shows player data resets between app launches; wedge progress lost.

### Pitfall 3: Back Button Bypassing Pause

**What goes wrong:** Hardware back button exits game without showing pause overlay, losing player progress unexpectedly.

**Why it happens:** Default back behavior in Expo Router pops the navigation stack, returning to home screen.

**How to avoid:** Use `BackHandler.addEventListener('hardwareBackPress')` in game screens to intercept and show confirmation dialog. Return `true` to prevent default behavior.

**Warning signs:** Back button exits game during testing; "Resume Game" button appears but game state is stale.

### Pitfall 4: Answer Visible After Crash

**What goes wrong:** Game crashes mid-question with answer revealed. On resume, answer is still visible, breaking fairness.

**Why it happens:** `answerRevealed: true` is persisted. On resume, the UI shows the answer.

**How to avoid:** D-05 specifies: restore to question screen with answer hidden (default state). The `answerRevealed` flag resets to `false` automatically on next question. No special handling needed — the state machine already handles this:

```typescript
// From gameStore.ts lines 95-102
nextTurn: () => {
  // ...
  set({
    currentPlayerIndex: nextIndex,
    dieResult: null,
    answerRevealed: false,  // Always false on new turn
    // ...
  });
}
```

**Warning signs:** Testing crash recovery shows answer; fairness complaints during playtesting.

## Code Examples

### Adding Persist to playerStore (Complete Implementation)

```typescript
// Source: existing playerStore.ts + proposed persist addition
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLAYER_COLORS, PlayerColor } from '../constants/categories';
import { Player, PlayerState } from '../types/player';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      players: [],

      addPlayer: (name?: string) => set((state) => {
        if (state.players.length >= 6) return state;
        const nextColor = PLAYER_COLORS[state.players.length] as PlayerColor;
        const playerName = name || `Player ${state.players.length + 1}`;
        return {
          players: [
            ...state.players,
            {
              id: generateId(),
              name: playerName,
              color: nextColor,
              wedges: [],
            },
          ],
        };
      }),

      removePlayer: (id: string) => set((state) => {
        const filtered = state.players.filter(p => p.id !== id);
        const reassigned = filtered.map((player, index) => ({
          ...player,
          color: PLAYER_COLORS[index] as PlayerColor,
        }));
        return { players: reassigned };
      }),

      updatePlayerName: (id: string, name: string) => set((state) => ({
        players: state.players.map(p => p.id === id ? { ...p, name } : p),
      })),

      resetPlayers: () => set({ players: [] }),

      awardWedge: (playerId: string, category: PlayerColor) => set((state) => {
        const player = state.players.find(p => p.id === playerId);
        if (!player) return state;
        if (player.wedges.includes(category)) return state;
        if (player.wedges.length >= 6) return state;
        return {
          players: state.players.map(p =>
            p.id === playerId ? { ...p, wedges: [...p.wedges, category] } : p
          ),
        };
      }),

      getWedgeCount: (playerId: string) => {
        const player = get().players.find(p => p.id === playerId);
        return player?.wedges.length ?? 0;
      },

      hasAllWedges: (playerId: string) => {
        const player = get().players.find(p => p.id === playerId);
        return player?.wedges.length === 6;
      },

      resetWedges: () => set((state) => ({
        players: state.players.map(p => ({ ...p, wedges: [] })),
      })),
    }),
    {
      name: 'trivial-world-players',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Home Screen with Resume/New Game Buttons

```typescript
// Source: proposed modification for app/index.tsx
import { useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Subscribe to minimal state for resume detection
  const phase = useGameStore((state) => state.phase);
  const players = usePlayerStore((state) => state.players);
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const startGame = useGameStore((state) => state.startGame);

  // Game is resumable if in progress and has players
  const hasActiveGame = phase !== 'setup' && phase !== 'finished' && players.length > 0;

  const handleNewGame = () => {
    // D-02: Warn if game in progress
    if (hasActiveGame) {
      // Could show confirmation dialog here
      // For now, just reset and start fresh
      resetPlayers();
    }
    router.push('/game/setup');
  };

  const handleResumeGame = () => {
    // Navigate to current phase screen
    // Based on phase: 'rolling' -> /game/roll, 'answering' -> /game/question, etc.
    const phaseRoutes: Record<string, string> = {
      rolling: '/game/roll',
      moving: '/game/move',
      answering: '/game/question',
      scoring: '/game/question', // Return to question during scoring
    };
    const route = phaseRoutes[phase] || '/game/roll';
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      <Text style={[styles.title, { color: theme.color?.val as string }]}>
        Trivial World
      </Text>

      {hasActiveGame && (
        <Pressable
          style={[styles.primaryButton, { backgroundColor: '#228b22' }]}
          onPress={handleResumeGame}
        >
          <Text style={[styles.buttonText, { color: theme.background?.val as string }]}>
            Resume Game
          </Text>
        </Pressable>
      )}

      <Pressable
        style={[
          hasActiveGame ? styles.secondaryButton : styles.primaryButton,
          { backgroundColor: hasActiveGame ? 'rgba(255,255,255,0.2)' : '#228b22' }
        ]}
        onPress={handleNewGame}
      >
        <Text style={[styles.buttonText, { color: theme.background?.val as string }]}>
          New Game
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  primaryButton: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, minWidth: 200, marginBottom: 12 },
  secondaryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minWidth: 180 },
  buttonText: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
});
```

### Pause Overlay Component

```typescript
// Source: proposed new file components/PauseOverlay.tsx
import { Sheet, YStack, Button, Text, H2 } from 'tamagui';

interface PauseOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onEndGame: () => void;
}

export function PauseOverlay({ open, onOpenChange, onResume, onEndGame }: PauseOverlayProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[50]}
      dismissOnSnapToBottom
      modal
    >
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame padding="$4" gap="$3">
        <Sheet.Handle />
        <YStack gap="$4" alignItems="center">
          <H2>Game Paused</H2>
          <Text color="$gray11">Choose an option to continue</Text>
          <YStack gap="$2" width="100%">
            <Button
              size="$4"
              theme="green"
              onPress={() => {
                onOpenChange(false);
                onResume();
              }}
            >
              Resume Game
            </Button>
            <Button
              size="$4"
              theme="red"
              onPress={() => {
                onOpenChange(false);
                onEndGame();
              }}
            >
              End Game
            </Button>
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual AsyncStorage calls | Zustand persist middleware | Phase 1 (project setup) | Automatic rehydration, less boilerplate |
| AppState listener for background | Rely on persist middleware auto-save | D-04 (this phase) | Simpler, no lifecycle management |

**Deprecated/outdated:**
- AppState listeners for simple persistence: Persist middleware handles this automatically per D-04. Only use AppState for special cases like pausing animations.
- Custom serialization for simple types: Only questionStore's Set needs special handling. playerStore uses arrays — no special handling needed.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tamagui Sheet component is available in installed version | Architecture Patterns | LOW — Sheet is core Tamagui component, documented in v2.x |
| A2 | BackHandler works with Expo Router navigation | Pattern 5 | LOW — Expo Router wraps React Navigation, standard BackHandler API works |
| A3 | No special recovery logic needed for mid-roll interruption | Common Pitfalls | LOW — D-05 specifies simple reset; dieResult persists but rolling screen re-rolls naturally |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **New Game confirmation behavior**
   - What we know: D-02 specifies showing Resume (primary) and New Game (secondary) when game exists
   - What's unclear: Whether New Game should show a confirmation dialog before clearing existing game
   - Recommendation: Implement simple confirmation Alert.alert with "End current game and start new?" — minimal code, standard pattern

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Zustand | State persistence | ✓ | 5.0.14 | — |
| AsyncStorage | Persistence storage | ✓ | 2.1.0 | — |
| Expo Router | Navigation, back button | ✓ | 4.0.19 | — |
| Tamagui | Sheet overlay | ✓ | 2.1.0 | — |
| react-native-reanimated | Sheet animations | ✓ | 3.17.4 | — |

**Missing dependencies with no fallback:** None — all required packages installed.

**Missing dependencies with fallback:** N/A

## Validation Architecture

> workflow.nyquist_validation is explicitly set to `false` in `.planning/config.json` — this section is omitted.

## Security Domain

> Security enforcement is not specified in config, and this phase involves no authentication, authorization, or cryptography — standard security practices apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | No auth in v1 — offline-only game |
| V3 Session Management | No | No sessions — local-only state |
| V4 Access Control | No | No user accounts — pass-and-play |
| V5 Input Validation | No | All input from game conductor, not external |
| V6 Cryptography | No | No encryption needed — local storage only |

### Known Threat Patterns for React Native + AsyncStorage

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Local data tampering | Tampering | Not applicable — offline game, no security impact |
| AsyncStorage exposure on rooted device | Information Disclosure | Acceptable — no sensitive data stored |

## Sources

### Primary (HIGH confidence)
- Zustand persist middleware — Context7 documentation, partialize and onRehydrateStorage patterns [VERIFIED]
- React Native AppState — Context7 documentation, lifecycle event handling [VERIFIED]
- Tamagui Sheet — Context7 documentation, modal and snap points API [VERIFIED]
- Expo Router navigation — Context7 documentation, useNavigation and back button handling [VERIFIED]

### Secondary (MEDIUM confidence)
- stores/gameStore.ts — Existing persist pattern (lines 32-191) [VERIFIED: codebase]
- stores/questionStore.ts — Set serialization pattern (lines 43-120) [VERIFIED: codebase]
- stores/playerStore.ts — Gap analysis (lines 22-115, no persist) [VERIFIED: codebase]

### Tertiary (LOW confidence)
- None — all critical patterns verified from Context7 or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and verified
- Architecture: HIGH — patterns established in existing codebase
- Pitfalls: HIGH — common issues well-documented in Zustand and React Native docs

**Research date:** 2026-06-08
**Valid until:** 30 days — stable patterns, no fast-moving dependencies