# Phase 7: Question Generator Web App - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 15 new files
**Analogs found:** 13 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/generator/app/layout.tsx` | component | request-response | `apps/mobile/app/_layout.tsx` | exact |
| `apps/generator/app/page.tsx` | component | request-response | `apps/mobile/app/game/setup.tsx` | role-match |
| `apps/generator/app/review/page.tsx` | component | request-response | `apps/mobile/app/game/question.tsx` | role-match |
| `apps/generator/app/packs/page.tsx` | component | CRUD | `apps/mobile/app/game/setup.tsx` | role-match |
| `apps/generator/components/GeneratorForm.tsx` | component | form-input | `apps/mobile/components/QuestionCard.tsx` | partial |
| `apps/generator/components/VerificationProgress.tsx` | component | streaming | `apps/mobile/components/Die.tsx` | partial |
| `apps/generator/components/QuestionReviewCard.tsx` | component | form-input | `apps/mobile/components/QuestionCard.tsx` | role-match |
| `apps/generator/components/ConfidenceBadge.tsx` | component | display | `apps/mobile/components/CategoryBadge.tsx` | exact |
| `apps/generator/components/PackExporter.tsx` | component | file-I/O | No analog | none |
| `apps/generator/components/SettingsPanel.tsx` | component | form-input | `apps/mobile/app/game/setup.tsx` | role-match |
| `apps/generator/lib/ollama/client.ts` | service | request-response | No analog | none |
| `apps/generator/lib/ollama/prompts.ts` | utility | transform | No analog | none |
| `apps/generator/lib/ollama/verification.ts` | service | request-response | No analog | none |
| `apps/generator/lib/storage/local.ts` | utility | CRUD | `apps/mobile/stores/questionStore.ts` | data-flow-match |
| `apps/generator/hooks/useGenerator.ts` | hook | state-management | `apps/mobile/stores/gameStore.ts` | exact |
| `apps/generator/next.config.ts` | config | config | `apps/mobile/tamagui.config.ts` | role-match |
| `apps/generator/package.json` | config | config | `packages/types/package.json` | role-match |

## Pattern Assignments

### `apps/generator/app/layout.tsx` (component, request-response)

**Analog:** `apps/mobile/app/_layout.tsx`

**Imports pattern** (lines 1-5):
```typescript
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import config from '../tamagui.config';
```

**Provider wrapper pattern** (lines 14-27):
```typescript
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme="dark">
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
```

**Generator adaptation:**
- Replace `expo-router/Stack` with Next.js App Router layout
- Keep `TamaguiProvider` and `Theme` wrapper for consistent styling
- No `GestureHandlerRootView` needed for web

---

### `apps/generator/app/page.tsx` (component, request-response)

**Analog:** `apps/mobile/app/game/setup.tsx`

**Imports pattern** (lines 1-9):
```typescript
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { AddPlayerButton } from '../../components/AddPlayerButton';
import { CATEGORY_COLORS } from '../../constants/categories';
import type { PlayerColor } from '../../constants/categories';
```

**Component structure pattern** (lines 19-46):
```typescript
export default function SetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { players, addPlayer, removePlayer, updatePlayerName } = usePlayerStore();
  const { startGame } = useGameStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddPlayer = () => {
    if (players.length < 6) {
      addPlayer();
    }
  };

  const handleStartGame = () => {
    if (players.length > 0) {
      startGame();
      router.replace('/game/roll');
    }
  };
  // ... JSX
}
```

**Styling pattern** (lines 133-209):
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // ...
});
```

**Generator adaptation:**
- Replace `expo-router` with `next/navigation` (`useRouter`)
- Use generator-specific hooks (`useGenerator`, `usePacks`)
- Settings panel integrated into this page (per D-05)

---

### `apps/generator/components/ConfidenceBadge.tsx` (component, display)

**Analog:** `apps/mobile/components/CategoryBadge.tsx`

**Imports pattern** (lines 1-4):
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PlayerColor, CATEGORY_COLORS } from '../constants/categories';
import { CATEGORY_NAMES } from '../constants/categories';
```

**Badge component pattern** (lines 20-43):
```typescript
export function CategoryBadge({ category, size = '$3' }: CategoryBadgeProps) {
  const theme = useTheme();
  const backgroundColor = CATEGORY_COLORS[category];
  const categoryName = CATEGORY_NAMES[category];

  // Map Tamagui size tokens to font sizes
  const sizeMap: Record<string, number> = {
    '$1': 12,
    '$2': 14,
    '$3': 16,
    '$4': 18,
    '$5': 20,
  };

  const fontSize = sizeMap[size] || 16;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { fontSize }]}>
        {categoryName}
      </Text>
    </View>
  );
}
```

**Styles pattern** (lines 45-58):
```typescript
const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
```

**Generator adaptation:**
- Color based on confidence score: green (90-100%), yellow (67-89%), red (0-66%)
- Display confidence percentage and pass count
- Same Tamagui styling approach

---

### `apps/generator/components/QuestionReviewCard.tsx` (component, form-input)

**Analog:** `apps/mobile/components/QuestionCard.tsx`

**Imports pattern** (lines 1-5):
```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PlayerColor } from '../constants/categories';
import { CategoryBadge } from './CategoryBadge';
```

**Props interface pattern** (lines 6-18):
```typescript
interface QuestionCardProps {
  /** Question number (Q1, Q2, etc.) */
  questionNumber: number;
  /** Category color for badge */
  category: PlayerColor;
  /** Question text to display */
  questionText: string;
  /** Answer text (hidden until revealed) */
  answerText: string;
  /** Whether answer is currently revealed */
  revealed: boolean;
  /** Callback when user taps reveal button */
  onReveal: () => void;
}
```

**Component structure pattern** (lines 30-73):
```typescript
export function QuestionCard({
  questionNumber,
  category,
  questionText,
  answerText,
  revealed,
  onReveal,
}: QuestionCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Category Badge - D-10 */}
      <CategoryBadge category={category} size="$4" />

      {/* Question Number - D-11 */}
      <Text style={[styles.questionNumber, { color: theme.color?.val as string }]}>
        Q{questionNumber}
      </Text>

      {/* Question Text - D-09: 24pt minimum, centered */}
      <Text style={[styles.questionText, { color: theme.color?.val as string }]}>
        {questionText}
      </Text>

      {/* Answer Reveal Button or Answer Text - D-12 */}
      {revealed ? (
        <Text style={[styles.answerText, { color: theme.color?.val as string }]}>
          {answerText}
        </Text>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.revealButton,
            { backgroundColor: pressed ? '#444' : '#333' },
          ]}
          onPress={onReveal}
        >
          <Text style={styles.revealButtonText}>Reveal Answer</Text>
        </Pressable>
      )}
    </View>
  );
}
```

**Generator adaptation:**
- Add editable fields for questionText, answerText, difficulty
- Include verification pass results display
- Add Approve/Edit/Reject buttons instead of reveal

---

### `apps/generator/hooks/useGenerator.ts` (hook, state-management)

**Analog:** `apps/mobile/stores/gameStore.ts`

**Zustand store pattern** (lines 32-191):
```typescript
export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      phase: 'setup',
      currentPlayerIndex: 0,
      questionNumber: 1,
      answerRevealed: false,
      currentQuestion: null,
      currentCategory: null,
      dieResult: null,
      isCenterQuestion: false,
      winner: null,

      // Actions
      startGame: () => {
        useQuestionStore.getState().resetAskedQuestions();
        usePlayerStore.getState().resetWedges();
        const question = useQuestionStore.getState().selectQuestion('blue');

        set({
          phase: 'rolling',
          currentQuestion: question,
          currentCategory: question?.category ?? 'blue',
          currentPlayerIndex: 0,
          questionNumber: 1,
          answerRevealed: false,
          dieResult: null,
          isCenterQuestion: false,
          winner: null,
        });
      },

      // ... more actions
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Persist middleware pattern** (lines 116-131):
```typescript
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

**Generator adaptation:**
- Replace Zustand with React hooks (useGenerator pattern from RESEARCH.md)
- Use LocalStorage for persistence (not AsyncStorage)
- Store question queue, verification results, pack state
- See RESEARCH.md Pattern 4 for detailed hook implementation

---

### `apps/generator/lib/storage/local.ts` (utility, CRUD)

**Analog:** `apps/mobile/stores/questionStore.ts`

**State interface pattern** (lines 23-42):
```typescript
interface QuestionState {
  /** IDs of questions asked in current game session */
  askedQuestions: Set<string>;
  /** Currently displayed question */
  currentQuestion: Question | null;
  /** Current category */
  currentCategory: PlayerColor | null;
  /** Categories enabled for custom games (null = all enabled) */
  enabledCategories: PlayerColor[] | null;

  // Actions
  /** Select a question from category pool, excluding asked questions */
  selectQuestion: (category: PlayerColor) => Question | null;
  /** Mark a question as asked (call after answer) */
  markAsked: (questionId: string) => void;
  /** Reset asked questions for new game */
  resetAskedQuestions: () => void;
  /** Set enabled categories for custom game (null = all) */
  setEnabledCategories: (categories: PlayerColor[] | null) => void;
}
```

**Generator adaptation:**
- Use LocalStorage API instead of Zustand persist
- Store packs and approved questions
- Export pack validation using Zod schemas from `@trivial-world/types`

---

### `apps/generator/next.config.ts` (config, config)

**Analog:** `turbo.json` (monorepo config pattern)

**Config structure pattern:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "outputs": ["dist/**", ".expo/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

**Generator adaptation (from RESEARCH.md):**
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
```

---

### `apps/generator/package.json` (config, config)

**Analog:** `packages/types/package.json`

**Package structure pattern:**
```json
{
  "name": "@trivial-world/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    },
    "./json-schema": {
      "types": "./dist/json-schema.d.ts",
      "import": "./dist/json-schema.js",
      "require": "./dist/json-schema.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.8",
    "zod-to-json-schema": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "~6.0.3"
  }
}
```

**Generator package.json:**
- Use Next.js 16.x, Vercel AI SDK 6.x, ollama-ai-provider-v2
- Add `@trivial-world/types` as workspace dependency
- Include react-hook-form for review forms

---

## Shared Patterns

### Zod Schema Validation
**Source:** `packages/types/src/question-pack.ts`
**Apply to:** All question generation, validation, and export code
```typescript
import { z } from 'zod';
import { CategorySchema, DifficultySchema } from './category.js';

export const QuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Question ID must be URL-safe'),
  category: CategorySchema,
  questionText: z.string().min(10, 'Question text must be at least 10 characters').max(500),
  answerText: z.string().min(1, 'Answer text is required').max(200),
  difficulty: DifficultySchema.optional(),
  choices: z.array(z.string()).max(6).optional(),
  correctChoiceIndex: z.number().int().min(0).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  author: z.string().max(100).optional(),
  source: z.string().url().optional(),
});
```

### Tamagui Theme Pattern
**Source:** `apps/mobile/tamagui.config.ts`
**Apply to:** All generator components for consistent styling
```typescript
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
      blueCategory: '#0066cc',
      pinkCategory: '#ff69b4',
      yellowCategory: '#ffd700',
      purpleCategory: '#9932cc',
      greenCategory: '#228b22',
      orangeCategory: '#ff8c00',
    },
    light: {
      background: '#ffffff',
      color: '#1a1a2e',
      // ... same category colors
    },
  },
});
```

### Category Type Usage
**Source:** `packages/types/src/category.ts`
**Apply to:** All category selection and display in generator
```typescript
import { z } from 'zod';

export const CategorySchema = z.enum([
  'blue', 'pink', 'yellow', 'purple', 'green', 'orange',
]);
export type Category = z.infer<typeof CategorySchema>;

export const CATEGORY_NAMES: Record<Category, string> = {
  blue: 'The World Outside',
  pink: 'Pop Culture & Streaming',
  yellow: 'Milestones & Myths',
  purple: 'Animation and Artwork',
  green: 'Tech, Space & Logic',
  orange: 'Sports & Gaming',
};
```

### Monorepo Package Import Pattern
**Source:** `apps/mobile/package.json`
**Apply to:** Generator app importing shared types
```json
{
  "dependencies": {
    "@trivial-world/types": "workspace:*",
    // ... other dependencies
  }
}
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/generator/lib/ollama/client.ts` | service | request-response | No AI/LLM integration exists yet in codebase |
| `apps/generator/lib/ollama/prompts.ts` | utility | transform | No prompt engineering patterns exist |
| `apps/generator/lib/ollama/verification.ts` | service | request-response | No verification/multi-pass patterns exist |
| `apps/generator/components/PackExporter.tsx` | component | file-I/O | No file export/download patterns exist in mobile app |

For these files, use the detailed implementations provided in RESEARCH.md:
- **Ollama client:** See RESEARCH.md Pattern 1 (lines 225-262)
- **Verification pipeline:** See RESEARCH.md Pattern 2 (lines 271-355)
- **Question generation prompts:** See RESEARCH.md Code Examples (lines 584-626)
- **Pack export:** See RESEARCH.md Code Examples (lines 630-684)

---

## Metadata

**Analog search scope:**
- `apps/mobile/` - All screens, components, stores
- `packages/types/` - All schema files
- `turbo.json` - Monorepo configuration
- `pnpm-workspace.yaml` - Workspace configuration

**Files scanned:** 25+ files across mobile app, types package, and configuration

**Pattern extraction date:** 2026-06-08