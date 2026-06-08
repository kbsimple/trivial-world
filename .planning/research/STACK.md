# Stack Research

**Domain:** Mobile trivia game with offline-first capability + Question Pack System
**Researched:** 2026-06-08
**Confidence:** HIGH

---

## Part 1: Mobile App Stack (Existing)

The following stack is already implemented for the core mobile trivia game.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Expo SDK** | 55.x | Mobile app framework | Best DX for React Native; managed workflow simplifies iOS/Android deployment; built-in OTA updates via EAS; SDK 55 includes React Native 0.83 with New Architecture mandatory (better performance). Offline-capable out of the box. |
| **React Native** | 0.83 (via Expo 55) | Cross-platform mobile runtime | Industry standard for cross-platform mobile; excellent gesture/animation support; large ecosystem. Hermes V1 default in RN 0.84+ but SDK 55 ships with optimized Hermes. |
| **TypeScript** | 5.x | Type safety | Required by Tamagui; catches bugs at compile time; excellent IDE support; essential for game state logic. |
| **Expo Router** | 4.x (bundled with SDK 55) | File-based navigation | Automatic deep linking; type-safe routes; universal (iOS/Android/Web); integrates with New Architecture. Simplifies game flow navigation. |

### Database & Offline-First

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **WatermelonDB** | 0.28.x | Offline-first database | Purpose-built for offline-first; lazy loading (only queried records in memory); observable queries for reactive UI; sync protocol for future cloud backup; scales to 50k+ records without performance degradation. Excellent for storing questions locally. |
| **expo-sqlite** | ~55.0.0 | SQLite adapter (bundled) | Powers WatermelonDB on native; also available as standalone key-value store for simple settings. Part of Expo SDK, no extra installation. |

### State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Zustand** | 5.x | Client state | Smallest bundle (~1.2KB); no providers needed; built-in persist middleware for AsyncStorage/MMMV; simple store model ideal for game state (score, current player, die roll). Works perfectly with WatermelonDB for UI state. |

### UI & Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tamagui** | 2.x | UI component library | Best performance (compiler extracts static styles at build time); includes 80+ components (Button, Sheet, Dialog, etc.); universal (web + native); token-based theming perfect for game UI. Smaller bundle than alternatives. |
| **react-native-reanimated** | 4.x | Animations | Runs on UI thread (no JS bridge overhead); 60fps guaranteed; works with Gesture Handler for dice roll interactions; Layout animations for score updates. Industry standard. |
| **react-native-gesture-handler** | 2.x | Touch gestures | Required for dice roll swipe/tap; native gesture recognition; integrates with Reanimated for smooth 60fps animations. |

### Audio

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **expo-av** | ~55.0.0 | Sound effects | Official Expo audio; simple API for dice roll sounds, correct/incorrect answer sounds; preloading supported; works in Expo Go. Bundled with SDK 55. |

### Supporting Libraries (Mobile)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@react-native-async-storage/async-storage** | 1.x | Key-value storage | Zustand persist middleware; simple settings (sound on/off). |
| **expo-haptics** | ~55.0.0 | Haptic feedback | Dice roll vibration; correct/incorrect answer feedback; enhances in-person social gameplay. Bundled with Expo SDK. |
| **expo-screen-orientation** | ~55.0.0 | Lock orientation | Lock to portrait for consistent game conductor experience. Bundled with Expo SDK. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **ESLint + Prettier** | Code quality | Standard React Native config; Tamagui has specific lint rules. |
| **Vitest** | Unit tests | Fast, Jest-compatible; better TypeScript support. |
| **Maestro** | E2E tests | Mobile-focused alternative to Detox; simpler YAML syntax. |

## Installation (Mobile App)

```bash
# Create project with Expo SDK 55
npx create-expo-app@latest trivial-world --template blank-typescript

# Core dependencies
npm install zustand @react-native-async-storage/async-storage

# UI & Animations
npm install tamagui @tamagui/config
npm install react-native-reanimated react-native-gesture-handler

# Database (offline-first)
npm install @nozbe/watermelondb

# Audio & Haptics (bundled with Expo, just need config)
npx expo install expo-av expo-haptics expo-screen-orientation

# Dev dependencies
npm install -D vitest @testing-library/react-native
```

### Babel Configuration (Required for Reanimated + Tamagui)

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Tamagui compiler plugin MUST come before Reanimated
      '@tamagui/compiler/babel-plugin',
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
```

## Alternatives Considered (Mobile)

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Expo SDK 55** | React Native CLI | Only if you need native modules not supported by Expo (rare). Expo now has excellent native module support via config plugins. |
| **WatermelonDB** | expo-sqlite direct | Only if data model is extremely simple (<5 tables) and you don't need sync. WatermelonDB handles complexity well. |
| **Zustand** | Jotai | Only if state is highly derived/atomic (like canvas-based games). For game state (scores, turns), Zustand's store model is more intuitive. |
| **Tamagui** | NativeWind | If team already knows Tailwind CSS and wants zero learning curve. Tamagui's component library and compiler optimization make it better for game UI. |

## What NOT to Use (Mobile)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Realm** | Deprecated as of 2025; MongoDB shifted focus to Atlas | WatermelonDB + custom sync backend |
| **Redux Toolkit** | Overkill for this use case; 10x larger bundle than Zustand | Zustand |
| **AsyncStorage alone** | No query capabilities; loads entire dataset; not designed for complex data | WatermelonDB for game data |
| **Firebase Realtime Database** | Requires internet; defeats offline-first goal | WatermelonDB for local-first; add sync backend later |
| **Styled Components** | Poor React Native performance; no build-time optimization | Tamagui or NativeWind |

---

## Part 2: Question Pack System (NEW)

The following additions are needed for the question pack milestone: question pack data structure, AI question generation web app, and cloud storage for pack sync.

### Core Technologies (NEW)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Zod** | 4.4.x | Schema validation for question packs | TypeScript-first; shared types between mobile and web; JSON Schema export for API contracts; Zod 4 has 14x faster parsing and 2.3x smaller bundle than Zod 3. |
| **Vercel AI SDK** | 6.0.x | LLM abstraction layer | Provider-agnostic (switch between OpenAI/Anthropic); built-in structured output with Zod; streaming support; best DX for AI features. |
| **@ai-sdk/openai** | 3.0.x | OpenAI provider for AI SDK | Direct integration with Vercel AI SDK; GPT-4o access; provider can be swapped with one import change. |
| **Next.js** | 16.x | Question generator web app | App Router with Server Actions for secure LLM calls; deployed separately from mobile app; Edge runtime for AI SDK streaming. |
| **Supabase JS SDK** | 2.108.x | Cloud backend for question packs | Postgres for pack metadata; Storage for JSON pack files; works with Expo Go without config plugins; relational model fits pack/category/question hierarchy. |

### Supporting Libraries (NEW)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **expo-file-system** | 55.0.x | Local pack storage | Mobile app: download packs to device, cache management, store JSON files locally. |
| **react-native-url-polyfill** | 2.0.x | URL polyfill for Supabase | Mobile app: required for Supabase client in React Native environment. |
| **@ai-sdk/anthropic** | (optional) | Anthropic provider alternative | Optional: swap providers by changing one import if preferring Claude. |

### Development Dependencies (NEW)

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript 5.x | Type safety | Already in project; Zod 4 has excellent TS inference. |

## Integration Points

### Mobile App Integration

**Existing Stack (Unchanged):**
- Expo SDK 55 + React Native 0.83
- Zustand 5.x with persist middleware
- WatermelonDB for offline data
- Tamagui 2.x for UI
- Expo Router for navigation

**New Additions:**

```
Mobile App Architecture:

+---------------------------------------------------+
|  Pack Management Layer (NEW)                      |
|  +-----------------+  +-------------------------+ |
|  | Zod Schema      |  | Supabase Client         | |
|  | (shared types)  |  | (pack downloads)        | |
|  +-----------------+  +-------------------------+ |
|  +-----------------------------------------------+ |
|  | expo-file-system                              | |
|  | (local pack storage in documentDirectory)     | |
|  +-----------------------------------------------+ |
+---------------------------------------------------+
```

### Web App Integration (NEW)

**New Application - Question Generator:**

```
Web App Architecture:

+---------------------------------------------------+
|  Next.js 16 App Router                            |
|  +-----------------------------------------------+ |
|  | Server Actions (secure LLM calls)             | |
|  | - generateQuestions()                        | |
|  | - validatePack()                              | |
|  +-----------------------------------------------+ |
|  +-----------------------------------------------+ |
|  | Vercel AI SDK + @ai-sdk/openai               | |
|  | - generateObject with Zod schema              | |
|  | - Structured question output                  | |
|  +-----------------------------------------------+ |
|  +-----------------------------------------------+ |
|  | Supabase Client                               | |
|  | - Pack CRUD operations                        | |
|  | - Storage for pack JSON files                 | |
|  +-----------------------------------------------+ |
+---------------------------------------------------+
```

### Shared Code: Zod Schemas

**Shared between mobile and web:**

```typescript
// shared/schemas/question-pack.ts
import { z } from 'zod';

export const QuestionSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(10).max(500),
  correctAnswer: z.string(),
  wrongAnswers: z.array(z.string()).length(3),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: z.enum(['blue', 'pink', 'yellow', 'purple', 'green', 'orange']),
  metadata: z.object({
    source: z.string().optional(),
    createdAt: z.string().datetime(),
    generatedBy: z.enum(['human', 'ai']).optional(),
  }).optional(),
});

export const QuestionPackSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  category: z.enum(['blue', 'pink', 'yellow', 'purple', 'green', 'orange', 'mixed']),
  questions: z.array(QuestionSchema).min(10).max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionPack = z.infer<typeof QuestionPackSchema>;
```

## LLM Provider Comparison

### OpenAI vs Anthropic for Question Generation

| Criterion | OpenAI (GPT-4o) | Anthropic (Claude) |
|-----------|-----------------|-------------------|
| Structured output | Native JSON mode, function calling | Tool use for JSON |
| Cost efficiency | Moderate | Competitive with prompt caching |
| Vercel AI SDK support | First-class | First-class |
| Question quality | Excellent for trivia | Excellent for nuanced questions |
| Speed | Fast (GPT-4o-mini even faster) | Comparable |

**Recommendation:** Start with **OpenAI GPT-4o** via Vercel AI SDK. The AI SDK makes switching trivial:

```typescript
// Swap provider with one line change
import { openai } from '@ai-sdk/openai';
// import { anthropic } from '@ai-sdk/anthropic';

const model = openai('gpt-4o'); // or anthropic('claude-sonnet-4')
```

## Cloud Storage Comparison

### Supabase vs Firebase for Question Packs

| Criterion | Supabase | Firebase |
|-----------|----------|----------|
| Data model | Postgres (relational) | Firestore (document) |
| Expo Go support | Yes (JS SDK works) | No (requires dev build) |
| Pricing predictability | Tiered ($25/mo base) | Usage-based (can spike) |
| Offline support | Less integrated | Battle-tested |
| Storage for files | Built-in Storage bucket | Cloud Storage |
| Query power | Full SQL | Limited |

**Recommendation:** **Supabase** for this use case because:
1. Works in Expo Go without config plugins (Firebase requires dev build)
2. Relational data model fits pack/category/question structure
3. Predictable pricing for small-scale hobby project
4. Storage buckets for JSON pack files

**Integration pattern:**

```typescript
// Mobile: Download packs from Supabase Storage
import { createClient } from '@supabase/supabase-js';
import { File, Paths } from 'expo-file-system';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function downloadPack(packId: string) {
  // Get pack metadata from Postgres
  const { data: pack } = await supabase
    .from('question_packs')
    .select('*')
    .eq('id', packId)
    .single();

  // Download JSON file from Storage
  const { data: file } = await supabase
    .storage
    .from('packs')
    .download(pack.storage_path);

  // Save to local file system
  const localFile = new File(Paths.document, `pack-${packId}.json`);
  await localFile.write(await file.text());

  return pack;
}
```

## Installation (Question Pack System)

```bash
# === MOBILE APP (Expo) ===

# Core additions
npx expo install @supabase/supabase-js react-native-url-polyfill expo-file-system

# Zod for shared schemas (if not sharing as monorepo package)
npm install zod

# === WEB APP (Next.js - NEW PROJECT) ===

# Create Next.js app
npx create-next-app@latest question-generator --typescript --tailwind --app

# AI SDK for LLM integration
npm install ai @ai-sdk/openai

# Zod for schemas
npm install zod

# Supabase for pack storage
npm install @supabase/supabase-js

# Optional: Anthropic provider
npm install @ai-sdk/anthropic
```

## Alternatives Considered (Question Pack)

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vercel AI SDK | OpenAI SDK directly | Need embeddings API, fine-tuning, or Node.js runtime (not Edge) |
| Supabase | Firebase | Need battle-tested offline sync, building chat/collab app |
| Next.js | Remix | Preference for progressive enhancement patterns |
| Zod | TypeBox/Valibot | Need smaller bundle for client-heavy validation |

## What NOT to Use (Question Pack)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **OpenAI Assistants API** | Deprecated, shutting down August 2026 | Vercel AI SDK agent patterns |
| **Firebase JS SDK with Expo** | Requires config plugins, breaks Expo Go | Supabase JS SDK |
| **Expo CloudKit** | iOS-only, no Android support | Supabase (cross-platform) |
| **React Native Firebase** | Requires development build, native code | Supabase JS SDK |
| **Valibot** | Smaller ecosystem, less TypeScript integration | Zod 4 |

## Version Compatibility (Question Pack)

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| zod | 4.4.x | Vercel AI SDK 6.x | Zod 4 supported for structured output |
| ai | 6.0.x | Next.js 16.x | Works with App Router Server Actions |
| @ai-sdk/openai | 3.0.x | ai 6.x | Peer dependency |
| @supabase/supabase-js | 2.108.x | expo-file-system 55.x | No conflicts, separate concerns |
| expo-file-system | 55.0.x | Expo SDK 55 | Native module, version locked to SDK |

## Architecture for Offline-First Trivia Game

```
+-------------------------------------------------------------+
|                    UI Layer (Tamagui)                        |
|  +---------------+ +---------------+ +----------------------+ |
|  | Game Screen   | | Question Card | | Die Roll Animation   | |
|  +---------------+ +---------------+ +----------------------+ |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|              State Layer (Zustand)                           |
|  +----------------------------------------------------------+|
|  | Game Store: currentPlayer, scores, dieResult, gamePhase ||
|  | Settings Store: soundEnabled, hapticsEnabled            ||
|  +----------------------------------------------------------+|
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|           Data Layer (WatermelonDB)                          |
|  +---------------+ +---------------+ +----------------------+ |
|  | Questions     | | Participants  | | Game Sessions        | |
|  | (6 categories)| | (players)     | | (game history)       | |
|  +---------------+ +---------------+ +----------------------+ |
|                     Local SQLite                              |
+-------------------------------------------------------------+
```

### Data Model (WatermelonDB Schema)

```typescript
// model/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'questions',
      columns: [
        { name: 'category', type: 'string' },      // 6 categories
        { name: 'question_text', type: 'string' },
        { name: 'correct_answer', type: 'string' },
        { name: 'incorrect_answers', type: 'string' }, // JSON array
        { name: 'difficulty', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'participants',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string' },         // Player piece color
        { name: 'game_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'games',
      columns: [
        { name: 'created_at', type: 'number' },
        { name: 'completed_at', type: 'number' },
        { name: 'winner_id', type: 'string' },
      ],
    }),
  ],
});
```

### Zustand Store (Game State)

```typescript
// stores/gameStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GameState {
  currentParticipantId: string | null;
  dieResult: number | null;
  gamePhase: 'setup' | 'playing' | 'gameOver';
  // Actions
  setDieResult: (result: number) => void;
  rollDie: () => number;
  nextTurn: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      currentParticipantId: null,
      dieResult: null,
      gamePhase: 'setup',
      setDieResult: (result) => set({ dieResult: result }),
      rollDie: () => {
        const result = Math.floor(Math.random() * 6) + 1;
        set({ dieResult: result });
        return result;
      },
      nextTurn: () => set({ dieResult: null }),
    }),
    { name: 'game-state', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

## Architecture Decision Records

### ADR-001: Supabase over Firebase (Question Pack)

**Context:** Need cloud storage for question packs that works with Expo.

**Decision:** Use Supabase.

**Rationale:**
1. Firebase requires `@react-native-firebase/app` which needs a development build - breaks Expo Go workflow
2. Supabase JS SDK works directly in Expo managed workflow
3. Postgres relational model fits pack/category/question hierarchy better than Firestore documents
4. Free tier is generous for hobby use (50k MAUs, 500MB storage)

**Consequences:**
- Mobile app uses JS SDK (no native modules for storage)
- Real-time features available but not primary use case
- Web app uses same SDK for consistency

### ADR-002: Vercel AI SDK over OpenAI SDK (Question Generation)

**Context:** Need LLM integration for question generation.

**Decision:** Use Vercel AI SDK with @ai-sdk/openai provider.

**Rationale:**
1. **Provider flexibility:** Can swap to Anthropic or other providers by changing one import
2. **Structured output:** First-class `generateObject` with Zod schema validation
3. **Streaming support:** Built-in hooks if we want streaming UI in web app
4. **TypeScript DX:** End-to-end type safety from prompt to response

**Consequences:**
- Must deploy web app to Edge-compatible runtime (Vercel, Cloudflare Workers)
- No direct embeddings API access (would need OpenAI SDK for that)
- Bundle size smaller than OpenAI SDK (19.5kb vs 129.5kb gzipped)

### ADR-003: Next.js for Generator Web App (Question Generation)

**Context:** Need separate web app for question generation.

**Decision:** Use Next.js 16 with App Router.

**Rationale:**
1. **Server Actions:** Secure LLM API calls without exposing API keys to client
2. **Edge runtime:** Optimized for Vercel AI SDK streaming
3. **App Router:** Modern patterns, file-based routing
4. **Deployment:** Seamless Vercel deployment, edge functions

**Consequences:**
- Separate deployment from mobile app (intentional)
- Can use Vercel free tier for web app
- React Server Components for non-interactive parts

## Sources

### Mobile Stack
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55) — SDK versions, React Native compatibility
- [WatermelonDB Documentation](https://watermelondb.dev/docs/Setup) — Offline-first patterns, schema, sync
- [Zustand v5 Release](https://github.com/pmndrs/zustand/releases/tag/v5.0.0) — v5 changes, React 18 minimum
- [Tamagui Installation Guide](https://tamagui.dev/docs/intro/installation) — Setup, config, components
- [React Native Database Comparison 2026](https://www.pkgpulse.com/guides/expo-sqlite-vs-watermelondb-vs-realm-react-native-local-2026) — Performance benchmarks
- [Reanimated 3 Documentation](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures) — Animation performance

### Question Pack System
- [Zod 4 Documentation](https://zod.dev/v4) — Schema validation features, TypeScript integration
- [Vercel AI SDK](https://ai-sdk.dev) — LLM integration patterns, structured output
- [OpenAI Node SDK](https://github.com/openai/openai-node) — Direct API access
- [Expo Firebase Guide](https://docs.expo.dev/guides/using-firebase) — Expo compatibility, Expo Go limitations
- [Supabase Expo Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — Integration patterns
- [Next.js 16 Release](https://github.com/vercel/next.js/releases/tag/v16.0.0) — App Router features
- [AI SDK Comparison](https://strapi.io/blog/openai-sdk-vs-vercel-ai-sdk-comparison) — Provider flexibility analysis
- [Supabase vs Firebase](https://www.shipnative.dev/blog/supabase-vs-firebase-react-native-2026) — Expo integration comparison
- [expo-file-system Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem-next/) — Modern file API for pack storage

---
*Stack research for: Trivial World mobile app + Question Pack System*
*Researched: 2026-06-08*