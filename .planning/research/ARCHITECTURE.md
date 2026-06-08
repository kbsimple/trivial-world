# Architecture Research

**Domain:** Mobile trivia game (local, pass-and-play)
**Researched:** 2026-06-08
**Confidence:** HIGH

## Standard Architecture

### System Overview

Trivial World is a **local-first mobile trivia game** with no backend dependency. The architecture follows a **unidirectional data flow** pattern with Zustand for state management, optimized for offline play and simple state persistence.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           UI Layer (Expo Router)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Home Screen │  │ Game Screen │  │ Results     │  │ Settings   │ │
│  │ (index.tsx) │  │ (game.tsx)  │  │ (results)   │  │ (settings) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
├─────────┴────────────────┴────────────────┴────────────────┴────────┤
│                        Navigation Layer (Expo Router Stack)        │
├─────────────────────────────────────────────────────────────────────┤
│                      State Management (Zustand Slices)              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ GameSlice  │  │ PlayerSlice│  │QuestionSlice│  │ SettingsSlice│ │
│  │ (session)  │  │ (participants)│ (content) │  │ (preferences)│ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘  │
├────────┴────────────────┴────────────────┴────────────────┴─────────┤
│                      Persistence Layer (AsyncStorage)               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Game State Store │  │ Questions Cache │  │ User Preferences  │  │
│  │ (session resume) │  │ (offline play)  │  │ (theme, sound)    │  │
│  └──────────────────┘  └──────────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **UI Screens** | Present state, capture user input | React Native components via Expo Router |
| **Navigation** | Manage screen transitions, deep linking | Expo Router file-based routing |
| **Game Slice** | Game session state, turn order, phase, die roll | Zustand store with persist middleware |
| **Player Slice** | Participant names, scores, category progress | Zustand store slice |
| **Question Slice** | Current question, answered questions, category | Zustand store slice |
| **Settings Slice** | User preferences (sound, haptics, theme) | Zustand store with persist |
| **Persistence** | Save/load game state for resume | AsyncStorage via Zustand persist |

## Recommended Project Structure

```
src/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx              # Root layout with Stack navigator
│   ├── index.tsx                # Home screen (new game, resume)
│   ├── game/
│   │   ├── _layout.tsx          # Game flow layout
│   │   ├── roll.tsx             # Die roll screen
│   │   ├── move.tsx             # Move selection screen
│   │   ├── question.tsx         # Question display screen
│   │   └── score.tsx            # Score update screen
│   ├── results.tsx              # End game results
│   └── settings.tsx             # App settings
├── components/                  # Reusable UI components
│   ├── Die.tsx                  # Die roll animation component
│   ├── Board.tsx                # Game board visualization
│   ├── QuestionCard.tsx         # Question display with category
│   ├── PlayerScore.tsx          # Individual player score display
│   ├── CategoryProgress.tsx     # Visual category completion
│   └── Button.tsx               # Themed button component
├── stores/                      # Zustand state slices
│   ├── gameStore.ts             # Game session state + actions
│   ├── playerStore.ts           # Player management state
│   ├── questionStore.ts         # Question delivery state
│   ├── settingsStore.ts         # App preferences
│   └── index.ts                 # Combined store exports
├── services/                    # Business logic services
│   ├── dice.ts                  # Die roll logic (random)
│   ├── questions.ts             # Question selection/filtering
│   ├── scoring.ts               # Scoring rules engine
│   └── moves.ts                 # Valid move calculation
├── data/                        # Static game content
│   ├── questions/               # Question packs by category
│   │   ├── world-outside.ts     # Blue category questions
│   │   ├── pop-culture.ts       # Pink category questions
│   │   ├── history.ts          # Yellow category questions
│   │   ├── art-animation.ts    # Purple category questions
│   │   ├── tech-space.ts       # Green category questions
│   │   └── sports-gaming.ts     # Orange category questions
│   └── board.ts                 # Board configuration (spaces)
├── types/                       # TypeScript definitions
│   ├── game.ts                  # Game state types
│   ├── player.ts                # Player types
│   ├── question.ts              # Question types
│   └── navigation.ts            # Navigation param types
├── hooks/                       # Custom React hooks
│   ├── useGameSession.ts        # Game lifecycle management
│   ├── useDieRoll.ts           # Die roll with animation
│   └── useQuestionDelivery.ts   # Question selection logic
├── utils/                       # Helper functions
│   ├── storage.ts              # AsyncStorage wrappers
│   ├── random.ts                # Seeded random for testing
│   └── animations.ts            # Reanimated presets
└── constants/                   # App constants
    ├── categories.ts            # Category definitions
    ├── colors.ts                # Theme colors
    └── config.ts                # Game configuration
```

### Structure Rationale

- **app/**: Expo Router convention for file-based routing - each file becomes a screen
- **components/**: UI-only components that receive state via props, dispatch actions via callbacks
- **stores/**: Zustand slices with clear separation - each slice owns its domain
- **services/**: Pure functions for game logic (dice, scoring) - testable without UI
- **data/**: Static question content bundled with app for offline play
- **types/**: TypeScript interfaces for compile-time safety
- **hooks/**: Reusable stateful logic that bridges stores and components

## Architectural Patterns

### Pattern 1: Unidirectional State Flow

**What:** All state changes flow through Zustand stores. Components subscribe to store state and dispatch actions. No direct state mutation.

**When to use:** Always - this is the core pattern for predictable game state.

**Trade-offs:**
- Pros: Predictable state transitions, easy debugging, testable, time-travel capable
- Cons: Slightly more boilerplate than local state for simple cases

**Example:**
```typescript
// stores/gameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  phase: 'setup' | 'rolling' | 'moving' | 'answering' | 'scoring' | 'finished';
  currentPlayerIndex: number;
  turnCount: number;
  startGame: () => void;
  rollDie: () => number;
  selectMove: (spaceId: string) => void;
  answerQuestion: (correct: boolean) => void;
  nextTurn: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      phase: 'setup',
      currentPlayerIndex: 0,
      turnCount: 0,
      startGame: () => set({ phase: 'rolling', turnCount: 1 }),
      rollDie: () => Math.floor(Math.random() * 6) + 1,
      selectMove: (spaceId) => set({ phase: 'answering' }),
      answerQuestion: (correct) => set({ phase: 'scoring' }),
      nextTurn: () => set((state) => ({
        phase: 'rolling',
        currentPlayerIndex: (state.currentPlayerIndex + 1) % getPlayerCount(),
        turnCount: state.turnCount + 1,
      })),
    }),
    { name: 'trivial-world-game' }
  )
);
```

### Pattern 2: Slices Pattern for Modular State

**What:** Break Zustand store into domain-specific slices that can reference each other for cross-domain actions.

**When to use:** When game state has clear boundaries (game, players, questions, settings).

**Trade-offs:**
- Pros: Organized code, easier testing, can develop slices independently
- Cons: Cross-slice actions require understanding dependencies

**Example:**
```typescript
// stores/gameStore.ts - Main slice
interface GameSlice {
  phase: GamePhase;
  currentPlayerIndex: number;
  startGame: () => void;
  endTurn: () => void;
}

// stores/playerStore.ts - Player slice
interface PlayerSlice {
  players: Player[];
  addPlayer: (name: string) => void;
  updateScore: (playerId: string, points: number) => void;
}

// stores/index.ts - Combined with cross-slice actions
const useGameStore = create<GameSlice & PlayerSlice & QuestionSlice>()(
  persist(
    (...a) => ({
      ...createGameSlice(...a),
      ...createPlayerSlice(...a),
      ...createQuestionSlice(...a),
      // Cross-slice action
      answerCorrectly: () => {
        const { currentPlayerIndex } = get();
        const { updateScore } = get();
        const { markAnswered } = get();
        updateScore(currentPlayerIndex, 1);
        markAnswered();
      },
    }),
    { name: 'trivial-world' }
  )
);
```

### Pattern 3: State Machine for Game Phases

**What:** Game progresses through defined phases with explicit transitions. Each phase has valid entry/exit states.

**When to use:** Turn-based games with clear phase boundaries (rolling, moving, answering, scoring).

**Trade-offs:**
- Pros: Impossible invalid states, clear debugging, easy to add new phases
- Cons: More upfront design, requires discipline to maintain

**Example:**
```typescript
// types/game.ts
type GamePhase =
  | 'setup'        // Adding players, configuring game
  | 'rolling'      // Current player about to roll
  | 'moving'       // Die rolled, selecting move
  | 'answering'    // Question presented, awaiting answer
  | 'scoring'      // Answer processed, updating score
  | 'finished';    // Game complete

// Valid transitions
const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  setup: ['rolling'],
  rolling: ['moving'],
  moving: ['answering'],
  answering: ['scoring'],
  scoring: ['rolling', 'finished'],  // Next turn or game end
  finished: [],
};

// In store
transitionTo: (newPhase: GamePhase) => {
  const current = get().phase;
  if (!VALID_TRANSITIONS[current].includes(newPhase)) {
    throw new Error(`Invalid transition: ${current} -> ${newPhase}`);
  }
  set({ phase: newPhase });
}
```

### Pattern 4: Local-First with Persistence

**What:** All game state lives locally. Persistence is automatic via Zustand persist middleware. No network required.

**When to use:** Offline-capable apps, pass-and-play local multiplayer (Trivial World's model).

**Trade-offs:**
- Pros: Works offline, instant load, no backend cost, privacy-by-design
- Cons: No cross-device sync (future feature would need backend), storage limits

**Example:**
```typescript
// stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSound: () => void;
  toggleHaptics: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      theme: 'system',
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'trivial-world-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## Data Flow

### Game Session Flow

```
[User: Start Game]
        ↓
[GameStore: Initialize session] → [PlayerStore: Load participants]
        ↓
[GameStore: phase = 'rolling']
        ↓
[User: Tap Roll]
        ↓
[Die Component: Animation] → [GameStore: rollDie() returns 1-6]
        ↓
[GameStore: phase = 'moving'] → [Board Component: Highlight valid moves]
        ↓
[User: Select move]
        ↓
[GameStore: phase = 'answering'] → [QuestionStore: Select question for category]
        ↓
[User: Answer question]
        ↓
[GameStore: phase = 'scoring'] → [PlayerStore: updateScore() if correct]
        ↓
[Check: Game complete?] ──No──→ [GameStore: nextTurn(), phase = 'rolling']
        │
       Yes
        ↓
[GameStore: phase = 'finished'] → [Navigate to Results Screen]
```

### State Management Flow

```
[User Interaction]
        ↓
[Component calls store action]
        ↓
[Zustand store updates state]
        ↓
[Persist middleware writes to AsyncStorage]
        ↓
[Subscribed components re-render with new state]
```

### Key Data Flows

1. **Game Initialization:** User taps "New Game" → PlayerStore.addPlayer() for each participant → GameStore.startGame() → Navigate to game screen
2. **Turn Cycle:** Roll → Move → Answer → Score → Next player (loop until game end condition)
3. **Question Selection:** Space category determines question pool → QuestionStore filters unasked questions → Random selection → Present to conductor
4. **Score Tracking:** Correct answer → PlayerStore.updateScore(playerId, category) → Check win condition → Either continue or end game
5. **Game Resume:** App launch → AsyncStorage rehydration → GameStore detects in-progress game → Prompt resume or new game

## Scalability Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **Local MVP (current)** | Zustand + AsyncStorage is sufficient. All state local, no sync needed. |
| **Local + Cloud Sync** | Add backend sync layer. Use Zustand with `onRehydrateStorage` callback. Consider Supabase or Firebase for realtime. |
| **Online Multiplayer** | Major architectural shift needed. Server-authoritative state, WebSocket sync, conflict resolution. See Research Implications below. |

### Scaling Priorities

1. **First bottleneck:** Question content size. Bundle all questions initially. At 500+ questions, consider lazy-loading packs or remote content.
2. **Second bottleneck:** Game state complexity. If adding power-ups, achievements, or multiplayer, split stores further and consider XState for complex state machines.

## Anti-Patterns

### Anti-Pattern 1: Storing Questions in Component State

**What people do:** Load questions into a component's `useState` and manage selection there.

**Why it's wrong:** Questions need to persist across screens, be filtered globally, and survive app restarts. Component state is lost on navigation.

**Do this instead:** Questions live in QuestionStore with `askedQuestions` Set to prevent repeats. Components dispatch `selectQuestion(category)` actions.

### Anti-Pattern 2: Prop Drilling Game State

**What people do:** Pass game state through multiple component layers via props.

**Why it's wrong:** Every intermediate component re-renders when state changes. Deep prop drilling is brittle and hard to refactor.

**Do this instead:** Components subscribe directly to Zustand stores via hooks (`useGameStore(state => state.phase)`). Only subscribe to needed state slices.

### Anti-Pattern 3: Mixing UI State with Game State

**What people do:** Store animation state, scroll position, or modal visibility alongside game data.

**Why it's wrong:** UI state is transient and shouldn't persist. Game state should be serializable for save/resume.

**Do this instead:** Separate UI state (`useState` in components) from game state (Zustand stores with persistence). Use `partialize` in persist config to exclude transient fields.

### Anti-Pattern 4: Direct AsyncStorage Calls in Components

**What people do:** Call `AsyncStorage.getItem()` directly in components for ad-hoc persistence.

**Why it's wrong:** Scattered storage calls create inconsistent data, no single source of truth, hard to debug, and competing writes.

**Do this instead:** All persistence goes through Zustand persist middleware. One storage key per store slice. Rehydration handled automatically on app launch.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|-------------------|-------|
| **None (v1)** | Local-only | All data on device, no network dependency |
| **Future: Analytics** | Expo Analytics (optional) | Track game completion, question difficulty |
| **Future: Remote Questions** | REST API with local cache | Download question packs, cache offline |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **UI ↔ Stores** | Zustand hooks (useStore) | Components subscribe to specific state slices |
| **Stores ↔ Services** | Direct function calls | Services are pure functions, called from store actions |
| **Stores ↔ Persistence** | Zustand persist middleware | Automatic, transparent to store logic |
| **Navigation ↔ Stores** | React Navigation + Zustand | Navigation reads store state, stores trigger navigation via router |

## Build Order Implications

Based on the architecture research, the recommended build order is:

### Phase 1: Core Infrastructure
- Project setup with Expo + TypeScript
- Zustand store foundation with empty slices
- Expo Router navigation structure
- AsyncStorage persistence layer

### Phase 2: Game Loop Foundation
- Game state machine (phases, transitions)
- Player management (add, remove, reorder)
- Die roll logic and UI
- Basic navigation flow between screens

### Phase 3: Board & Movement
- Board data structure and configuration
- Move validation based on die roll
- Space-category mapping
- Visual board representation

### Phase 4: Question System
- Question data structure and storage
- Question selection logic (category, asked tracking)
- Question card component
- Answer handling and validation

### Phase 5: Scoring & Progress
- Score tracking per player per category
- Win condition detection (all 6 categories)
- Results screen
- Game resume functionality

### Phase 6: Polish & Settings
- Settings store (sound, haptics, theme)
- Animations and transitions
- Error boundaries
- Testing and edge cases

**Dependency rationale:**
1. **Infrastructure first:** Can't build stores or navigation without foundation
2. **Game loop before features:** Need core turn cycle working before adding questions or scoring
3. **Board before questions:** Movement logic determines which questions are needed
4. **Questions before scoring:** Need correct/incorrect outcomes to track progress
5. **Polish last:** UX improvements require functional foundation

## Sources

- [Expo Router Navigation Patterns](https://github.com/expo/expo) - Context7 documentation, HIGH confidence
- [Zustand State Management](https://github.com/pmndrs/zustand) - Context7 documentation, HIGH confidence
- [Game State Management Patterns](https://gamineai.com/blog/game-state-management-patterns-and-best-practices-for-complex-games) - Comprehensive patterns, HIGH confidence
- [Offline-First React Native Apps](https://dev.to/zidanegimiga/building-offline-first-applications-with-react-native-3626) - Storage patterns, MEDIUM confidence
- [Mudrava Quiz App Case Study](https://mudrava.com/en/projects/score-1000-points-cross-platform-multiplayer-quiz/) - Server-authoritative patterns (for future reference), MEDIUM confidence
- [Smoke or Fire Game Architecture](https://travelvient.com/blog/building-smoke-or-fire/) - Pure reducer patterns, MEDIUM confidence
- [Openturn Framework](https://github.com/openturn-io/openturn) - Turn-based game patterns, MEDIUM confidence
- [React Native Quiz Architectures](https://github.com/Jpoliachik/ignite-trivia) - Project structure patterns, MEDIUM confidence

---
*Architecture research for: Mobile trivia game (local, pass-and-play)*
*Researched: 2026-06-08*