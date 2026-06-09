# Stack Research

**Domain:** Mobile trivia game with offline-first capability + Question Pack System + Web Deployment
**Researched:** 2026-06-09 (web deployment additions)
**Confidence:** HIGH

---

## Part 1: Mobile App Stack (Existing)

The following stack is already implemented for the core mobile trivia game.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Expo SDK** | 56.x | Mobile app framework | Best DX for React Native; managed workflow simplifies iOS/Android/web deployment; SDK 56 includes React Native 0.85 with New Architecture mandatory (better performance). Offline-capable out of the box. |
| **React Native** | 0.85 (via Expo 56) | Cross-platform mobile runtime | Industry standard for cross-platform mobile; excellent gesture/animation support; large ecosystem. Hermes V1 default. |
| **TypeScript** | 5.x | Type safety | Required by Tamagui; catches bugs at compile time; excellent IDE support; essential for game state logic. |
| **Expo Router** | 4.x (bundled with SDK 56) | File-based navigation | Automatic deep linking; type-safe routes; universal (iOS/Android/Web); integrates with New Architecture. Simplifies game flow navigation. |

### Database & Offline-First

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **WatermelonDB** | 0.28.x | Offline-first database | Purpose-built for offline-first; lazy loading (only queried records in memory); observable queries for reactive UI; sync protocol for future cloud backup; scales to 50k+ records without performance degradation. Excellent for storing questions locally. |
| **expo-sqlite** | ~56.0.0 | SQLite adapter (bundled) | Powers WatermelonDB on native; also available as standalone key-value store for simple settings. Part of Expo SDK, no extra installation. |

### State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Zustand** | 5.x | Client state | Smallest bundle (~1.2KB); no providers needed; built-in persist middleware for AsyncStorage/MMMV; simple store model ideal for game state (score, current player, die roll). Works perfectly with WatermelonDB for UI state. |

### UI & Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tamagui** | 2.x | UI component library | Best performance (compiler extracts static styles at build time); includes 80+ components (Button, Sheet, Dialog, etc.); universal (web + native); token-based theming perfect for game UI. Smaller bundle than alternatives. |
| **react-native-reanimated** | 3.x | Animations | Runs on UI thread (no JS bridge overhead); 60fps guaranteed; works with Gesture Handler for dice roll interactions; Layout animations for score updates. Industry standard. |
| **react-native-gesture-handler** | 2.x | Touch gestures | Required for dice roll swipe/tap; native gesture recognition; integrates with Reanimated for smooth 60fps animations. |

### Audio

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **expo-av** | ~56.0.0 | Sound effects | Official Expo audio; simple API for dice roll sounds, correct/incorrect answer sounds; preloading supported; works in Expo Go. Bundled with SDK 56. |

### Supporting Libraries (Mobile)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@react-native-async-storage/async-storage** | 2.x | Key-value storage | Zustand persist middleware; simple settings (sound on/off). |
| **expo-haptics** | ~56.0.0 | Haptic feedback | Dice roll vibration; correct/incorrect answer feedback; enhances in-person social gameplay. Bundled with Expo SDK. |
| **expo-screen-orientation** | ~56.0.0 | Lock orientation | Lock to portrait for consistent game conductor experience. Bundled with Expo SDK. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **ESLint + Prettier** | Code quality | Standard React Native config; Tamagui has specific lint rules. |
| **Vitest** | Unit tests | Fast, Jest-compatible; better TypeScript support. |
| **Maestro** | E2E tests | Mobile-focused alternative to Detox; simpler YAML syntax. |

## Installation (Mobile App)

```bash
# Create project with Expo SDK 56
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
| **Expo SDK 56** | React Native CLI | Only if you need native modules not supported by Expo (rare). Expo now has excellent native module support via config plugins. |
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

## Part 2: Question Pack System (Existing)

The following additions are needed for the question pack milestone: question pack data structure, AI question generation web app, and cloud storage for pack sync.

### Core Technologies (Question Pack)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Zod** | 4.x | Schema validation for question packs | TypeScript-first; shared types between mobile and web; JSON Schema export for API contracts; Zod 4 has 14x faster parsing and 2.3x smaller bundle than Zod 3. |
| **Vercel AI SDK** | 6.0.x | LLM abstraction layer | Provider-agnostic (switch between OpenAI/Anthropic); built-in structured output with Zod; streaming support; best DX for AI features. |
| **@ai-sdk/openai** | 3.0.x | OpenAI provider for AI SDK | Direct integration with Vercel AI SDK; GPT-4o access; provider can be swapped with one import change. |
| **Next.js** | 16.x | Question generator web app | App Router with Server Actions for secure LLM calls; deployed separately from mobile app; Edge runtime for AI SDK streaming. |
| **Supabase JS SDK** | 2.108.x | Cloud backend for question packs | Postgres for pack metadata; Storage for JSON pack files; works with Expo Go without config plugins; relational model fits pack/category/question hierarchy. |

### Supporting Libraries (Question Pack)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **expo-file-system** | 56.0.x | Local pack storage | Mobile app: download packs to device, cache management, store JSON files locally. |
| **react-native-url-polyfill** | 2.0.x | URL polyfill for Supabase | Mobile app: required for Supabase client in React Native environment. |
| **@ai-sdk/anthropic** | (optional) | Anthropic provider alternative | Optional: swap providers by changing one import if preferring Claude. |

---

## Part 3: Web Deployment (NEW)

The following additions are needed for web deployment of both mobile app and generator app to Netlify.

### No New Runtime Dependencies

Web deployment requires **configuration changes only** — no new packages to install.

### Expo Web Export (Mobile App)

| Configuration | Setting | Purpose |
|---------------|---------|---------|
| `app.json` → `web.output` | `"static"` | Generate static HTML files for each route |
| `app.json` → `web.favicon` | `"./assets/favicon.png"` | Browser tab icon (already exists) |
| `public/manifest.json` | (new file) | PWA manifest for Add to Home Screen |
| `public/icons/icon-192.png` | (new file) | Android home screen icon |
| `public/icons/icon-512.png` | (new file) | Android large icon, splash screen |

**Why static export:** Expo Router supports three web output modes:
- `"single"` (default) — SPA with client-side routing, single HTML file
- `"static"` — Pre-rendered HTML for each route, works on any static host
- `"server"` — Node.js server for API routes

**Recommendation:** Use `"static"` because:
1. Netlify static hosting is free
2. No server-side runtime needed for game app
3. Faster CDN distribution
4. PWA support works better with static files

### Next.js Static Export (Generator App)

| Configuration | Setting | Purpose |
|---------------|---------|---------|
| `next.config.ts` → `output` | `"export"` | Already configured — static site generation |
| `next.config.ts` → `images.unoptimized` | `true` | Already configured — required for static export |
| `next.config.ts` → `trailingSlash` | `true` | Already configured — clean URLs without `.html` |
| `next.config.ts` → `distDir` | `"out"` | Already configured — output directory |

**Why static export:** Generator app needs no server-side features:
- AI generation runs locally via Ollama (dev-only)
- No API routes in production
- Static site can be deployed to any CDN

**Current configuration is correct** — no changes needed.

### Turborepo Build Configuration

Update `turbo.json` to include web build outputs:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**", "out/**", ".next/**", "!.next/cache/**"]
    },
    "mobile#build": {
      "outputs": ["dist/**"]
    },
    "generator#build": {
      "outputs": ["out/**"]
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

### Netlify Deployment Configuration

#### apps/mobile/netlify.toml (NEW)

```toml
[build]
  # Build from monorepo root
  base = ""
  command = "pnpm turbo run build --filter=@trivial-world/mobile"
  publish = "apps/mobile/dist"

[build.environment]
  NODE_VERSION = "20"

# PWA headers for manifest
[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"

# Cache static assets aggressively
[[headers]]
  for = "/_expo/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Cache images and fonts
[[headers]]
  for = "/*.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.woff2"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

#### apps/generator/netlify.toml (NEW)

```toml
[build]
  # Build from monorepo root
  command = "pnpm turbo run build --filter=@trivial-world/generator"
  publish = "apps/generator/out"

[build.environment]
  NODE_VERSION = "20"

# SPA fallback for client-side routing (if needed)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Cache static assets aggressively
[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### PWA Manifest (apps/mobile/public/manifest.json)

```json
{
  "name": "Trivial World",
  "short_name": "Trivial",
  "description": "Mobile trivia game for in-person social play",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### PWA Icon Requirements

| Size | File | Purpose |
|------|------|---------|
| 192x192 | `public/icons/icon-192.png` | Android home screen icon |
| 512x512 | `public/icons/icon-512.png` | Android large icon, splash screen |
| 180x180 | `public/apple-touch-icon.png` | iOS home screen (optional) |
| 32x32 | `assets/favicon.png` | Browser tab (already exists) |

**Note:** PWA icons should match the existing mobile app icons for consistency.

### Development Dependencies

```bash
# Install Netlify CLI for local testing (workspace root)
pnpm add -D -w netlify-cli
```

**Why at workspace root:** Single CLI installation can be used for both apps.

## What NOT to Use (Web Deployment)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **@netlify/plugin-nextjs** | Plugin designed for SSR/ISR, conflicts with static export; adds unnecessary build time | No plugin needed |
| **Netlify Functions** | Generator is fully static in production; AI runs locally in dev | Static export only |
| **next/image optimization** | Requires server runtime, not available in static export | `unoptimized: true` (already set) |
| **WatermelonDB on web (session-only)** | Per PROJECT.md WEB-01: session-only storage, no IndexedDB persistence needed | Zustand without persist middleware |
| **Zustand persist on web** | Project requirement: session-only storage for game state | Plain Zustand store |
| **Vercel deployment** | Monorepo with two separate sites is cleaner on Netlify | Two Netlify sites from one repo |

## Storage Strategy

### Mobile App (Native — Already Implemented)
- **Packs:** WatermelonDB with SQLite adapter
- **Game State:** Zustand with AsyncStorage persist

### Mobile App (Web — Session Only)
- **Packs:** WatermelonDB with LokiJS adapter + IndexedDB
  - **Caveat:** [Issue #1920](https://github.com/nozbe/watermelondb/issues/1920) reports data persistence bugs (June 2025)
  - **Mitigation:** Pack data is read-only during gameplay; load on app start
  - **Alternative:** For session-only, could skip WatermelonDB entirely and load packs from bundled JSON
- **Game State:** Zustand without persist (session-only per WEB-01)

### Generator App (Web Only)
- **Form State:** React Hook Form (already installed)
- **No persistence needed** — AI generation runs locally via Ollama in development

## Build Commands

```bash
# Mobile web build (from monorepo root)
pnpm turbo run build --filter=@trivial-world/mobile
# Output: apps/mobile/dist/

# Generator web build (from monorepo root)
pnpm turbo run build --filter=@trivial-world/generator
# Output: apps/generator/out/

# Build both apps
pnpm build
# Outputs: apps/mobile/dist/ and apps/generator/out/

# Local preview with Netlify CLI
npx netlify dev --filter=@trivial-world/mobile
npx netlify dev --filter=@trivial-world/generator
```

## Netlify Site Configuration

Create **two Netlify sites** pointing to the same GitHub repository:

| Site Name | Base Directory | Build Command | Publish Directory |
|-----------|---------------|---------------|-------------------|
| trivial-world-game | (root) | `pnpm turbo run build --filter=@trivial-world/mobile` | `apps/mobile/dist` |
| trivial-world-generator | (root) | `pnpm turbo run build --filter=@trivial-world/generator` | `apps/generator/out` |

**Branch:** Deploy from `main` branch

**Environment Variables:**
- `NODE_VERSION=20` — Required for Next.js 16 and Expo SDK 56

**Note:** Netlify auto-detects pnpm from `pnpm-lock.yaml` in the repo root. No additional configuration needed.

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| Expo SDK | 56.0.0 | React Native 0.85, React 19.2.3 | Current in project |
| Next.js | 16.0.0 | React 19 | Current in project (16.2.7 available) |
| Node.js | 20+ | Next.js 16, Expo SDK 56 | Netlify default, required |
| pnpm | 9.0.0 | Turborepo 2.0 | Current in project, Netlify auto-detects |
| Turborepo | 2.0.x | pnpm workspaces | Current in project |

## Verification Commands

```bash
# Verify mobile web build works
cd apps/mobile && pnpm expo export --platform web
# Check: apps/mobile/dist/index.html exists

# Verify generator web build works
cd apps/generator && pnpm next build
# Check: apps/generator/out/index.html exists

# Local Netlify preview
npx netlify dev --filter=@trivial-world/mobile
npx netlify dev --filter=@trivial-world/generator
```

---

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

### ADR-004: Two Netlify Sites from One Monorepo (Web Deployment)

**Context:** Need to deploy mobile app and generator app independently from same repo.

**Decision:** Create two Netlify sites, each with its own `netlify.toml` in the app directory.

**Rationale:**
1. **Independent deploys:** Changes to one app don't trigger rebuild of the other
2. **Separate domains:** Can use different subdomains (game.trivial.world, generator.trivial.world)
3. **Monorepo support:** Netlify's enhanced monorepo experience (2025) supports this natively
4. **Turborepo caching:** Build filtering (`--filter`) ensures only changed app is built

**Consequences:**
- Two Netlify site entries to manage
- Single `pnpm-lock.yaml` ensures dependency consistency
- Both sites deploy from `main` branch

### ADR-005: Static Export Only, No Server Runtime (Web Deployment)

**Context:** Both apps can be deployed as static sites.

**Decision:** Use static export for both apps, no server-side features.

**Rationale:**
1. **Game app:** Session-only storage (WEB-01), no API routes needed, PWA for offline
2. **Generator app:** AI runs locally in development (Ollama), production is static pack viewing
3. **Cost:** Free tier on Netlify for static sites
4. **Performance:** CDN edge caching, no cold starts

**Consequences:**
- No server-side features (API routes, ISR, SSR)
- PWA manifest required for Add to Home Screen on mobile
- Image optimization disabled (already set in next.config.ts)

### ADR-006: Zustand Without Persist for Web Game State

**Context:** Game state on web should be session-only per WEB-01.

**Decision:** Use Zustand without persist middleware for web game state.

**Rationale:**
1. **Project requirement:** WEB-01 specifies session-only storage
2. **Simplicity:** No IndexedDB complexity, no data persistence bugs
3. **Privacy:** No game data stored on device between sessions
4. **Consistency:** Native app continues to use AsyncStorage persist

**Consequences:**
- Game state lost on tab close/refresh (intentional)
- Pack data still available (bundled or loaded on start)
- Simpler web implementation

## Sources

### Mobile Stack
- [Expo SDK 56 Documentation](https://docs.expo.dev/versions/latest/) — SDK versions, React Native 0.85 compatibility (HIGH)
- [WatermelonDB Documentation](https://watermelondb.dev/docs/Setup) — Offline-first patterns, schema, sync (HIGH)
- [Zustand v5 Release](https://github.com/pmndrs/zustand/releases/tag/v5.0.0) — v5 changes, React 19 minimum (HIGH)
- [Tamagui Installation Guide](https://tamagui.dev/docs/intro/installation) — Setup, config, components (HIGH)
- [React Native Database Comparison 2026](https://www.pkgpulse.com/guides/expo-sqlite-vs-watermelondb-vs-realm-react-native-local-2026) — Performance benchmarks (MEDIUM)
- [Reanimated 3 Documentation](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures) — Animation performance (HIGH)

### Question Pack System
- [Zod 4 Documentation](https://zod.dev/v4) — Schema validation features, TypeScript integration (HIGH)
- [Vercel AI SDK](https://ai-sdk.dev) — LLM integration patterns, structured output (HIGH)
- [OpenAI Node SDK](https://github.com/openai/openai-node) — Direct API access (MEDIUM)
- [Expo Firebase Guide](https://docs.expo.dev/guides/using-firebase) — Expo compatibility, Expo Go limitations (HIGH)
- [Supabase Expo Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — Integration patterns (HIGH)
- [Next.js 16 Release](https://github.com/vercel/next.js/releases/tag/v16.0.0) — App Router features (HIGH)

### Web Deployment
- [Expo Web Export](https://github.com/expo/expo/blob/main/docs/pages/deploy/web.mdx) — Static export configuration, Netlify deployment (HIGH — Context7 `/expo/expo`)
- [Expo Router Static Rendering](https://github.com/expo/expo/blob/main/docs/pages/router/web/static-rendering.mdx) — `web.output: "static"` configuration (HIGH — Context7 `/expo/expo`)
- [Expo PWA Guide](https://github.com/expo/expo/blob/main/docs/pages/guides/progressive-web-apps.mdx) — Manifest file, icons, installation (HIGH — Context7 `/expo/expo`)
- [Next.js Static Export](https://nextjs.org/docs/pages/guides/static-exports) — `output: 'export'` configuration, limitations (HIGH — Context7 `/vercel/next.js`)
- [Netlify Monorepo Deployment](https://netli.fyi/blog/netlify-monorepo-deploys) — Multiple sites from one repo (HIGH)
- [Netlify pnpm Support](https://docs.netlify.com/build/configure-builds/manage-dependencies/) — Automatic pnpm detection (HIGH)
- [Turborepo Build Configuration](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/package-configurations.mdx) — Task outputs, monorepo caching (HIGH — Context7 `/vercel/turborepo`)
- [Zustand Persist Middleware](https://github.com/pmndrs/zustand/blob/main/docs/reference/middlewares/persist.md) — Session storage alternative (HIGH — Context7 `/pmndrs/zustand`)
- [WatermelonDB Database Adapters](https://watermelondb.dev/docs/Implementation/DatabaseAdapters) — LokiJS adapter for web (MEDIUM)
- [WatermelonDB Issue #1920](https://github.com/nozbe/watermelondb/issues/1920) — LokiJS data persistence bug (LOW — needs monitoring)
- [Next.js v16.2.7 Release](https://github.com/vercel/next.js/releases/tag/v16.2.7) — Current stable version (HIGH)

---
*Stack research for: Trivial World mobile app + Question Pack System + Web Deployment*
*Researched: 2026-06-08 (mobile), 2026-06-09 (web deployment)*