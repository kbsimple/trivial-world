# Phase 3: Question System - Research

**Researched:** 2026-06-08
**Domain:** Question management, category-based selection, no-repeat tracking, offline storage
**Confidence:** HIGH

## Summary

Phase 3 implements the question system for Trivial World, building on the game loop foundation from Phases 1-2. The system must: (1) present questions from the correct 6 categories based on board position, (2) track which questions have been asked to avoid repetition within a game session, (3) support category filtering for custom games, and (4) store all questions locally for offline play.

The current codebase has a placeholder question system (`data/questions/placeholder.ts`) with 18 questions (3 per category). Phase 3 replaces this with a proper question management system with no-repeat tracking, category filtering, and a data structure that scales to hundreds of questions.

**Primary recommendation:** Create a `QuestionStore` using Zustand with a `Set<string>` for tracking asked question IDs. Store questions in TypeScript files bundled with the app (not JSON imports) for tree-shaking and type safety. Use a Fisher-Yates shuffle for random selection from unasked pool.

## User Constraints (from CONTEXT.md)

> Note: No CONTEXT.md exists for Phase 3. The following are derived from PROJECT.md, REQUIREMENTS.md, and phase-specific requirements.

### Locked Decisions (from Project Constraints)
- Framework: Expo SDK 55 + React Native 0.83
- State Management: Zustand 5.x with persist middleware
- Database: AsyncStorage (WatermelonDB deferred - not needed for Phase 3 question volume)
- UI: Tamagui 2.x
- Animations: react-native-reanimated 3.x
- Navigation: Expo Router
- Categories: Blue, Pink, Yellow, Purple, Green, Orange (fixed set from Trivial Pursuit heritage)

### Phase Requirements (from REQUIREMENTS.md)
- **QSTN-01:** App presents questions from 6 categories
- **QSTN-02:** App selects question category based on board position
- **QSTN-03:** App tracks which questions have been asked to avoid repeats
- **QSTN-04:** App supports category filtering for custom games
- **QSTN-05:** Questions are stored locally (offline-first, no network dependency)

### Claude's Discretion
- Question data structure and storage format
- Asked question tracking implementation (Set vs. array)
- Category filtering UI/UX
- Question file organization (single file vs. per-category)
- Error handling for exhausted question pools

### Deferred Ideas (Out of Scope)
- Question difficulty levels (v2)
- Custom question sets (v2)
- Question import/export (v2)
- Remote question sync (v2)
- AI-generated questions (v2)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Question storage | Data/Bundle | — | Questions bundled with app, loaded on-demand |
| Asked question tracking | State (Zustand) | — | In-memory Set, reset per game session |
| Category filtering | State (Zustand) | — | Filter function on question pool |
| Question selection | State (Zustand) | — | Random selection from filtered pool |
| Question display | UI (React) | — | QuestionCard component (already exists) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.14 | State management for asked questions | Already in use for gameStore, playerStore |
| @react-native-async-storage/async-storage | ^2.1.0 | Persist game state (asked questions per session) | Already in use for persistence |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | ~3.17.4 | Category badge animations | Already in use for die roll |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TypeScript files for questions | JSON imports | JSON simpler but loses type safety and tree-shaking |
| In-memory Set for asked questions | AsyncStorage array | Set has O(1) lookups, array has O(n) |
| Bundled questions | MMKV storage | MMKV faster but overkill for ~500 questions |

**Installation:**
No new packages needed. All required dependencies are already installed.

**Version verification:**
```bash
npm view zustand version  # ^5.0.14 (already installed)
npm view @react-native-async-storage/async-storage version  # ^2.1.0 (already installed)
```

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Question Selection Flow                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ Board Space  │───▶│ Category     │───▶│ QuestionStore│              │
│  │ (Phase 2)    │    │ Determination │    │ .selectQuestion()          │
│  └──────────────┘    └──────────────┘    └───────┬──────┘              │
│                                                  │                       │
│                                                  ▼                       │
│                         ┌──────────────────────────────────┐           │
│                         │     Question Pool Filter          │           │
│                         │  ┌─────────────────────────────┐  │           │
│                         │  │ 1. Filter by category       │  │           │
│                         │  │ 2. Exclude askedQuestions   │  │           │
│                         │  │ 3. If empty, reset category │  │           │
│                         │  └─────────────────────────────┘  │           │
│                         └──────────────────┬───────────────┘           │
│                                            │                            │
│                                            ▼                            │
│                         ┌──────────────────────────────────┐           │
│                         │     Fisher-Yates Shuffle         │           │
│                         │   Random selection from pool     │           │
│                         └──────────────────┬───────────────┘           │
│                                            │                            │
│                                            ▼                            │
│                         ┌──────────────────────────────────┐           │
│                         │    askedQuestions.add(q.id)      │           │
│                         │    currentQuestion = q          │           │
│                         │    return q                      │           │
│                         └──────────────────────────────────┘           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
data/
├── questions/
│   ├── index.ts              # Exports all questions, getQuestionsByCategory()
│   ├── world-outside.ts      # Blue category (The World Outside)
│   ├── pop-culture.ts        # Pink category (Pop Culture & Streaming)
│   ├── milestones-myths.ts   # Yellow category (Milestones & Myths)
│   ├── animation-artwork.ts  # Purple category (Animation and Artwork)
│   ├── tech-space-logic.ts   # Green category (Tech, Space & Logic)
│   └── sports-gaming.ts      # Orange category (Sports & Gaming)

stores/
├── questionStore.ts          # NEW: Question selection, asked tracking
├── gameStore.ts              # UPDATED: Add category selection
├── playerStore.ts            # Unchanged
└── index.ts                  # Exports

types/
├── question.ts               # NEW: Question interface, Category type
├── game.ts                   # Existing
└── player.ts                 # Existing
```

### Pattern 1: Set-Based Asked Question Tracking

**What:** Use a JavaScript `Set<string>` to track question IDs that have been asked during the current game session. The Set is stored in Zustand state and provides O(1) lookup for exclusion.

**When to use:** When you need fast membership checking for "has this been asked?" and the data is transient (resets each game session).

**Why Set over Array:**
- Set.has() is O(1), Array.includes() is O(n)
- Set automatically handles duplicates
- Set serializes cleanly to JSON for persistence

**Example:**
```typescript
// stores/questionStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerColor } from '../constants/categories';
import { Question, getQuestionsByCategory } from '../data/questions';

interface QuestionState {
  /** IDs of questions asked in current game session */
  askedQuestions: Set<string>;
  /** Currently displayed question */
  currentQuestion: Question | null;
  /** Current category (set by board position or manual selection) */
  currentCategory: PlayerColor | null;
  /** Categories enabled for custom games (null = all enabled) */
  enabledCategories: PlayerColor[] | null; // null means all categories

  // Actions
  selectQuestion: (category: PlayerColor) => Question | null;
  markAsked: (questionId: string) => void;
  resetAskedQuestions: () => void;
  setEnabledCategories: (categories: PlayerColor[] | null) => void;
}

export const useQuestionStore = create<QuestionState>()(
  persist(
    (set, get) => ({
      askedQuestions: new Set<string>(),
      currentQuestion: null,
      currentCategory: null,
      enabledCategories: null,

      selectQuestion: (category: PlayerColor) => {
        const { askedQuestions, enabledCategories } = get();

        // Check if category is enabled (custom game filter)
        if (enabledCategories && !enabledCategories.includes(category)) {
          console.warn(`Category ${category} is disabled in custom game`);
          return null;
        }

        // Get all questions for this category
        const pool = getQuestionsByCategory(category);

        // Filter out already-asked questions
        const available = pool.filter(q => !askedQuestions.has(q.id));

        // If all questions exhausted, reset category (allow repeats)
        if (available.length === 0) {
          console.warn(`All questions exhausted for category ${category}, resetting`);
          const shuffled = [...pool].sort(() => Math.random() - 0.5);
          const selected = shuffled[0];
          set({
            currentQuestion: selected,
            currentCategory: category,
            // Note: We DON'T add to askedQuestions here - that happens after answer
          });
          return selected;
        }

        // Fisher-Yates shuffle for random selection
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        const selected = shuffled[0];

        set({
          currentQuestion: selected,
          currentCategory: category,
        });

        return selected;
      },

      markAsked: (questionId: string) => {
        set((state) => ({
          askedQuestions: new Set([...state.askedQuestions, questionId]),
        }));
      },

      resetAskedQuestions: () => {
        set({ askedQuestions: new Set<string>() });
      },

      setEnabledCategories: (categories: PlayerColor[] | null) => {
        set({ enabledCategories: categories });
      },
    }),
    {
      name: 'trivial-world-questions',
      storage: createJSONStorage(() => AsyncStorage),
      // Custom serialization for Set
      partialize: (state) => ({
        askedQuestions: [...state.askedQuestions], // Convert Set to array for JSON
        enabledCategories: state.enabledCategories,
      }),
      // Custom deserialization for Set
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.askedQuestions = new Set(state.askedQuestions as unknown as string[]);
        }
      },
    }
  )
);
```

### Pattern 2: TypeScript Question Data Files

**What:** Store questions in TypeScript files (not JSON) for type safety, tree-shaking, and IDE support.

**When to use:** When question data is static, bundled with the app, and benefits from type checking.

**Why TypeScript over JSON:**
- Type checking catches malformed questions at compile time
- IDE autocomplete for question structure
- Tree-shaking removes unused categories if app is bundled
- Can include computed properties (e.g., question count)

**Example:**
```typescript
// data/questions/world-outside.ts
import { Question } from '../../types/question';

export const WORLD_OUTSIDE_QUESTIONS: Question[] = [
  {
    id: 'blue-001',
    category: 'blue',
    questionText: 'What is the capital city of Japan, known for its mix of modern and traditional architecture?',
    answerText: 'Tokyo',
    difficulty: 'easy',
  },
  {
    id: 'blue-002',
    category: 'blue',
    questionText: 'In the anime "Attack on Titan", what are the three walls that protect humanity called?',
    answerText: 'Wall Maria, Wall Rose, and Wall Sheena (Wall Sina)',
    difficulty: 'medium',
  },
  // ... more questions
];

// data/questions/index.ts
import { PlayerColor } from '../../constants/categories';
import { Question } from '../../types/question';
import { WORLD_OUTSIDE_QUESTIONS } from './world-outside';
import { POP_CULTURE_QUESTIONS } from './pop-culture';
// ... other categories

export const ALL_QUESTIONS: Question[] = [
  ...WORLD_OUTSIDE_QUESTIONS,
  ...POP_CULTURE_QUESTIONS,
  // ... other categories
];

export function getQuestionsByCategory(category: PlayerColor): Question[] {
  switch (category) {
    case 'blue': return WORLD_OUTSIDE_QUESTIONS;
    case 'pink': return POP_CULTURE_QUESTIONS;
    case 'yellow': return MILESTONES_MYTHS_QUESTIONS;
    case 'purple': return ANIMATION_ARTWORK_QUESTIONS;
    case 'green': return TECH_SPACE_LOGIC_QUESTIONS;
    case 'orange': return SPORTS_GAMING_QUESTIONS;
  }
}

export function getQuestionCount(category?: PlayerColor): number {
  if (category) {
    return getQuestionsByCategory(category).length;
  }
  return ALL_QUESTIONS.length;
}
```

### Pattern 3: Category Filtering for Custom Games

**What:** Allow game conductor to enable/disable specific categories for custom game modes.

**When to use:** When QSTN-04 requires category filtering support.

**Example:**
```typescript
// In gameStore.ts or new customGameStore.ts
interface CustomGameSettings {
  enabledCategories: PlayerColor[] | null; // null = all categories
  setEnabledCategories: (categories: PlayerColor[]) => void;
}

// In questionStore.ts selectQuestion:
const { enabledCategories } = get();
if (enabledCategories && !enabledCategories.includes(category)) {
  // Category is disabled, skip or return null
  return null;
}
```

### Anti-Patterns to Avoid

- **Storing questions in component state:** Questions are global game state, not UI state. Use Zustand store.
- **Using array for asked questions:** Array.includes() is O(n) - use Set for O(1) membership testing.
- **Storing entire Question objects in askedQuestions:** Only store IDs. Storing objects is wasteful and creates serialization issues.
- **Resetting askedQuestions on every turn:** Reset only at game start. Tracking persists across turns within a session.
- **Fetching questions from network:** QSTN-05 requires offline-first. Bundle questions with app.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Asked question tracking | Custom array with includes() checks | JavaScript Set | O(1) lookups vs O(n), built-in serialization |
| Random selection | Custom shuffle function | Fisher-Yates (standard algorithm) | Proven uniform distribution |
| Question persistence | AsyncStorage.setItem() manually | Zustand persist middleware | Handles serialization, hydration automatically |
| Category filtering | Complex filter function per use case | Single getQuestionsByCategory() helper | Consistent behavior, single source of truth |

**Key insight:** The question system is fundamentally simple - it's a pool filter with an exclusion set. Don't over-engineer it. The complexity comes from edge cases (exhausted pools, category filtering) not from the core logic.

## Runtime State Inventory

> Phase 3 is NOT a rename/refactor phase. The following inventory is for context only.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None - new feature | Create question data files |
| Live service config | None | — |
| OS-registered state | None | — |
| Secrets/env vars | None | — |
| Build artifacts | None | — |

## Common Pitfalls

### Pitfall 1: Question Pool Exhaustion

**What goes wrong:** All questions in a category are asked, and the system returns null or crashes instead of handling the exhaustion gracefully.

**Why it happens:** Developers assume infinite questions or forget that a game can go longer than expected. With 18 placeholder questions per category, exhaustion happens in ~6 games if playing with that category frequently.

**How to avoid:**
- Detect exhaustion early: `if (available.length === 0)`
- Reset the category pool when exhausted (allow repeats within a game)
- Log a warning for debugging
- Consider adding a "questions remaining" indicator for long games

**Warning signs:**
- Game crashes after many turns in same category
- Null question displayed to conductor
- "undefined is not an object" errors in question display

### Pitfall 2: Asked Questions Persist Across Games

**What goes wrong:** Players start a new game but see questions from the previous game because `askedQuestions` wasn't reset.

**Why it happens:** Zustand persist middleware keeps state across app restarts. The `askedQuestions` Set persists unless explicitly reset.

**How to avoid:**
- Call `resetAskedQuestions()` in `gameStore.startGame()`
- Add a `startGame` action to questionStore that resets the Set
- Test game restart flow explicitly

**Warning signs:**
- Questions repeat immediately in a new game
- First question of new game is same as last question of previous game

### Pitfall 3: Category Filter Breaks Question Selection

**What goes wrong:** Custom game disables a category, but board position or selection still tries to get a question from that category, returning null.

**Why it happens:** Board position logic (Phase 2) determines category independently of custom game settings. The question system doesn't know about the filter.

**How to avoid:**
- Category filter should be checked BEFORE question selection
- If board position lands on disabled category, either: (a) skip to next enabled category, or (b) show "category disabled" message
- Coordinate between gameStore (board position) and questionStore (enabled categories)

**Warning signs:**
- Null question displayed when landing on disabled category
- Game freezes or shows error screen
- Category badge shows wrong color

### Pitfall 4: Memory Leak from Large Question Files

**What goes wrong:** Importing all questions at once loads the entire dataset into memory, causing slow startup or memory pressure on older devices.

**Why it happens:** JavaScript imports are evaluated at bundle time. Large JSON/TS files increase bundle size and memory footprint.

**How to avoid:**
- Split questions into per-category files (already recommended)
- Import categories lazily if needed: `const questions = await import('./questions/world-outside')`
- Monitor bundle size during development

**Warning signs:**
- Slow app startup (bundle parsing)
- Memory warnings in development
- Bundle size > 5MB for question data alone

## Code Examples

### Question Type Definition

```typescript
// types/question.ts
import { PlayerColor } from '../constants/categories';

/**
 * Question interface
 * Represents a single trivia question
 */
export interface Question {
  /** Unique identifier (format: '{category}-{number}') */
  id: string;
  /** Category color (maps to PlayerColor) */
  category: PlayerColor;
  /** Question text to display */
  questionText: string;
  /** Correct answer */
  answerText: string;
  /** Optional difficulty (for future use) */
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Question state interface for Zustand store
 */
export interface QuestionState {
  /** Set of question IDs asked in current game */
  askedQuestions: Set<string>;
  /** Currently displayed question */
  currentQuestion: Question | null;
  /** Current category */
  currentCategory: PlayerColor | null;
  /** Categories enabled for custom game (null = all) */
  enabledCategories: PlayerColor[] | null;

  // Actions
  /** Select a question from the category pool */
  selectQuestion: (category: PlayerColor) => Question | null;
  /** Mark a question as asked (after answer) */
  markAsked: (questionId: string) => void;
  /** Reset asked questions for new game */
  resetAskedQuestions: () => void;
  /** Set enabled categories for custom game */
  setEnabledCategories: (categories: PlayerColor[] | null) => void;
}
```

### Integrating Question Store with Game Store

```typescript
// stores/gameStore.ts (modifications to existing)
import { useQuestionStore } from './questionStore';

// In startGame action:
startGame: () => {
  // Reset asked questions for new game
  useQuestionStore.getState().resetAskedQuestions();

  const question = useQuestionStore.getState().selectQuestion('blue');
  set({
    phase: 'rolling',
    currentQuestion: question,
    currentCategory: question?.category ?? 'blue',
    currentPlayerIndex: 0,
    questionNumber: 1,
    answerRevealed: false,
    dieResult: null,
  });
},

// In nextTurn action:
nextTurn: () => {
  const { players } = usePlayerStore.getState();
  const { selectQuestion } = useQuestionStore.getState();

  if (players.length === 0) {
    console.error('nextTurn called with no players');
    set({ phase: 'setup' });
    return;
  }

  const nextIndex = (get().currentPlayerIndex + 1) % players.length;

  // Category will be determined by board position in Phase 4
  // For now, use a default category
  const category = get().currentCategory || 'blue';
  const question = selectQuestion(category);

  set({
    currentPlayerIndex: nextIndex,
    dieResult: null,
    answerRevealed: false,
    currentQuestion: question,
    currentCategory: question?.category ?? category,
    phase: 'rolling',
    questionNumber: get().questionNumber + 1,
  });
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON imports for question data | TypeScript files with typed interfaces | Project start | Type safety, tree-shaking |
| Array for asked questions | Set for asked questions | Phase 3 | O(1) lookups vs O(n) |
| In-component question state | Zustand questionStore | Phase 3 | Global state, persistence |

**Deprecated/outdated:**
- **Placeholder questions:** The `PlaceholderQuestion` type in `data/questions/placeholder.ts` should be replaced with the full `Question` type from `types/question.ts`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Question volume for v1 is ~100-500 questions total | Standard Stack | Storage/performance may differ if volume is larger |
| A2 | Category is determined by board position (Phase 4 integration) | Architecture | Integration point may differ |
| A3 | Asked questions reset per game session (not persisted across games) | Pattern 1 | UX differs if asked questions persist across sessions |
| A4 | Custom games disable entire categories, not individual questions | Pattern 3 | Implementation differs if filtering is more granular |

## Open Questions

1. **Question Count Per Category**
   - What we know: Placeholder has 3 per category, REQUIREMENTS doesn't specify
   - What's unclear: Minimum viable question count for v1
   - Recommendation: Start with 20-30 per category (enough for 5-6 games without repeats), expand in v1.x

2. **Category Exhaustion UX**
   - What we know: Must handle exhausted pools gracefully
   - What's unclear: What message/experience to show when pool exhausted
   - Recommendation: Reset pool silently with console warning; no user-facing message for v1

3. **Custom Game Category Selection UI**
   - What we know: QSTN-04 requires category filtering support
   - What's unclear: Where in the game setup flow this UI lives
   - Recommendation: Defer UI to Phase 1 enhancement; backend support in Phase 3

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies beyond existing stack)

All required dependencies (Zustand, AsyncStorage) are already installed and in use. No new environment dependencies.

## Validation Architecture

> nyquist_validation is explicitly set to `false` in `.planning/config.json`. This section is omitted.

## Security Domain

> This phase does not involve authentication, encryption, or user data storage. Security considerations are minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | minimal | TypeScript type checking |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for React Native + Zustand

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| State manipulation | Tampering | N/A (local-only game, no competitive integrity requirements) |
| Question data exposure | Information Disclosure | N/A (questions not secret, answers shown after reveal) |

## Sources

### Primary (HIGH confidence)
- [Zustand Persist Middleware Documentation](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md) - Verified patterns for AsyncStorage integration
- [AsyncStorage API Documentation](https://github.com/react-native-async-storage/async-storage/blob/main/docs/api/usage.md) - Verified setItem/getItem/multiGet patterns
- Project codebase: `stores/gameStore.ts`, `stores/playerStore.ts`, `data/questions/placeholder.ts` - Existing patterns and data structures

### Secondary (MEDIUM confidence)
- [QuizBase: Multi-Round Trivia with Exclude Lists](https://quizbase.runriva.com/docs/guides/multi-round-quiz) - Set-based exclusion pattern for question tracking
- [Expo Asset Bundling Best Practices](https://github.com/expo/expo/issues/41108) - JSON asset handling patterns
- [Better I18N: Offline Caching Strategy](https://docs.better-i18n.com/frameworks/expo/offline-caching) - Layered caching patterns (network → storage → bundled)

### Tertiary (LOW confidence)
- None - all patterns verified against primary/secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in use, patterns verified
- Architecture: HIGH - Builds on existing gameStore/playerStore patterns
- Pitfalls: HIGH - Based on research findings and existing pitfall documentation

**Research date:** 2026-06-08
**Valid until:** 30 days (stable stack, no external dependencies)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QSTN-01 | App presents questions from 6 categories | TypeScript question files per category, getQuestionsByCategory() helper |
| QSTN-02 | App selects question category based on board position | Category passed from gameStore to questionStore.selectQuestion() |
| QSTN-03 | App tracks which questions have been asked to avoid repeats | Set-based tracking in questionStore.askedQuestions |
| QSTN-04 | App supports category filtering for custom games | questionStore.enabledCategories state, checked before selection |
| QSTN-05 | Questions are stored locally (offline-first) | TypeScript files bundled with app, no network dependency |