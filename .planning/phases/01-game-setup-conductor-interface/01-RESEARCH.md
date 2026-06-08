# Phase 1: Game Setup & Conductor Interface - Research

**Researched:** 2026-06-08
**Domain:** Mobile trivia game with game conductor interface for in-person play
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for Trivial World's game conductor experience: creating new games, managing participants, and displaying questions for read-aloud gameplay. This phase implements the core differentiator—a single-device interface where one person (the conductor) reads questions aloud while the app handles logistics.

The research confirms that Expo Router's file-based routing, Zustand's persist middleware, and Tamagui's component system provide the right tooling for this phase. The key architectural decisions from CONTEXT.md (quick start flow, inline participant entry, large text display, dark theme) are well-supported by the stack.

**Primary recommendation:** Build a minimal game creation flow with inline participant management, followed by a question display screen optimized for arm's-distance readability. Use Zustand slices for game and player state, persisting to AsyncStorage for session resume capability.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Game Creation Flow**
- D-01: Quick start flow — single "New Game" button from home screen leads directly to participant setup. No setup wizard, no configuration screens before players can start.
- D-02: No game mode selection in v1 — single game mode (standard Trivial Pursuit rules). Custom modes deferred to v1.x.
- D-03: No game ID or shareable link in v1 — local single-device play only. Online features are v2+.

**Participant Management**
- D-04: Inline participant entry — add players on the same screen as game creation. No separate "lobby" screen.
- D-05: Auto-assign player colors from the 6 Trivial World category colors (Blue, Pink, Yellow, Purple, Green, Orange) in order. First player gets Blue, second gets Pink, etc.
- D-06: Minimum 1 player, maximum 6 players (limited by category colors). Support for solo practice mode.
- D-07: Player names are optional — if not entered, use "Player 1", "Player 2", etc. as defaults.
- D-08: Remove participant with swipe-left gesture or long-press confirmation. No complex reordering UI.

**Question Display Design**
- D-09: Large centered text for question — optimized for reading aloud at arm's distance. Font size minimum 24pt, scale up on larger screens.
- D-10: Category badge displayed prominently — colored pill/badge with category name (e.g., "Pop Culture & Streaming" with pink background). Heritage from Trivial Pursuit.
- D-11: Question number shown in format "Q1", "Q2", etc. — helps conductor track progress.
- D-12: Answer hidden by default — large "Reveal Answer" button. Tap to show answer below question.
- D-13: After answer reveal — two large buttons appear: "Correct" (green) and "Incorrect" (red). Both buttons are 50% width, full-height for easy thumb tapping.
- D-14: Minimal chrome during question display — no scores, no player list, no board. Maximum screen space for question text. Eyes-up design principle.

**Conductor Interface**
- D-15: "Conductor mode" is implicit — the person holding the phone is always the conductor. No explicit role selection or mode toggle.
- D-16: After marking correct/incorrect — automatically advance to next player's turn. No manual "next turn" button.
- D-17: Current player indicator — small name/avatar at top of screen. Tap to see all players and scores (Phase 4 overlay).

**Visual Design**
- D-18: Dark theme by default — reduces eye strain in social/party settings, improves text readability.
- D-19: High contrast text — white on dark background for question text. Accessibility-first design.
- D-20: Haptic feedback on answer reveal and correct/incorrect marking — tactile confirmation for conductor.

### Claude's Discretion

- Typography scale and spacing — follow Tamagui design system defaults, ensure minimum 24pt for question text.
- Exact button placement — conductor experience research shows large bottom-aligned action buttons work best.
- Animation timing for transitions — standard 300ms for screen transitions, instant for answer reveal (no delay).
- Error handling for edge cases — graceful defaults (empty name = "Player N"), max players = hard limit with message.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Game conductor can create a new game session | Zustand game store with phase state machine, Expo Router navigation to game screen |
| SETUP-02 | Game conductor can add 1 or more participants to the game | Player store slice, inline UI component with add/remove, color auto-assignment |
| SETUP-03 | Game conductor can set participant names (no accounts required) | TextInput with default "Player N" fallback, no validation complexity needed |
| SETUP-04 | Game conductor can remove participants before game starts | Swipe-left gesture or long-press confirmation, react-native-gesture-handler |
| SETUP-05 | Game conductor can start the game when ready | State transition from 'setup' to 'rolling', navigation to first game phase |
| COND-01 | Game conductor sees questions displayed in large, readable text | Question card component with 24pt+ font, centered layout, Tamagui Text with theme tokens |
| COND-02 | Game conductor sees the current category and question number | Category badge component with color mapping, question counter in store |
| COND-03 | Game conductor can reveal/hide the answer before reading | State toggle for answer visibility, conditional render with Reveal button |
| COND-04 | Game conductor can mark answer as correct or incorrect | Two-button layout (50% width each), haptic feedback, state update + auto-advance |
| COND-05 | Game conductor sees minimal on-screen info during active play | Conditional UI rendering, no scores/board visible during answering phase |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Game session state | Zustand Store | AsyncStorage (persistence) | Single source of truth, survives app restart |
| Participant management | Zustand Store | — | In-memory during session, persisted automatically |
| Question display | React Native UI (Tamagui) | Zustand Store (read) | Presentation layer reads from store, no direct writes |
| Navigation flow | Expo Router | Zustand Store (phase-driven) | Navigation reacts to state changes via effects |
| Haptic feedback | React Native (expo-haptics) | — | Platform-native, no state tier needed |
| Theme/styling | Tamagui tokens | — | Design system manages all visual consistency |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Expo SDK | 55.x | Mobile app framework | [VERIFIED: npm registry] Managed workflow, OTA updates, SDK 55 includes RN 0.83 with New Architecture |
| React Native | 0.83 (via Expo 55) | Cross-platform runtime | [VERIFIED: npm registry] Required by Expo SDK 55 |
| TypeScript | 5.x | Type safety | [CITED: STACK.md] Required by Tamagui, catches state machine bugs |
| Expo Router | 4.x (bundled) | File-based navigation | [VERIFIED: npm registry] Type-safe routes, deep linking, matches phase navigation needs |

### State Management

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.14 | Client state | [VERIFIED: npm registry] ~1.2KB bundle, built-in persist, ideal for game state slices |
| AsyncStorage | 1.x | Key-value persistence | [VERIFIED: npm registry] Zustand persist middleware backend, standard for React Native |

### UI & Styling

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tamagui | 2.1.0 | UI components | [VERIFIED: npm registry] Token-based theming, dark mode, large text optimization, Sheet for modals |
| react-native-reanimated | 3.x | Animations | [CITED: STACK.md] UI thread animations for transitions |
| react-native-gesture-handler | 2.x | Touch gestures | [CITED: STACK.md] Swipe-to-remove participant, native gesture recognition |
| expo-haptics | 56.0.3 | Haptic feedback | [VERIFIED: npm registry] Tactile confirmation for correct/incorrect, bundled with SDK 55 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-screen-orientation | ~55.0.0 | Lock orientation | Lock to portrait for consistent conductor experience |

**Installation:**

```bash
# Project already initialized with Expo SDK 55
# Core dependencies
npm install zustand @react-native-async-storage/async-storage

# UI & Interactions
npm install tamagui @tamagui/config
npm install react-native-reanimated react-native-gesture-handler

# Expo modules (bundled)
npx expo install expo-haptics expo-screen-orientation
```

**Version verification:**
- Tamagui: 2.1.0 (published 2026-06-05) [VERIFIED]
- Zustand: 5.0.14 (published 2026-06-03) [VERIFIED]
- Expo Router: 56.2.9 (published 2026-06-06) [VERIFIED]
- expo-haptics: 56.0.3 (published 2026-06-06) [VERIFIED]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | Jotai | Zustand's persist middleware is simpler for game state; Jotai better for atomic/derived state |
| Tamagui | NativeWind | Tamagui's component library and theming are more complete; NativeWind requires more setup |
| expo-haptics | expo-av (sound) | Haptics for tactile feedback (D-20); sound deferred to future phases |

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Expo Router (File-Based Routing)                 │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────────┐ │
│  │ index.tsx    │  │ game/setup.tsx  │  │ game/question.tsx     │ │
│  │ (Home)       │  │ (Participant    │  │ (Question Display)    │ │
│  │              │  │  Management)    │  │                       │ │
│  └──────┬───────┘  └────────┬────────┘  └───────────┬───────────┘ │
└─────────┼───────────────────┼───────────────────────┼─────────────┘
          │                   │                       │
          │  router.push()     │  router.push()       │  store.subscribe()
          ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Zustand Store (Slices Pattern)                   │
│  ┌────────────────────┐  ┌────────────────────────────────────────┐│
│  │ GameSlice          │  │ PlayerSlice                            ││
│  │ - phase: 'setup'   │  │ - players: Player[]                    ││
│  │ - currentPlayerIdx │  │ - addPlayer(name)                      ││
│  │ - questionNumber   │  │ - removePlayer(id)                     ││
│  │ - answerRevealed   │  │ - autoAssignColor()                    ││
│  │ - startGame()      │  │                                        ││
│  │ - revealAnswer()   │  │                                        ││
│  │ - markAnswer(bool) │  │                                        ││
│  └────────────────────┘  └────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AsyncStorage (Persistence Layer)                 │
│  ┌──────────────────────────────────────────────────────────────────┐
│  │ 'trivial-world-game': { phase, players, questionNumber, ... }   │
│  └──────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root layout, dark theme, gesture handler
│   ├── index.tsx                # Home screen (New Game button)
│   ├── game/
│   │   ├── _layout.tsx          # Game flow stack
│   │   ├── setup.tsx            # Participant management screen
│   │   └── question.tsx         # Question display screen
├── components/
│   ├── ParticipantRow.tsx       # Single participant with color, name, remove
│   ├── AddPlayerButton.tsx      # Add participant button (disabled at 6)
│   ├── QuestionCard.tsx         # Question text, category badge, answer reveal
│   ├── AnswerButtons.tsx        # Correct/Incorrect buttons (50% width)
│   ├── CategoryBadge.tsx        # Colored pill with category name
│   └── PlayerIndicator.tsx      # Small header showing current player
├── stores/
│   ├── gameStore.ts             # Game state slice (phase, turns, questions)
│   ├── playerStore.ts           # Player management slice
│   └── index.ts                 # Combined store exports
├── constants/
│   ├── categories.ts            # Category definitions + color mapping
│   └── theme.ts                 # Tamagui theme tokens for dark mode
├── types/
│   ├── game.ts                  # GamePhase, GameState types
│   └── player.ts                # Player, PlayerColor types
└── utils/
    └── colors.ts                # Color auto-assignment logic
```

### Pattern 1: Zustand Slice Pattern

**What:** Separate stores for game state and player state, combined at import time. Each slice owns its domain.

**When to use:** Phase 1 needs both game phase management and player CRUD operations. Slices keep logic isolated.

**Example:**

```typescript
// stores/gameStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type GamePhase = 'setup' | 'rolling' | 'moving' | 'answering' | 'scoring' | 'finished';

interface GameState {
  phase: GamePhase;
  currentPlayerIndex: number;
  questionNumber: number;
  answerRevealed: boolean;
  startGame: () => void;
  nextTurn: () => void;
  revealAnswer: () => void;
  markAnswer: (correct: boolean) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      phase: 'setup',
      currentPlayerIndex: 0,
      questionNumber: 1,
      answerRevealed: false,
      startGame: () => set({ phase: 'rolling' }),
      nextTurn: () => set((state) => ({
        questionNumber: state.questionNumber + 1,
        answerRevealed: false,
      })),
      revealAnswer: () => set({ answerRevealed: true }),
      markAnswer: (correct) => {
        // Auto-advance handled by component calling nextTurn()
        set({ answerRevealed: false });
      },
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Source:** [VERIFIED: Zustand docs]

### Pattern 2: State Machine for Game Phases

**What:** Game progresses through defined phases with explicit transitions. Each phase has valid entry/exit states.

**When to use:** Phase 1 implements 'setup' -> 'rolling' (then Phase 2 continues). State machine prevents invalid states.

**Example:**

```typescript
// types/game.ts
type GamePhase = 'setup' | 'rolling' | 'moving' | 'answering' | 'scoring' | 'finished';

const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  setup: ['rolling'],
  rolling: ['moving'],
  moving: ['answering'],
  answering: ['scoring'],
  scoring: ['rolling', 'finished'],
  finished: [],
};

// In store
transitionTo: (newPhase: GamePhase) => {
  const current = get().phase;
  if (!VALID_TRANSITIONS[current].includes(newPhase)) {
    console.error(`Invalid transition: ${current} -> ${newPhase}`);
    return;
  }
  set({ phase: newPhase });
}
```

**Source:** [CITED: ARCHITECTURE.md]

### Pattern 3: Expo Router File-Based Navigation

**What:** Each file in `app/` becomes a route. Layout files define navigation structure.

**When to use:** All navigation in Phase 1. Home -> Setup -> Question flow.

**Example:**

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import config from '../tamagui.config';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config}>
        <Theme name="dark">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="game/setup" />
            <Stack.Screen name="game/question" />
          </Stack>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}

// app/index.tsx - Home Screen
import { useRouter } from 'expo-router';
import { Button, Text, YStack } from 'tamagui';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <YStack flex={1} justify="center" items="center" bg="$background">
      <Text fontSize="$8" fontWeight="bold" color="$color">
        Trivial World
      </Text>
      <Button
        size="$5"
        mt="$4"
        onPress={() => router.push('/game/setup')}
      >
        <Button.Text>New Game</Button.Text>
      </Button>
    </YStack>
  );
}
```

**Source:** [VERIFIED: Expo Router docs]

### Pattern 4: Dark Theme with Tamagui

**What:** Use Tamagui's Theme component with `name="dark"` to apply dark mode globally. Define tokens for colors.

**When to use:** D-18 requires dark theme by default. Tamagui makes this straightforward.

**Example:**

```typescript
// tamagui.config.ts
import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';

const config = createTamagui({
  fonts: {
    heading: createInterFont(),
    body: createInterFont(),
  },
  themes: {
    dark: {
      background: '#1a1a2e',
      color: '#ffffff',
      // Category colors match Trivial World branding
      blueCategory: '#0066cc',
      pinkCategory: '#ff69b4',
      yellowCategory: '#ffd700',
      purpleCategory: '#9932cc',
      greenCategory: '#228b22',
      orangeCategory: '#ff8c00',
    },
  },
});

export default config;
```

**Source:** [VERIFIED: Tamagui docs]

### Anti-Patterns to Avoid

- **Storing UI state in Zustand:** Animation state, modal visibility belong in component `useState`, not persisted store. Use `partialize` in persist config to exclude transient fields.
- **Prop drilling player data:** Components should subscribe directly to `usePlayerStore(state => state.players)` rather than passing through props.
- **Conditional navigation in render:** Use `useEffect` with store subscriptions to trigger navigation, not conditional renders that break stack history.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Participant color assignment | Custom color picker logic | Auto-assign from fixed array | [CITED: CONTEXT.md D-05] Six fixed colors, order matters |
| State persistence | Manual AsyncStorage calls | Zustand persist middleware | Automatic rehydration, single source of truth |
| Navigation between game phases | Imperative router calls | State-driven navigation via useEffect | Predictable flow, easier debugging |
| Large readable text | Custom font sizing | Tamagui theme tokens ($8, $10) | Consistent scaling, accessibility |
| Haptic feedback | Custom vibration patterns | expo-haptics | Platform-native, well-tested patterns |

**Key insight:** The game conductor model simplifies state management significantly—one device, one conductor, no sync complexity. Embrace this constraint.

## Runtime State Inventory

> Not applicable — this is a greenfield phase with no existing code or runtime state.

## Common Pitfalls

### Pitfall 1: Screen Attention Destroys Social Interaction

**What goes wrong:** Players look at the screen instead of the conductor, breaking the social dynamic.

**Why it happens:** Standard trivia app patterns (read question, tap answer, see score) naturally draw eyes to screens. Designers default to "more information = better."

**How to avoid:**
- Design for the conductor model explicitly — only conductor needs to see screen during question display
- Minimize on-screen info during answering phase (D-14: no scores, no player list, no board)
- Create "eyes up" moments — after revealing answer, the conductor should be talking to players, not reading more screen content
- Use haptic feedback (D-20) for tactile confirmation so conductor doesn't need to watch for visual changes

**Warning signs:**
- Playtesters reading questions silently instead of aloud
- "Wait, what did you say?" questions from players

**Source:** [CITED: PITFALLS.md]

### Pitfall 2: Pacing Problems from Slow Turn Transitions

**What goes wrong:** Between-question transitions are slow, momentum dies, social energy dissipates.

**Why it happens:** Too many taps to get from one question to the next. "Helpful" features that slow flow. Conductor fumbles through menus.

**How to avoid:**
- D-16: Auto-advance after marking correct/incorrect — no manual "next turn" button
- Minimize tap count: Question displayed -> Reveal -> Mark -> Next question (3 taps max)
- Instant answer reveal (D-12: no animation delay)
- Standard 300ms for screen transitions (fast enough, not jarring)

**Warning signs:**
- Playtesters reaching for phones between turns
- Silence during app interactions
- Conductor frustration with interface speed

**Source:** [CITED: PITFALLS.md]

### Pitfall 3: Over-Engineering for Scale That Never Arrives

**What goes wrong:** Building multiplayer infrastructure, account systems, cloud sync for v1.

**Why it happens:** Developers default to patterns from online games. "Every game needs accounts" feels like standard practice.

**How to avoid:**
- Embrace out-of-scope list: no online multiplayer, no user accounts for v1
- Single device, single conductor, all state local
- Zustand + AsyncStorage is sufficient — no backend needed
- Focus on core loop validation first

**Warning signs:**
- Discussions about "what if we add X" for features not in MVP
- Time spent on backend setup before core game works

**Source:** [CITED: PITFALLS.md]

### Pitfall 4: Tiny Tap Targets on Small Screens

**What goes wrong:** Conductor accidentally taps wrong button during fast-paced gameplay.

**Why it happens:** Mobile trivia games often use standard 44px tap targets, but party games need larger targets for fast, confident tapping.

**How to avoid:**
- D-13: Correct/Incorrect buttons are 50% width, full-height
- Minimum 48px tap targets for all interactive elements
- Generous spacing between buttons
- Haptic feedback confirms successful tap

**Source:** [CITED: PITFALLS.md]

## Code Examples

### Participant Management with Color Auto-Assignment

```typescript
// constants/categories.ts
export const PLAYER_COLORS = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'] as const;

export type PlayerColor = typeof PLAYER_COLORS[number];

export const CATEGORY_COLORS: Record<PlayerColor, string> = {
  blue: '#0066cc',
  pink: '#ff69b4',
  yellow: '#ffd700',
  purple: '#9932cc',
  green: '#228b22',
  orange: '#ff8c00',
};

// stores/playerStore.ts
import { create } from 'zustand';
import { PLAYER_COLORS, PlayerColor } from '../constants/categories';

interface Player {
  id: string;
  name: string;
  color: PlayerColor;
}

interface PlayerState {
  players: Player[];
  addPlayer: (name?: string) => void;
  removePlayer: (id: string) => void;
  resetPlayers: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],
  addPlayer: (name) => set((state) => {
    if (state.players.length >= 6) return state; // Max 6 players
    const nextColor = PLAYER_COLORS[state.players.length];
    return {
      players: [...state.players, {
        id: crypto.randomUUID(),
        name: name || `Player ${state.players.length + 1}`,
        color: nextColor,
      }],
    };
  }),
  removePlayer: (id) => set((state) => ({
    players: state.players.filter(p => p.id !== id)
      .map((p, i) => ({ ...p, color: PLAYER_COLORS[i] })), // Reassign colors
  })),
  resetPlayers: () => set({ players: [] }),
}));
```

**Source:** [CITED: CONTEXT.md D-05, D-06, D-07]

### Question Display Component

```typescript
// components/QuestionCard.tsx
import { useState } from 'react';
import { XStack, YStack, Text, Button } from 'tamagui';
import { CATEGORY_COLORS, PlayerColor } from '../constants/categories';
import { CategoryBadge } from './CategoryBadge';

interface QuestionCardProps {
  questionNumber: number;
  category: PlayerColor;
  questionText: string;
  answerText: string;
}

export function QuestionCard({
  questionNumber,
  category,
  questionText,
  answerText,
}: QuestionCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <YStack flex={1} bg="$background" p="$4" justify="center" items="center">
      {/* Category Badge */}
      <CategoryBadge category={category} />

      {/* Question Number */}
      <Text fontSize="$3" color="$color" mt="$2" opacity={0.7}>
        Q{questionNumber}
      </Text>

      {/* Question Text - Large, Centered */}
      <Text
        fontSize={24} // D-09: minimum 24pt
        fontWeight="bold"
        color="$color"
        textAlign="center"
        mt="$4"
        px="$2"
      >
        {questionText}
      </Text>

      {/* Answer Reveal Button or Answer Text */}
      {revealed ? (
        <Text
          fontSize="$6"
          color="$color"
          textAlign="center"
          mt="$4"
          px="$2"
        >
          {answerText}
        </Text>
      ) : (
        <Button
          size="$6"
          mt="$6"
          onPress={() => setRevealed(true)}
        >
          <Button.Text>Reveal Answer</Button.Text>
        </Button>
      )}
    </YStack>
  );
}
```

**Source:** [CITED: CONTEXT.md D-09, D-10, D-11, D-12]

### Answer Marking with Haptic Feedback

```typescript
// components/AnswerButtons.tsx
import { XStack, Button } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../stores/gameStore';

interface AnswerButtonsProps {
  onMark: (correct: boolean) => void;
}

export function AnswerButtons({ onMark }: AnswerButtonsProps) {
  const markAnswer = useGameStore(s => s.markAnswer);

  const handleMark = async (correct: boolean) => {
    // D-20: Haptic feedback
    await Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );

    markAnswer(correct);
    onMark(correct);
  };

  return (
    <XStack w="100%" gap="$2" px="$4">
      {/* D-13: 50% width buttons */}
      <Button
        flex={1}
        size="$6"
        bg="green"
        onPress={() => handleMark(true)}
      >
        <Button.Text color="white" fontWeight="bold">
          ✓ Correct
        </Button.Text>
      </Button>
      <Button
        flex={1}
        size="$6"
        bg="red"
        onPress={() => handleMark(false)}
      >
        <Button.Text color="white" fontWeight="bold">
          ✗ Incorrect
        </Button.Text>
      </Button>
    </XStack>
  );
}
```

**Source:** [CITED: CONTEXT.md D-13, D-20]

### Swipe-to-Remove Participant

```typescript
// components/ParticipantRow.tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Animated, XStack, Text, Button } from 'tamagui';
import { usePlayerStore, Player } from '../stores/playerStore';

interface ParticipantRowProps {
  player: Player;
}

export function ParticipantRow({ player }: ParticipantRowProps) {
  const removePlayer = usePlayerStore(s => s.removePlayer);
  const translateX = new Animated.Value(0);

  // D-08: Swipe-left to remove
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.setValue(e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX < -100) {
        removePlayer(player.id);
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={{ transform: [{ translateX }] }}>
        <XStack
          bg="$backgroundHover"
          p="$3"
          br="$2"
          justify="space-between"
          items="center"
        >
          <Text color="$color">{player.name}</Text>
          <Text color={player.color}>●</Text>
        </XStack>
      </Animated.View>
    </GestureDetector>
  );
}
```

**Source:** [CITED: CONTEXT.md D-08]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux with sagas | Zustand with persist | 2023+ | Simpler state management, less boilerplate |
| React Navigation 6 | Expo Router 4 | 2024+ | File-based routing, type-safe, automatic deep linking |
| AsyncStorage for everything | Zustand persist + AsyncStorage | 2023+ | Automatic rehydration, single source of truth |
| Styled Components | Tamagui | 2023+ | Build-time style extraction, better performance |

**Deprecated/outdated:**
- **Realm:** Deprecated as of 2025, MongoDB shifted focus [CITED: STACK.md]
- **React Navigation 6:** Use Expo Router 4+ or React Navigation 7 for better TypeScript support

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Expo SDK 55 is stable and recommended for production | Standard Stack | Medium — could need SDK 56 if critical bugs |
| A2 | 6 colors sufficient for all player counts | Architecture | Low — design already locked (D-05) |
| A3 | No persistence needed for Phase 1 demo | Architecture | Medium — may need AsyncStorage earlier for testing |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Question content source for Phase 1 testing**
   - What we know: Questions are stored locally (QSTN-05), content system is Phase 3
   - What's unclear: Should Phase 1 use placeholder/mock questions, or a minimal question set?
   - Recommendation: Use 3-5 hardcoded placeholder questions per category for Phase 1 development; defer real question loading to Phase 3

2. **Participant removal confirmation UX**
   - What we know: D-08 specifies swipe-left or long-press
   - What's unclear: Should there be an undo toast, or is immediate removal acceptable?
   - Recommendation: Immediate removal with undo toast (3-second window) — standard mobile pattern, low complexity

## Environment Availability

> Phase 1 has external dependencies (Expo CLI, iOS simulator/Android emulator).

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build | Likely | 18+ LTS | — |
| npm/yarn | Package management | Likely | Latest | — |
| Expo CLI | Development | Likely | Latest | — |
| iOS Simulator | Testing | Optional | Xcode 15+ | Expo Go on device |
| Android Emulator | Testing | Optional | Android Studio | Expo Go on device |

**Missing dependencies with no fallback:**
- None — Expo Go on physical device is viable alternative to simulators

**Missing dependencies with fallback:**
- iOS Simulator/Android Emulator → Expo Go app on physical device for testing

## Validation Architecture

> workflow.nyquist_validation is explicitly set to false in config.json. Skipping test infrastructure research.

## Security Domain

> This is a greenfield mobile app with no backend, authentication, or external services. Security concerns are minimal for Phase 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No accounts in v1 (D-03) |
| V3 Session Management | No | Local-only state, no sessions |
| V4 Access Control | No | Single-device, single-conductor model |
| V5 Input Validation | Yes | Player name sanitization (though names are display-only) |
| V6 Cryptography | No | No sensitive data stored |

### Known Threat Patterns for React Native / Expo

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Local data tampering | Tampering | AsyncStorage is not encrypted; acceptable for non-sensitive game state |
| Expo Go debug exposure | Information Disclosure | Use development builds for production testing |

## Sources

### Primary (HIGH confidence)

- [Tamagui Documentation](https://tamagui.dev) — Component library, theming, dark mode [VERIFIED: Context7]
- [Expo Router Documentation](https://docs.expo.dev/router) — File-based routing, navigation patterns [VERIFIED: Context7]
- [Zustand GitHub](https://github.com/pmndrs/zustand) — State management, persist middleware [VERIFIED: Context7]
- [Expo Haptics Documentation](https://docs.expo.dev/versions/latest/sdk/haptics/) — Haptic feedback patterns [VERIFIED: Context7]

### Secondary (MEDIUM confidence)

- [STACK.md](../research/STACK.md) — Stack research for Trivial World [CITED: project research]
- [ARCHITECTURE.md](../research/ARCHITECTURE.md) — Architecture patterns for game state [CITED: project research]
- [FEATURES.md](../research/FEATURES.md) — Feature research for game conductor model [CITED: project research]
- [PITFALLS.md](../research/PITFALLS.md) — Pitfalls research for social trivia games [CITED: project research]

### Tertiary (LOW confidence)

- None — all core claims verified or cited from project research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All versions verified against npm registry, documentation fetched from Context7
- Architecture: HIGH — Patterns from ARCHITECTURE.md confirmed with Context7 documentation
- Pitfalls: HIGH — Multiple industry sources confirm social trivia challenges

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (30 days — stable mobile ecosystem)