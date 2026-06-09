# Phase 5: State Persistence - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 4
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `stores/playerStore.ts` | store | CRUD | `stores/gameStore.ts`, `stores/questionStore.ts` | exact |
| `app/index.tsx` | screen | request-response | `app/index.tsx` (existing) | exact (modify) |
| `app/game/_layout.tsx` | layout | request-response | `app/game/_layout.tsx` (existing) | exact (modify) |
| `components/PauseOverlay.tsx` | component | UI event | `components/PlayerScoreCard.tsx` | role-match |

## Pattern Assignments

### `stores/playerStore.ts` (store, CRUD)

**Analog:** `stores/gameStore.ts` (exact persist pattern), `stores/questionStore.ts` (Set serialization reference)

**Current state:** Lines 1-115 — No persist middleware

**Imports pattern to add** (from gameStore.ts lines 1-3):
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

**Persist wrapper pattern** (from gameStore.ts lines 32-34, 187-191):
```typescript
export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // ... all state and actions
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Apply to playerStore:** Wrap existing `create<PlayerState>((set, get) => ...)` with persist middleware:
```typescript
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

**Note:** playerStore uses simple arrays (not Set), so no `partialize` or `onRehydrateStorage` needed — unlike questionStore which serializes Set.

---

### `app/index.tsx` (screen, request-response)

**Analog:** `app/index.tsx` (existing home screen — modification target)

**Current imports** (lines 1-4):
```typescript
import { useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
```

**Add store imports:**
```typescript
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
```

**Current screen pattern** (lines 11-33):
```typescript
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      <Text style={[styles.title, { color: theme.color?.val as string }]}>
        Trivial World
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: theme.color?.val as string }]}
        onPress={() => router.push('/game/setup')}
      >
        <Text style={[styles.buttonText, { color: theme.background?.val as string }]}>
          New Game
        </Text>
      </Pressable>
    </View>
  );
}
```

**New pattern with resume detection:**
```typescript
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const phase = useGameStore((state) => state.phase);
  const players = usePlayerStore((state) => state.players);
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const startGame = useGameStore((state) => state.startGame);

  // D-02: Game resumable if in progress and has players
  const hasActiveGame = phase !== 'setup' && phase !== 'finished' && players.length > 0;

  const handleNewGame = () => {
    if (hasActiveGame) {
      // D-02: Warn if game in progress
      resetPlayers();
    }
    router.push('/game/setup');
  };

  const handleResumeGame = () => {
    // Navigate based on current phase
    const phaseRoutes: Record<string, string> = {
      rolling: '/game/roll',
      moving: '/game/move',
      answering: '/game/question',
      scoring: '/game/question',
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
          hasActiveGame ? styles.secondaryButton : styles.button,
          { backgroundColor: hasActiveGame ? 'rgba(255,255,255,0.2)' : theme.color?.val as string }
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
```

---

### `app/game/_layout.tsx` (layout, request-response)

**Analog:** `app/game/_layout.tsx` (existing layout — modification target)

**Current pattern** (lines 1-21):
```typescript
import { Stack } from 'expo-router';

export default function GameLayout() {
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

**Add pause button pattern:** Use Stack header options with custom header component, or render pause button in each game screen's header area.

**Alternative: Global pause context at layout level:**
```typescript
import { Stack } from 'expo-router';
import { useState } from 'react';
import { PauseOverlay } from '../../components/PauseOverlay';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useRouter } from 'expo-router';

export default function GameLayout() {
  const [pauseOpen, setPauseOpen] = useState(false);
  const router = useRouter();
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const startGame = useGameStore((state) => state.startGame);

  const handleEndGame = () => {
    resetPlayers();
    router.replace('/');
  };

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: 'Game',
          headerLeft: () => (
            <Pressable onPress={() => setPauseOpen(true)}>
              <Text>Pause</Text>
            </Pressable>
          ),
        }}
      >
        <Stack.Screen name="setup" />
        <Stack.Screen name="roll" />
        <Stack.Screen name="move" />
        <Stack.Screen name="question" />
        <Stack.Screen name="results" />
      </Stack>
      <PauseOverlay
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        onResume={() => setPauseOpen(false)}
        onEndGame={handleEndGame}
      />
    </>
  );
}
```

---

### `components/PauseOverlay.tsx` (component, UI event)

**Analog:** `components/PlayerScoreCard.tsx` (Tamagui UI component pattern)

**Component pattern** (from PlayerScoreCard.tsx lines 1-27):
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';

interface PauseOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onEndGame: () => void;
}

export function PauseOverlay({ open, onOpenChange, onResume, onEndGame }: PauseOverlayProps) {
  const theme = useTheme();

  if (!open) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.sheet, { backgroundColor: theme.background?.val as string }]}>
        <Text style={[styles.title, { color: theme.color?.val as string }]}>
          Game Paused
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: '#228b22' }]}
          onPress={() => {
            onOpenChange(false);
            onResume();
          }}
        >
          <Text style={styles.buttonText}>Resume Game</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { backgroundColor: '#dc143c' }]}
          onPress={() => {
            onOpenChange(false);
            onEndGame();
          }}
        >
          <Text style={styles.buttonText}>End Game</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

**Alternative using Tamagui Sheet** (from RESEARCH.md):
```typescript
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

---

## Shared Patterns

### Zustand Persist Middleware Pattern
**Source:** `stores/gameStore.ts`, `stores/questionStore.ts`
**Apply to:** `stores/playerStore.ts`

**Basic pattern (gameStore.ts lines 32-34, 187-191):**
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useStore = create<StoreType>()(
  persist(
    (set, get) => ({
      // state and actions
    }),
    {
      name: 'storage-key',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**With Set serialization (questionStore.ts lines 108-119) — NOT needed for playerStore:**
```typescript
{
  name: 'trivial-world-questions',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    askedQuestions: [...state.askedQuestions],
  }),
  onRehydrateStorage: () => (state) => {
    if (state) {
      state.askedQuestions = new Set(state.askedQuestions as unknown as string[]);
    }
  },
}
```

### Theme Pattern (Tamagui)
**Source:** All components use `useTheme()` hook
**Apply to:** All new components

```typescript
import { useTheme } from 'tamagui';

export function Component() {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.background?.val as string }}>
      <Text style={{ color: theme.color?.val as string }}>Text</Text>
    </View>
  );
}
```

### Cross-Store Reference Pattern
**Source:** `stores/gameStore.ts` lines 7-8, 49-52
**Apply to:** Any action that needs data from another store

```typescript
import { useQuestionStore } from './questionStore';
import { usePlayerStore } from './playerStore';

// In an action:
startGame: () => {
  useQuestionStore.getState().resetAskedQuestions();
  usePlayerStore.getState().resetWedges();
  // ...
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | | | All files have analogs |

---

## Metadata

**Analog search scope:**
- `stores/*.ts` — Zustand store patterns
- `app/*.tsx` — Screen/layout patterns
- `app/game/*.tsx` — Game flow patterns
- `components/*.tsx` — UI component patterns

**Files scanned:** 12
**Pattern extraction date:** 2026-06-08

**Key patterns identified:**
- Zustand persist middleware wraps `create()` call with AsyncStorage storage
- playerStore needs persist but does NOT need Set serialization (uses simple arrays)
- Home screen uses `useTheme()` and `useRouter()` hooks from Tamagui and Expo Router
- Components use `View`, `Text`, `Pressable` from react-native with `StyleSheet.create()`
- Cross-store references use `useStore.getState()` to access other stores synchronously