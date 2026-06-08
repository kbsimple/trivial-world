# Phase 2: Game Loop & Turn Management - Research

**Researched:** 2026-06-08
**Domain:** Turn-based game state management, die roll animation, navigation flow
**Confidence:** HIGH

## Summary

Phase 2 implements the core game loop: die roll simulation with visual animation, move selection based on die result, and automatic turn cycling through participants. This phase builds on the foundation established in Phase 1 (game setup, participant management, question display) and introduces the first interactive gameplay mechanics.

The primary technical challenges are: (1) creating a performant, satisfying die roll animation using react-native-reanimated with gesture handling, (2) implementing the state machine transitions from `rolling` to `moving` to `answering` phases, and (3) managing turn cycling while maintaining game state persistence.

**Primary recommendation:** Use react-native-reanimated shared values with `withSequence` and `withSpring` for the die roll animation. Implement turn cycling through the existing GameStore state machine with `currentPlayerIndex` cycling. Navigate between screens using Expo Router's `router.push()` with phase-based conditional navigation.

## User Constraints

### Locked Decisions (from Phase 1 CONTEXT.md)

- **D-15:** Conductor mode implicit — person holding phone is always conductor
- **D-16:** After marking correct/incorrect — automatically advance to next turn (Phase 2 implements)
- **D-17:** Current player indicator — small name/avatar at top of screen

### Claude's Discretion

- Typography scale and spacing — follow Tamagui design system defaults
- Exact button placement — conductor experience research shows large bottom-aligned action buttons work best
- Animation timing — standard 300ms for screen transitions
- Error handling — graceful defaults

### Deferred Ideas (OUT OF SCOPE)

None from Phase 1.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOOP-01 | App simulates a die roll with visual animation | Reanimated 3.x with gesture handling, `withSequence` + `withSpring` for roll animation, expo-haptics for tactile feedback |
| LOOP-02 | App displays valid move choices based on die roll result | GameStore state machine tracks die result, board positions deferred to Phase 3 |
| LOOP-03 | Game conductor can select which participant's turn it is | Already implemented: `currentPlayerIndex` in GameStore, `players` array in PlayerStore |
| LOOP-04 | App tracks whose turn it is and advances turn after each question | Turn cycling logic: `nextPlayerIndex = (currentPlayerIndex + 1) % players.length` |
| LOOP-05 | App handles turn cycling through all participants | State machine transition `scoring → rolling` with player index increment |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Die roll animation | Browser / Client | — | Animation runs entirely on device using Reanimated's UI thread |
| Die roll result generation | Browser / Client | — | Random number generation happens client-side for offline play |
| Turn cycling logic | API / Backend (simulated) | — | Zustand store acts as "backend" for game state management |
| Phase state machine | API / Backend (simulated) | — | GameStore's VALID_TRANSITIONS enforces game flow |
| Navigation flow | Browser / Client | — | Expo Router handles screen transitions based on phase state |
| State persistence | Database / Storage | — | AsyncStorage persists game state via Zustand middleware |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-reanimated | 3.17.4 | Die roll animation | Runs on UI thread for 60fps; `withSequence` + `withSpring` for natural roll physics; industry standard |
| react-native-gesture-handler | 2.24.0 | Touch gestures for die | Native gesture recognition; integrates with Reanimated for smooth animations |
| expo-haptics | 56.0.3 | Tactile feedback | Die roll vibration; correct/incorrect haptic patterns (Phase 1 already uses) |
| expo-router | 4.0.19 | Screen navigation | Phase-based navigation: roll → move → question; `router.push()` and `router.back()` |
| zustand | 5.0.14 | Game state | Already implements state machine; `currentPlayerIndex` for turn tracking |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| AsyncStorage | 2.1.0 | State persistence | Zustand persist middleware; automatic rehydration on app launch |
| Tamagui | 2.1.0 | UI styling | Dark theme consistency with Phase 1 components |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom die animation | Three.js / Babylon.js | Overkill for 2D die; adds ~500KB bundle; physics not needed for deterministic roll |
| Reanimated gestures | React Native Animated API | Runs on JS thread; stutters during animation; Reanimated's UI thread execution is smoother |
| expo-router navigation | React Navigation 7 | Already using Expo Router in Phase 1; consistent API |

**Installation:** All dependencies already installed in Phase 1.

**Version verification:**
```
react-native-reanimated: 3.17.4 (current: ~3.17.4) ✓
react-native-gesture-handler: 2.24.0 (current: ~2.24.0) ✓
expo-haptics: 56.0.3 (current: ~56.0.3) ✓
expo-router: 4.0.19 (current: ~4.0.19) ✓
zustand: 5.0.14 (current: ^5.0.14) ✓
```

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          UI Layer (Expo Router)                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐ │
│  │ Roll Screen │ → │ Move Screen │ → │ Question Screen (Phase 1)   │ │
│  │ (new)       │    │ (new)       │    │ (existing)                  │ │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┬───────────────┘ │
│         │                  │                         │                   │
│         │ dieResult        │ selectedMove           │ answerMarked      │
│         ▼                  ▼                         ▼                   │
├─────────────────────────────────────────────────────────────────────────┤
│                     State Layer (Zustand Stores)                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ GameStore                                                          │  │
│  │ - phase: 'setup' → 'rolling' → 'moving' → 'answering' → 'scoring' │  │
│  │ - currentPlayerIndex: 0..5                                        │  │
│  │ - dieResult: 1..6 | null                                          │  │
│  │ - currentQuestion: PlaceholderQuestion | null                     │  │
│  │ - rollDie(): sets dieResult, triggers animation                   │  │
│  │ - nextTurn(): increments currentPlayerIndex, resets state          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ PlayerStore (existing)                                             │  │
│  │ - players: Player[]                                               │  │
│  │ - players.length for turn cycling                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ persist middleware
                                 ▼
                    ┌────────────────────────┐
                    │   AsyncStorage         │
                    │   (game state saved)   │
                    └────────────────────────┘
```

### Game Loop State Flow

```
[Start Game] → phase='rolling'
        ↓
[Roll Screen: Tap die]
        ↓
[Animation: dieResult = 1-6] → haptic feedback
        ↓
[GameStore: phase = 'moving']
        ↓
[Move Screen: Show valid moves] ← Phase 3 will add board logic
        ↓
[Select move]
        ↓
[GameStore: phase = 'answering', load question]
        ↓
[Question Screen: Read question] ← Phase 1 implementation
        ↓
[Mark correct/incorrect]
        ↓
[GameStore: phase = 'scoring']
        ↓
[Check game end] ──No──→ [nextTurn(): currentPlayerIndex++]
        │                         ↓
        │                  [phase = 'rolling']
        │                         ↓
        │                  [Navigate to Roll Screen]
        │
       Yes
        ↓
[phase = 'finished'] → [Navigate to Results Screen (Phase 4)]
```

### Recommended Project Structure (Additions)

```
app/
├── game/
│   ├── _layout.tsx          # (existing) Game flow layout
│   ├── setup.tsx            # (existing) Participant setup
│   ├── roll.tsx             # (new) Die roll screen
│   ├── move.tsx             # (new) Move selection screen
│   └── question.tsx         # (existing) Question display
components/
├── Die.tsx                   # (new) Die roll animation component
├── DieFace.tsx              # (new) Single die face render
├── MoveOption.tsx           # (new) Move choice button
└── ... (existing components)
stores/
├── gameStore.ts             # (extend) Add dieResult, rollDie, nextTurn
└── ... (existing stores)
services/
├── dice.ts                   # (new) Die roll logic (random, animation timing)
└── moves.ts                  # (deferred to Phase 3) Valid move calculation
types/
└── game.ts                  # (extend) Add dieResult type
```

### Pattern 1: Die Roll Animation with Reanimated

**What:** Use shared values for rotation/translation, `withSequence` for multi-stage animation, gesture handler for tap-to-roll.

**When to use:** The die roll is the primary user interaction in this phase.

**Example:**
```typescript
// components/Die.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

export function Die({ result, onRoll }: { result: number | null; onRoll: () => void }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const tap = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      // Trigger haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Multi-stage roll animation
      rotation.value = withSequence(
        withTiming(360 * 3, { duration: 500, easing: Easing.out(Easing.quad) }),
        withTiming(360 * 5 + result * 60, { duration: 300 }),
      );

      // Shake effect
      translateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 100 }),
      );

      // Bounce back
      scale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withSpring(1),
      );

      // Callback to parent
      runOnJS(onRoll)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[styles.dieContainer, animatedStyle]}>
        <DieFace value={result ?? 1} />
      </Animated.View>
    </GestureDetector>
  );
}
```

Source: [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/your-first-animation)

### Pattern 2: State Machine Phase Transitions

**What:** Extend the existing VALID_TRANSITIONS to support the rolling → moving → answering → scoring flow with proper navigation triggers.

**When to use:** Every phase transition in the game loop.

**Example:**
```typescript
// stores/gameStore.ts (extensions)
interface GameStore extends GameState {
  // Existing
  dieResult: number | null;

  // New actions for Phase 2
  rollDie: () => number;          // Returns 1-6, sets dieResult
  selectMove: (spaceId: string) => void;  // Phase 3: Move validation
  nextTurn: () => void;           // Cycle to next player
}

// Phase transitions (existing in types/game.ts)
const VALID_TRANSITIONS = {
  setup: ['rolling'],
  rolling: ['moving'],            // After die roll completes
  moving: ['answering'],          // After move selection
  answering: ['scoring'],        // After answer marked
  scoring: ['rolling', 'finished'], // Next turn or game end
  finished: [],
};

// Turn cycling implementation
nextTurn: () => {
  const { currentPlayerIndex } = get();
  const { players } = usePlayerStore.getState();

  const nextIndex = (currentPlayerIndex + 1) % players.length;

  set({
    currentPlayerIndex: nextIndex,
    dieResult: null,
    answerRevealed: false,
    phase: 'rolling',
  });
},
```

Source: [State Pattern Guide](https://medium.com/@aadurizs/state-pattern-under-control-a-practical-guide-from-if-else-chaos-to-clean-state-management-3f74e424477e)

### Pattern 3: Phase-Based Navigation with Expo Router

**What:** Use `useEffect` to watch `phase` state and navigate accordingly.

**When to use:** Automatic screen transitions based on game state.

**Example:**
```typescript
// app/game/_layout.tsx
import { useGameStore } from '../../stores/gameStore';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function GameLayout() {
  const phase = useGameStore((state) => state.phase);
  const router = useRouter();

  useEffect(() => {
    switch (phase) {
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
        // Short pause, then nextTurn() called by markAnswer
        break;
      case 'finished':
        router.replace('/game/results');
        break;
    }
  }, [phase]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="roll" />
      <Stack.Screen name="move" />
      <Stack.Screen name="question" />
    </Stack>
  );
}
```

Source: [Expo Router Documentation](https://docs.expo.dev/router/navigation/)

### Anti-Patterns to Avoid

- **Animating on JS thread:** Using React Native's Animated API instead of Reanimated causes frame drops during complex animations. Use `useSharedValue` and `useAnimatedStyle` to keep animations on the UI thread.
- **Phase state in component state:** Storing `phase` or `currentPlayerIndex` in component `useState` loses state on navigation. All game state must be in Zustand stores with persistence.
- **Skipping phase transitions:** Jumping directly from `rolling` to `answering` bypasses validation and makes debugging harder. Always go through VALID_TRANSITIONS.
- **Blocking animations:** Using `await` on animation completion. Instead use callbacks or state transitions triggered by animation finish.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Die roll random number | `Math.random()` wrapper | Native `Math.floor(Math.random() * 6) + 1` is sufficient; no library needed for deterministic RNG in offline game |
| Animation timing | Custom timing functions | Reanimated `withTiming`, `withSpring`, `withSequence` | Battle-tested physics, consistent cross-platform |
| Gesture handling | Custom touch listeners | `react-native-gesture-handler` Gesture.Tap() | Native gesture recognition, works during animations |
| State persistence | Custom AsyncStorage calls | Zustand `persist` middleware | Already implemented, automatic rehydration |
| Turn cycling | Complex Redux-like patterns | Simple modulo arithmetic: `(currentPlayerIndex + 1) % players.length` | State machine already tracks current player |

**Key insight:** The game is simple enough that most logic doesn't need external libraries. Use Reanimated for animations, Zustand for state, and native JavaScript for game logic.

## Common Pitfalls

### Pitfall 1: Die Animation Jank on Low-End Devices

**What goes wrong:** Complex 3D rotation with shadows causes frame drops on older Android devices.

**Why it happens:** Reanimated runs on UI thread, but complex transforms still require GPU rendering. Low-end GPUs can't handle rapid 3D transforms.

**How to avoid:** Use 2D rotation (single axis) instead of 3D cube. Precompute die face visibility based on result. Test on Android API 24+ devices. Use `Easing.out(Easing.quad)` for natural deceleration.

**Warning signs:** Frame rate drops below 30fps during roll animation; stuttering on device testing.

### Pitfall 2: Lost Game State on Background/Foreground

**What goes wrong:** Player answers a question, backgrounds the app, and game state is corrupted on resume.

**Why it happens:** AsyncStorage persistence is asynchronous. If app is backgrounded before state is written, resume shows stale state.

**How to avoid:** Zustand's persist middleware writes on every state change. Ensure `_hasHydrated` flag is checked before showing game UI. Use `onRehydrateStorage` callback to handle post-hydration setup.

```typescript
// stores/gameStore.ts
onRehydrateStorage: () => (state, error) => {
  if (error) {
    console.error('Failed to hydrate game state:', error);
  }
  // Ensure state is valid after rehydration
  if (state?.phase === 'rolling' && state.dieResult === null) {
    // Game was interrupted during roll, reset to rolling
    state.phase = 'rolling';
  }
},
```

Source: [Zustand Persist Documentation](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md)

### Pitfall 3: Race Condition in Navigation

**What goes wrong:** `markAnswer()` triggers `nextTurn()`, which sets `phase='rolling'`, and navigation happens before score animation completes.

**Why it happens:** State updates and navigation are asynchronous. Multiple rapid updates can cause navigation stack corruption.

**How to avoid:** Use `setTimeout` for navigation delay after scoring, or track animation state separately from game state.

```typescript
// In markAnswer action
markAnswer: (correct: boolean) => {
  const { currentPlayerIndex } = get();

  // Update score (Phase 4)
  if (correct) {
    usePlayerStore.getState().updateScore(currentPlayerIndex, ...);
  }

  // Check game end
  if (isGameComplete()) {
    set({ phase: 'finished' });
    return;
  }

  // Delay navigation to let scoring animation complete
  setTimeout(() => {
    get().nextTurn();
  }, 500);
},
```

### Pitfall 4: Player Index Out of Bounds

**What goes wrong:** Player leaves mid-game, `currentPlayerIndex` exceeds `players.length`.

**Why it happens:** Turn cycling uses modulo arithmetic, but removing a player changes the array length.

**How to avoid:** Phase 1 doesn't support removing players mid-game (D-08 only allows removal before game starts). Add guard in `nextTurn()`:

```typescript
nextTurn: () => {
  const { players } = usePlayerStore.getState();
  if (players.length === 0) {
    console.error('No players in game');
    set({ phase: 'setup' });
    return;
  }
  const nextIndex = (get().currentPlayerIndex + 1) % players.length;
  set({ currentPlayerIndex: nextIndex, phase: 'rolling' });
},
```

## Code Examples

### Die Roll Screen with Animation

```typescript
// app/game/roll.tsx
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { useGameStore } from '../../stores/gameStore';
import { Die } from '../../components/Die';
import { PlayerIndicator } from '../../components/PlayerIndicator';
import { usePlayerStore } from '../../stores/playerStore';

export default function RollScreen() {
  const theme = useTheme();
  const { dieResult, phase, currentPlayerIndex, transitionTo } = useGameStore();
  const { players } = usePlayerStore();
  const currentPlayer = players[currentPlayerIndex];

  const handleRoll = () => {
    // Generate random result
    const result = Math.floor(Math.random() * 6) + 1;

    // Update store (triggers animation via dieResult change)
    useGameStore.setState({ dieResult: result });

    // Transition to moving phase after animation
    setTimeout(() => {
      transitionTo('moving');
    }, 1500); // Animation duration
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val }]}>
      {currentPlayer && (
        <View style={styles.playerIndicator}>
          <PlayerIndicator
            playerName={currentPlayer.name}
            playerColor={currentPlayer.color}
          />
        </View>
      )}

      <View style={styles.dieContainer}>
        <Die result={dieResult} onRoll={handleRoll} />
      </View>

      <View style={styles.instructions}>
        <Text style={[styles.instructionText, { color: theme.color?.val }]}>
          Tap the die to roll
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  playerIndicator: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center' },
  dieContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  instructions: { paddingBottom: 32 },
  instructionText: { fontSize: 18, textAlign: 'center' },
});
```

### Move Selection Screen (Placeholder for Phase 3)

```typescript
// app/game/move.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { useGameStore } from '../../stores/gameStore';
import { useRouter } from 'expo-router';

export default function MoveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { dieResult, transitionTo, selectCategory } = useGameStore();

  // Phase 3: This will be replaced with board position logic
  // For now, show placeholder "Move selected" button
  const handleMoveSelected = () => {
    // Random category for testing (Phase 3 adds board-based selection)
    selectCategory('blue'); // Placeholder
    transitionTo('answering');
    router.replace('/game/question');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val }]}>
      <Text style={[styles.resultText, { color: theme.color?.val }]}>
        You rolled: {dieResult}
      </Text>

      <Text style={[styles.instructionText, { color: theme.color?.val }]}>
        Select your move
      </Text>

      {/* Phase 3: Replace with actual move options based on board position */}
      <Pressable
        style={[styles.moveButton, { backgroundColor: theme.accent?.val }]}
        onPress={handleMoveSelected}
      >
        <Text style={styles.buttonText}>Continue (Phase 3 will add board)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  resultText: { fontSize: 48, fontWeight: 'bold', marginBottom: 24 },
  instructionText: { fontSize: 18, marginBottom: 32 },
  moveButton: { padding: 16, borderRadius: 8, minWidth: 200 },
  buttonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
});
```

### Turn Cycling in GameStore

```typescript
// stores/gameStore.ts (extensions for Phase 2)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GamePhase, GameState, VALID_TRANSITIONS } from '../types/game';
import { getRandomQuestion, PlaceholderQuestion } from '../data/questions/placeholder';
import { usePlayerStore } from './playerStore';

interface GameStore extends GameState {
  currentQuestion: PlaceholderQuestion | null;
  currentCategory: PlayerColor | null;
  dieResult: number | null;

  // Actions
  rollDie: () => number;
  nextTurn: () => void;
  selectCategory: (category: PlayerColor) => void;
  transitionTo: (newPhase: GamePhase) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state (existing)
      phase: 'setup',
      currentPlayerIndex: 0,
      questionNumber: 1,
      answerRevealed: false,
      currentQuestion: null,
      currentCategory: null,
      dieResult: null,

      // Phase 2: Die roll
      rollDie: () => {
        const result = Math.floor(Math.random() * 6) + 1;
        set({ dieResult: result });
        return result;
      },

      // Phase 2: Turn cycling
      nextTurn: () => {
        const { players } = usePlayerStore.getState();

        if (players.length === 0) {
          console.error('nextTurn called with no players');
          set({ phase: 'setup' });
          return;
        }

        const nextIndex = (get().currentPlayerIndex + 1) % players.length;

        // Get new question for next player
        const question = getRandomQuestion();

        set({
          currentPlayerIndex: nextIndex,
          dieResult: null,
          answerRevealed: false,
          currentQuestion: question,
          currentCategory: question.category,
          phase: 'rolling',
          questionNumber: get().questionNumber + 1,
        });
      },

      // Existing actions
      transitionTo: (newPhase: GamePhase) => {
        const current = get().phase;
        if (!VALID_TRANSITIONS[current].includes(newPhase)) {
          console.error(`Invalid transition: ${current} -> ${newPhase}`);
          return;
        }
        set({ phase: newPhase });
      },

      selectCategory: (category: PlayerColor) => {
        const question = getRandomQuestion(category);
        set({ currentCategory: category, currentQuestion: question });
      },

      // ... existing actions
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Animated API (JS thread) | Reanimated 3.x (UI thread) | React Native 0.72+ | 60fps animations guaranteed |
| Navigation.navigate() | Expo Router file-based routing | Expo SDK 55+ | Automatic deep linking, type safety |
| Redux with saga | Zustand with middleware | 2023+ trend | Simpler state management, less boilerplate |
| 3D dice with Three.js | 2D die with Reanimated transforms | Simplified for mobile | Smaller bundle, faster performance |

**Deprecated/outdated:**
- **React Navigation 5/6:** Use Expo Router (file-based routing with automatic deep linking)
- **Animated API from React Native:** Use react-native-reanimated (UI thread execution)
- **Redux for game state:** Overkill for local-only game; Zustand is simpler and sufficient

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Die roll animation can be achieved with 2D rotation + scale transforms | Architecture Patterns | Medium - May need 3D cube for visual appeal; can pivot to simple face switch |
| A2 | 1.5 second animation duration is sufficient for satisfying roll | Code Examples | Low - Easy to adjust timing in setTimeout |
| A3 | Board position logic is deferred to Phase 3 (no valid moves in Phase 2) | Phase Requirements | Low - Phase 3 requirements confirm this is correct |
| A4 | Players cannot be removed mid-game (per Phase 1 D-08) | Common Pitfalls | Low - Already documented in Phase 1 |

**All other claims in this research were verified via Context7 documentation, official Expo docs, or existing codebase inspection.**

## Open Questions

1. **Die visual design:**
   - What we know: Die roll animation needs `withSequence` + `withSpring`, result displayed as face
   - What's unclear: Should die be 3D cube (higher visual appeal) or 2D rotation (simpler)?
   - Recommendation: Start with 2D rotation + scale transforms (A1). If testing shows users want more visual polish, pivot to 3D cube using matrix transforms from [chrizog/react-native-3d-rotations](https://github.com/chrizog/react-native-3d-rotations/blob/master/src/screens/cube.tsx).

2. **Move selection screen:**
   - What we know: Phase 3 implements board positions and valid moves
   - What's unclear: What should Phase 2 show for move selection?
   - Recommendation: Placeholder screen showing die result and "Continue" button. Transitions to question screen. Phase 3 replaces with actual board position selection.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| react-native-reanimated | Die animation | ✓ | 3.17.4 | — |
| react-native-gesture-handler | Tap gestures | ✓ | 2.24.0 | — |
| expo-haptics | Tactile feedback | ✓ | 56.0.3 | — |
| expo-router | Navigation | ✓ | 4.0.19 | — |
| zustand | State management | ✓ | 5.0.14 | — |
| AsyncStorage | Persistence | ✓ | 2.1.0 | — |

**Missing dependencies with no fallback:** None — all dependencies from Phase 1.

**Missing dependencies with fallback:** None.

## Validation Architecture

Test framework: Vitest 3.0.0 (from package.json)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.0 |
| Config file | None detected (uses defaults) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOOP-01 | Die roll generates random 1-6 | Unit | `vitest run stores/gameStore.test.ts` | ❌ Wave 0 |
| LOOP-01 | Die roll animation plays on UI thread | Integration | Manual visual test | N/A |
| LOOP-02 | dieResult stored in GameStore | Unit | `vitest run stores/gameStore.test.ts` | ❌ Wave 0 |
| LOOP-03 | currentPlayerIndex cycles through players | Unit | `vitest run stores/gameStore.test.ts` | ❌ Wave 0 |
| LOOP-04 | nextTurn() increments currentPlayerIndex | Unit | `vitest run stores/gameStore.test.ts` | ❌ Wave 0 |
| LOOP-05 | Turn cycling wraps from last to first player | Unit | `vitest run stores/gameStore.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run typecheck` (TypeScript check)
- **Per wave merge:** `npm run test` (if tests exist)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `stores/__tests__/gameStore.test.ts` — Unit tests for rollDie(), nextTurn(), turn cycling
- [ ] `components/__tests__/Die.test.tsx` — Component render test for die animation
- [ ] Framework install: Already present (Vitest 3.0.0)
- [ ] Test config: None (Vitest uses defaults)

**Gap resolution:** Create minimal test infrastructure in Wave 0 (first implementation task) or accept manual testing for Phase 2.

## Security Domain

**Security enforcement:** Not explicitly set in config.json. Assuming standard mobile app security (no ASVS compliance required).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No authentication required (local-only game) |
| V3 Session Management | No | No sessions (local-only game) |
| V4 Access Control | No | No user accounts |
| V5 Input Validation | Yes | Zod for die roll result validation (if needed) |
| V6 Cryptography | No | No sensitive data |

### Known Threat Patterns for React Native / Expo

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| State injection via AsyncStorage | Tampering | No mitigation needed (no sensitive data in game state) |
| Race condition in turn cycling | Denial of Service | Guard clauses in nextTurn() to prevent index out of bounds |

## Sources

### Primary (HIGH confidence)

- [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/your-first-animation) — Animation patterns, withSpring, withSequence
- [Expo Router Documentation](https://docs.expo.dev/router/navigation/) — Programmatic navigation, router.push(), router.replace()
- [Expo Haptics Documentation](https://docs.expo.dev/versions/v55.0.0/sdk/haptics) — Haptic feedback types (ImpactFeedbackStyle, NotificationFeedbackType)
- [Zustand Persist Middleware](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md) — State rehydration patterns, onRehydrateStorage

### Secondary (MEDIUM confidence)

- [State Pattern Guide](https://medium.com/@aadurizs/state-pattern-under-control-a-practical-guide-from-if-else-chaos-to-clean-state-management-3f74e424477e) — State machine patterns for turn-based games
- [Game State Machine Design](https://eastondev.com/blog/en/posts/dev/20260519-game-state-machine-design/) — Three-layer architecture, phase transitions
- [React Native 3D Rotations](https://github.com/chrizog/react-native-3d-rotations/blob/master/src/screens/cube.tsx) — 3D cube matrix transforms (reference for potential future enhancement)
- [yourturn Framework](https://github.com/brandonhorst/yourturn) — Turn-based game patterns, state machine design

### Tertiary (LOW confidence)

- [ReactNativeDiceApp](https://github.com/WayneKim92/ReactNativeDiceApp) — Babylon.js approach (overkill for this use case, marked for validation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All dependencies already installed in Phase 1, versions verified
- Architecture: HIGH — Patterns from existing codebase and well-documented libraries
- Pitfalls: MEDIUM — Animation performance on low-end devices requires device testing

**Research date:** 2026-06-08
**Valid until:** 30 days (stable libraries, well-established patterns)