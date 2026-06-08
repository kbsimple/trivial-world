# Stack Research

**Domain:** Mobile trivia game with offline-first capability, designed for in-person social play
**Researched:** 2026-06-08
**Confidence:** HIGH

## Recommended Stack

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
| **WatermelonDB** | 2.x | Offline-first database | Purpose-built for offline-first; lazy loading (only queried records in memory); observable queries for reactive UI; sync protocol for future cloud backup; scales to 50k+ records without performance degradation. Excellent for storing questions locally. |
| **expo-sqlite** | ~55.0.0 | SQLite adapter (bundled) | Powers WatermelonDB on native; also available as standalone key-value store for simple settings. Part of Expo SDK, no extra installation. |

### State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Zustand** | 5.x | Client state | Smallest bundle (~1.2KB); no providers needed; built-in persist middleware for AsyncStorage/MMKV; simple store model ideal for game state (score, current player, die roll). Works perfectly with WatermelonDB for UI state. |
| **TanStack Query** | 5.x | Server state (future) | Only needed if adding cloud sync later. Excellent for caching, background refetching. Not needed for MVP since all data is local. |

### UI & Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tamagui** | 2.x | UI component library | Best performance (compiler extracts static styles at build time); includes 80+ components (Button, Sheet, Dialog, etc.); universal (web + native); token-based theming perfect for game UI. Smaller bundle than alternatives. |
| **react-native-reanimated** | 3.x | Animations | Runs on UI thread (no JS bridge overhead); 60fps guaranteed; works with Gesture Handler for dice roll interactions; Layout animations for score updates. Industry standard. |
| **react-native-gesture-handler** | 2.x | Touch gestures | Required for dice roll swipe/tap; native gesture recognition; integrates with Reanimated for smooth 60fps animations. |

### Audio

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **expo-av** | ~55.0.0 | Sound effects | Official Expo audio; simple API for dice roll sounds, correct/incorrect answer sounds; preloading supported; works in Expo Go. Bundled with SDK 55. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@react-native-async-storage/async-storage** | 1.x | Key-value storage | Zustand persist middleware; simple settings (sound on/off). Replaced by MMKV for better performance. |
| **MMKV** | 2.x | Fast key-value storage | Optional upgrade from AsyncStorage; 5-10x faster; ideal for Zustand persistence. Use if AsyncStorage becomes a bottleneck. |
| **expo-haptics** | ~55.0.0 | Haptic feedback | Dice roll vibration; correct/incorrect answer feedback; enhances in-person social gameplay. Bundled with Expo SDK. |
| **expo-screen-orientation** | ~55.0.0 | Lock orientation | Lock to portrait for consistent game conductor experience. Bundled with Expo SDK. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **ESLint + Prettier** | Code quality | Standard React Native config; Tamagui has specific lint rules. |
| **Vitest** | Unit tests | Fast, Jest-compatible; better TypeScript support. |
| **Maestro** | E2E tests | Mobile-focused alternative to Detox; simpler YAML syntax. |

## Installation

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

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Expo SDK 55** | React Native CLI | Only if you need native modules not supported by Expo (rare). Expo now has excellent native module support via config plugins. |
| **WatermelonDB** | expo-sqlite direct | Only if data model is extremely simple (<5 tables) and you don't need sync. WatermelonDB handles complexity well. |
| **Zustand** | Jotai | Only if state is highly derived/atomic (like canvas-based games). For game state (scores, turns), Zustand's store model is more intuitive. |
| **Tamagui** | NativeWind | If team already knows Tailwind CSS and wants zero learning curve. Tamagui's component library and compiler optimization make it better for game UI. |
| **Tamagui** | React Native Paper | If Material Design is preferred aesthetic. Tamagui offers better performance and theming flexibility. |
| **Expo Router** | React Navigation 7 | If migrating existing React Navigation app. Expo Router's file-based routing and automatic deep linking are superior for new projects. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Realm** | Deprecated as of 2025; MongoDB shifted focus to Atlas | WatermelonDB + custom sync backend |
| **Redux Toolkit** | Overkill for this use case; 10x larger bundle than Zustand; complex boilerplate | Zustand |
| **React Navigation 6** | v7 has better TypeScript support and Static API | React Navigation 7 or Expo Router |
| **AsyncStorage alone** | No query capabilities; loads entire dataset; not designed for complex data | WatermelonDB for game data |
| **Firebase Realtime Database** | Requires internet; defeats offline-first goal | WatermelonDB for local-first; add sync backend later |
| **Styled Components** | Poor React Native performance; no build-time optimization | Tamagui or NativeWind |

## Stack Patterns by Variant

**If building for web + mobile:**
- Use Tamagui (universal components)
- Add Expo Router web support
- Keep WatermelonDB (works on web via SQLite WASM)

**If team knows Tailwind:**
- Use NativeWind v4 instead of Tamagui
- Still use Tamagui's `@tamagui/lucide-icons` for icons
- Same database and state stack

**If planning cloud sync:**
- WatermelonDB already has sync protocol built-in
- Add backend (Supabase/Postgres) later
- No database change needed

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Expo SDK 55 | React Native 0.83 | Bundled, don't override |
| Tamagui 2.x | React Native 0.81+ | New Architecture recommended |
| WatermelonDB 2.x | React Native 0.71+ | JSI mode requires additional Android setup |
| Reanimated 3.x | React Native 0.72+ | Babel plugin must be last |
| Zustand 5.x | React 18+ | React 19 recommended |
| TypeScript 5.x | All packages | Tamagui requires 5+ |

## Architecture for Offline-First Trivia Game

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (Tamagui)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Game Screen  │ │ Question Card│ │ Die Roll Animation    │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              State Layer (Zustand)                           │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Game Store: currentPlayer, scores, dieResult, gamePhase ││
│  │ Settings Store: soundEnabled, hapticsEnabled             ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Data Layer (WatermelonDB)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Questions    │ │ Participants │ │ Game Sessions        │ │
│  │ (6 categories)│ │ (players)    │ │ (game history)       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│                     Local SQLite                              │
└─────────────────────────────────────────────────────────────┘
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

## Sources

- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55) — SDK versions, React Native compatibility
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) — Last version with Legacy Architecture
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started) — Static API, file-based routing
- [React Native Versions](https://reactnative.dev/versions) — RN 0.83/0.84 release notes
- [WatermelonDB Documentation](https://watermelondb.dev/docs/Setup) — Offline-first patterns, schema, sync
- [Zustand v5 Release](https://github.com/pmndrs/zustand/releases/tag/v5.0.0) — v5 changes, React 18 minimum
- [Tamagui Installation Guide](https://tamagui.dev/docs/intro/installation) — Setup, config, components
- [React Native Database Comparison 2026](https://www.pkgpulse.com/guides/expo-sqlite-vs-watermelondb-vs-realm-react-native-local-2026) — Performance benchmarks
- [State Management 2026 Guide](https://www.oflight.co.jp/en/columns/react-native-state-management-2026) — Zustand vs Jotai benchmarks
- [NativeWind vs Tamagui 2026](https://www.pkgpulse.com/guides/nativewind-vs-tamagui-vs-twrnc-react-native-styling-2026) — Styling comparison
- [Expo Router Core Concepts](https://docs.expo.dev/router/basics/core-concepts) — File-based routing best practices
- [Reanimated 3 Documentation](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures) — Animation performance

---
*Stack research for: Mobile trivia game with offline-first capability*
*Researched: 2026-06-08*