# Architecture Research

**Domain:** Question Pack System for Mobile Trivia Game
**Researched:** 2026-06-08 (Updated: 2026-06-09 for Web Deployment)
**Confidence:** HIGH

## Executive Summary

This research addresses the architecture for a question pack system that enables:
1. **Question Pack Structure** - TypeScript types and JSON Schema for portable question data
2. **Question Generator Web App** - AI-powered question creation with cloud storage
3. **Game Configuration** - Mobile app pack selection and settings
4. **Web Deployment (v3.0)** - Deploy both apps to Netlify with session-only storage for game

The recommended architecture uses a **monorepo with shared types**, **Zod for runtime validation**, and **JSON Schema for pack validation**. The question pack format follows patterns from established trivia schemas (Sunbird inQuiry, trivia-schema) with adaptations for Trivial World's 6-category model.

**New for v3.0:** Web deployment requires platform-specific storage adapters and database alternatives. The game app uses session-only storage (sessionStorage) with bundled questions instead of WatermelonDB. The generator app remains unchanged (already static export ready).

Key decisions:
- **Monorepo structure** with shared `@trivial-world/types` package
- **Zod-first types** for single source of truth + runtime validation
- **JSON Schema export** for validation in environments without Zod
- **Cloud storage** via presigned URLs (S3-compatible) for pack downloads
- **Offline-first** pack caching in WatermelonDB (existing from v1.0)
- **Session-only storage for web** - no IndexedDB complexity, bundled questions only
- **Two separate Netlify sites** - game and generator deploy independently

---

## System Overview

### Two-App Architecture (with Web Deployment)

```
+------------------------------------------------------------------------------+
|                           MONOREPO ROOT                                       |
+------------------------------------------------------------------------------+
|  apps/                                                                        |
|  ├── mobile/              # Expo SDK 55 (existing Trivial World app)         |
|  │   ├── app/             # Expo Router screens                              |
|  │   │   ├── game/        # Existing game screens                           |
|  │   │   └── packs/       # NEW: Pack management screens                    |
|  │   ├── components/      # UI components                                   |
|  │   ├── stores/          # Zustand stores                                  |
|  │   │   └── packStore.ts # NEW: Pack selection state                       |
|  │   ├── database/        # WatermelonDB models (mobile only)               |
|  │   │   └── QuestionPack.ts # NEW: Pack model                               |
|  │   ├── services/        # Pack download/cache service                     |
|  │   ├── web/             # NEW: Web-specific static files                   |
|  │   │   ├── index.html   # PWA HTML template                                |
|  │   │   └── manifest.json # PWA manifest                                    |
|  │   └── netlify.toml     # NEW: Game app deployment config                 |
|  │                                                                            |
|  └── generator/           # Next.js 15 web app (new)                        |
|      ├── app/             # App Router pages                                 |
|      ├── components/      # Question editor UI                               |
|      ├── lib/             # AI generation, API clients                       |
|      ├── out/             # Static export output                             |
|      └── netlify.toml     # NEW: Generator deployment config                |
|                                                                               |
|  packages/                                                                    |
|  ├── types/               # @trivial-world/types                             |
|  │   ├── question-pack.ts # Zod schemas + inferred types                    |
|  │   ├── category.ts      # Category definitions (shared)                    |
|  │   └── json-schema.ts   # JSON Schema exports                             |
|  │                                                                            |
|  └── ts-config/           # Shared TypeScript configs                       |
|                                                                               |
|  turbo.json               # Turborepo build pipeline                        |
|  pnpm-workspace.yaml      # Workspace config                                |
+------------------------------------------------------------------------------+
```

### Web Deployment Architecture

```
+------------------------------------------------------------------------------+
|                        NETLIFY DEPLOYMENT                                    |
+------------------------------------------------------------------------------+
|                                                                               |
|  GitHub main branch                                                           |
|       |                                                                       |
|       +--+----------------------------------------+                          |
|          |                                         |                          |
|          v                                         v                          |
|  +-------------------+                  +-------------------+               |
|  | trivial-world-game|                  |trivial-world-gen  |               |
|  | (Netlify Site 1)  |                  |(Netlify Site 2)   |               |
|  +-------------------+                  +-------------------+               |
|  | Build:             |                  | Build:            |               |
|  | pnpm build:web     |                  | pnpm build        |               |
|  | Publish: dist/    |                  | Publish: out/     |               |
|  +-------------------+                  +-------------------+               |
|          |                                         |                          |
|          v                                         v                          |
|  +-------------------+                  +-------------------+               |
|  | Static HTML/JS/CSS|                  | Static HTML/JS/CSS|               |
|  | - Bundled questions|                  | - AI generation UI|              |
|  | - Session storage  |                  | - Pack creation   |              |
|  | - No database      |                  | - Static export   |              |
|  +-------------------+                  +-------------------+               |
|                                                                               |
+------------------------------------------------------------------------------+
```

### Data Flow: Generator to Consumer

```
+-----------------------------------------------------------------------------+
|                        QUESTION GENERATOR (Web)                               |
|  +----------+    +----------+    +----------+    +----------------+          |
|  | Topic    |--->| AI       |--->| Question |--->| Pack Builder    |          |
|  | Input    |    | Provider |    | Validator|    | (JSON Schema)  |          |
|  | + Guidanc|    | (Ollama) |    +----------+    +-------+--------+          |
|  +----------+    +----------+                            |                   |
|                                                          v                   |
|  +----------+    +----------+                  +----------------+            |
|  | Pack List|<---| Pack Store|<----------------| Cloud Upload   |            |
|  | UI       |    | (static) |                  | (local files)  |            |
|  +----------+    +----------+                  +----------------+            |
+------------------------------------------------------------------------------+
                                                            |
                                 Download (local file)
                                                            v
+------------------------------------------------------------------------------+
|                           MOBILE APP (Consumer)                              |
|  +----------+    +----------+    +----------+    +-------------+              |
|  | Pack     |--->| Download |--->| Validator|--->| WatermelonDB|              |
|  | Browser  |    | Service  |    | (Zod)    |    | Pack Cache  |              |
|  +----------+    +----------+    +----------+    +------+------              |
|                                                        |                      |
|  +----------+    +----------+                         v                      |
|  | Game     |<---| Question |<------------------+-------------+             |
|  | Screen   |    | Store    |                     | Pack Model  |             |
|  +----------+    +----------+                     +-------------+             |
+------------------------------------------------------------------------------+
```

---

## Web Deployment Integration

### Platform-Specific Storage Layer

**Mobile (existing):** AsyncStorage + WatermelonDB
**Web (new):** sessionStorage + bundled questions

```typescript
// services/platformStorage.ts
import { createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Platform detection for storage
const isWeb = Platform.OS === 'web';

// Create storage adapter based on platform
export const createStorage = () => {
  if (isWeb) {
    // Web: sessionStorage for session-only persistence
    return createJSONStorage(() => sessionStorage);
  }
  // Mobile: AsyncStorage for persistent storage
  return createJSONStorage(() => AsyncStorage);
};

// Singleton instance
export const storage = createStorage();
```

### Database Layer Abstraction

**Mobile (existing):** WatermelonDB with SQLite adapter
**Web (new):** In-memory bundled questions

```typescript
// services/questionProvider.ts
import { Platform } from 'react-native';
import { Question, Category } from '@trivial-world/types';

// Mobile: Database query
async function getQuestionFromDatabase(
  category: Category,
  excludeIds: string[]
): Promise<Question | null> {
  const { getDatabase } = await import('../database');
  const { Q } = await import('@nozbe/watermelondb');
  
  const database = getDatabase();
  const questions = await database.get('questions')
    .query(
      Q.where('category', category),
      Q.where('asked_at', null),
      Q.where('question_pack_id', activePackId)
    )
    .fetch();
  
  if (questions.length === 0) return null;
  return questions[Math.floor(Math.random() * questions.length)];
}

// Web: Bundled questions
async function getQuestionFromBundle(
  category: Category,
  excludeIds: string[]
): Promise<Question | null> {
  const { ALL_QUESTIONS } = await import('../data/questions');
  
  const available = ALL_QUESTIONS.filter(
    q => q.category === category && !excludeIds.includes(q.id)
  );
  
  if (available.length === 0) {
    // Reset if all questions exhausted
    return getQuestionFromBundle(category, []);
  }
  
  return available[Math.floor(Math.random() * available.length)];
}

// Platform-aware question selector
export const getNextQuestion = Platform.OS === 'web'
  ? getQuestionFromBundle
  : getQuestionFromDatabase;
```

### App Layout Initialization

**Mobile (existing):** WatermelonDB initialization
**Web (new):** No database initialization needed

```typescript
// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import config from '../tamagui.config';

// Mobile-only database imports
let database: any = null;
let initializeDatabase: any = null;

if (Platform.OS !== 'web') {
  const db = require('../database');
  database = db.database;
  initializeDatabase = db.initializeDatabase;
}

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: No database needed, just bundled questions
      setIsInitialized(true);
      return;
    }
    
    // Mobile: Initialize WatermelonDB
    if (initializeDatabase) {
      initializeDatabase()
        .then(() => setIsInitialized(true))
        .catch((error: Error) => {
          console.error('Database initialization failed:', error);
          setIsInitialized(true); // Still render on error
        });
    }
  }, []);

  if (!isInitialized) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <Theme name="dark">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="game/setup" />
            <Stack.Screen name="game/question" />
            <Stack.Screen name="packs" options={{ headerShown: false }} />
          </Stack>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
```

---

## Web Deployment Configuration

### Expo Web Export Configuration

```json
// apps/mobile/app.json additions
{
  "expo": {
    "web": {
      "output": "static",
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### Package.json Scripts

```json
// apps/mobile/package.json additions
{
  "scripts": {
    "build:web": "expo export --platform web"
  }
}
```

### PWA Manifest

```json
// apps/mobile/web/manifest.json
{
  "short_name": "Trivial World",
  "name": "Trivial World - Social Trivia Game",
  "description": "Mobile trivia game for in-person social play",
  "icons": [
    {
      "src": "/assets/icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any maskable"
    },
    {
      "src": "/assets/icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any maskable"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "categories": ["games", "entertainment"]
}
```

### Netlify Configuration

```toml
# apps/mobile/netlify.toml
[build]
  command = "pnpm build:web"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

```toml
# apps/generator/netlify.toml
[build]
  command = "pnpm build"
  publish = "out"

[build.environment]
  NODE_VERSION = "20"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

### Turborepo Configuration

```json
// turbo.json additions
{
  "tasks": {
    "mobile#build:web": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

---

## Integration Points Summary

### New Files Required for Web

| File | Purpose |
|------|---------|
| `apps/mobile/netlify.toml` | Game app Netlify deployment config |
| `apps/mobile/web/manifest.json` | PWA manifest for Add to Home Screen |
| `apps/mobile/web/index.html` | Static HTML template (optional, auto-generated) |
| `apps/mobile/services/platformStorage.ts` | Platform-aware storage adapter |
| `apps/mobile/services/questionProvider.ts` | Platform-aware question retrieval |
| `apps/generator/netlify.toml` | Generator app Netlify deployment config |

### Files Modified for Web

| File | Changes |
|------|---------|
| `apps/mobile/app.json` | Add `web: { output: "static" }` |
| `apps/mobile/package.json` | Add `build:web` script |
| `apps/mobile/app/_layout.tsx` | Platform-conditional database initialization |
| `apps/mobile/stores/gameStore.ts` | Use platform storage adapter |
| `apps/mobile/stores/packStore.ts` | Use platform storage adapter |
| `turbo.json` | Add `mobile#build:web` task |

### Files Unchanged

| File | Why |
|------|-----|
| `packages/types/*` | Platform-agnostic Zod schemas |
| `apps/mobile/components/*` | Tamagui renders cross-platform |
| `apps/mobile/constants/*` | No platform dependencies |
| `apps/mobile/data/questions.ts` | Bundled questions work on both platforms |
| `apps/mobile/database/*` | Mobile-only, guarded by Platform.OS check |
| `apps/generator/*` | Already static export ready, no changes needed |

---

## Build Order and Dependencies

```
1. packages/types (no dependencies)
   └── pnpm build -> packages/types/dist/

2. apps/generator (depends on packages/types)
   └── pnpm build -> apps/generator/out/
   └── Already configured for static export
   └── No changes required for web deployment

3. apps/mobile (depends on packages/types)
   └── pnpm build:web -> apps/mobile/dist/
   └── New script: "build:web": "expo export --platform web"
   └── Requires app.json web.output: "static"
   └── Platform guards skip WatermelonDB on web
```

**Deployment Sequence:**
1. Create two Netlify sites from GitHub repo
2. Site 1 (game): Base directory `apps/mobile`, build command `pnpm build:web`
3. Site 2 (generator): Base directory `apps/generator`, build command `pnpm build`
4. Both sites auto-deploy on push to main branch

---

## Scalability Considerations

| Concern | At 10 Users | At 1K Users | At 100K Users |
|---------|-------------|-------------|----------------|
| Bundle size (web) | ~2MB bundled questions | Same | Same |
| API calls | None (static) | None | None |
| Pack downloads | Disabled on web | Disabled | Disabled |
| Session storage | ~2KB per game | Same | Browser-managed |
| Cold start | Static HTML cached | CDN cached | CDN cached |

**Key insight:** Web deployment is entirely static. No server, no database, no API calls at runtime. Scales infinitely on Netlify's CDN.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: IndexedDB for Web Storage

**What:** Using WatermelonDB's LokiJSAdapter with IndexedDB.

**Why bad:**
- Adds ~150KB bundle size
- Complex IndexedDB APIs with Safari compatibility issues
- Session-only storage is simpler and matches milestone decision
- Offline pack downloads not needed for web MVP

**Instead:** Use sessionStorage with bundled questions. Keep web simple.

### Anti-Pattern 2: localStorage for Game State

**What:** Using localStorage instead of sessionStorage.

**Why bad:**
- Persists across sessions (breaks "session-only" requirement)
- No automatic cleanup when tab closes
- Users might expect fresh game on new visit

**Instead:** Use sessionStorage. Game state clears when tab/window closes.

### Anti-Pattern 3: Shared Netlify Config

**What:** Single `netlify.toml` at monorepo root trying to deploy both apps.

**Why bad:** Netlify expects one build command per site. Can't conditionally deploy to different sites from one config.

**Instead:** Two separate Netlify sites, each with own config in app directory.

### Anti-Pattern 4: Runtime Platform Detection in Bundles

**What:** Including mobile-only code (WatermelonDB) in web bundle with runtime checks.

**Why bad:**
- Increases bundle size unnecessarily
- May cause build warnings/errors
- Dead code in web bundle

**Instead:** Use Platform.OS checks that bundlers can tree-shake, or separate entry points.

---

## Sources

- [Expo Web Export Documentation](https://github.com/expo/expo/blob/main/docs/pages/guides/publishing-websites.mdx) - HIGH confidence
- [Expo PWA Manifest Guide](https://github.com/expo/expo/blob/main/docs/pages/guides/progressive-web-apps.mdx) - HIGH confidence
- [Expo Static Rendering](https://github.com/expo/expo/blob/main/docs/pages/router/web/static-rendering.mdx) - HIGH confidence
- [WatermelonDB Adapters](https://watermelondb.dev/docs/Implementation/DatabaseAdapters) - HIGH confidence
- [Zustand Persist Middleware](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md) - HIGH confidence
- [Tamagui Next.js Integration](https://github.com/tamagui/tamagui/blob/main/code/tamagui.dev/data/docs/guides/next-js.mdx) - HIGH confidence
- [Netlify Monorepo Support](https://docs.netlify.com/configure-builds/common-configurations/monorepos/) - MEDIUM confidence
- [WatermelonDB Schema Documentation](https://watermelondb.dev/docs/Schema) - HIGH confidence
- [Sunbird inQuiry QuestionSet Schema](https://inquiry.sunbird.org/learn/product-and-developer-guide/question-and-question-set-service/schema/questionset-schema) - MEDIUM confidence
- [Cloud Storage for Mobile Apps](https://expo.dev/blog/faster-more-reliable-video-uploads-with-expo-modules) - MEDIUM confidence

---
*Architecture research for: Question Pack System + Web Deployment*
*Researched: 2026-06-08, Updated: 2026-06-09*