# Project Research Summary

**Project:** Trivial World
**Domain:** Mobile trivia game with offline-first capability + Question Pack System + Web Deployment
**Researched:** 2026-06-09 (web deployment additions)
**Confidence:** HIGH

## Executive Summary

Trivial World is a mobile trivia game designed for in-person social play, extending to web deployment via Expo static export and Netlify. The v2.0 milestone added a question pack system with AI generation, and v3.0 adds PWA web deployment with session-only storage. The research confirms a well-established tech stack: Expo SDK 56 with React Native 0.85, WatermelonDB for offline-first storage on mobile, Zustand for state management, and Tamagui for UI.

The recommended architecture uses platform-specific adapters: WatermelonDB + AsyncStorage for mobile, bundled questions + sessionStorage for web. The monorepo deploys to two separate Netlify sites: the game app exports as a static PWA, while the generator app (Next.js static export) remains unchanged. Key decisions include using Platform.OS checks to guard native modules, Zustand without persist middleware for web game state, and shell-only service worker caching.

The primary risks for web deployment are: (1) SPA routing 404s without proper netlify.toml redirects, (2) Zustand hydration mismatches on static export, and (3) React Native Web CSS property differences. For question packs, key risks are AI hallucination (20-45% factual issues), prompt injection attacks, and schema migration breaking local packs. All have documented mitigation strategies.

## Key Findings

### Recommended Stack

The mobile app uses Expo SDK 56 with React Native 0.85, Zustand 5.x for state, WatermelonDB for offline-first data, and Tamagui 2.x for UI. Web deployment requires configuration changes rather than new packages. The monorepo uses pnpm workspaces with Turborepo for build orchestration.

**Core technologies:**
- **Expo SDK 56**: Mobile framework with static web export — best DX, managed workflow, New Architecture mandatory
- **React Native 0.85**: Cross-platform runtime — Hermes V1 default, excellent gesture/animation support
- **WatermelonDB**: Offline-first database (mobile only) — lazy loading, observable queries, scales to 50k+ records
- **Zustand 5.x**: State management — session-only storage for web via sessionStorage, AsyncStorage persist for mobile
- **Tamagui 2.x**: UI components — universal (web + native), compiler optimization, 80+ components
- **Next.js 16**: Generator app — already configured for static export, App Router with Server Actions
- **Zod 4.x**: Schema validation — shared types between mobile and web, JSON Schema export
- **Vercel AI SDK**: LLM abstraction — provider-agnostic, structured output, fact-checking pipeline
- **Supabase**: Cloud backend — Postgres for pack metadata, Storage for JSON files
- **Netlify**: Deployment platform — two sites from one monorepo, static hosting

**Critical version requirements:**
- Node.js 20+ required for Next.js 16 and Expo SDK 56
- expo-router >= 3.5.17 for grouped routes web support (bug fix)
- Next.js >= 16.1.2 if RSC path issues occur (or use adapter)

### Expected Features

**Must have (table stakes for PWA):**
- Web app manifest with 192px/512px icons — required for installability
- HTTPS deployment — Netlify provides by default
- SPA redirects — prevents 404 on direct route access
- Service worker for shell caching — prevents blank screen on reload
- Session-only storage — sessionStorage for game state, no IndexedDB complexity
- Question Pack Storage Model — Local-first schema with versioning
- Pack Selection UI — List, select, view metadata
- Schema Validation — JSON schema validation on import

**Should have (differentiators):**
- Maskable icons for Android — adaptive icons look native on home screen
- iOS-specific meta tags — better splash screens and status bar integration
- Custom install prompt UX — intercept beforeinstallprompt for better user flow
- AI-Powered Generation — Users create custom packs from any topic
- Question Explanations — Show why an answer is correct
- Quality Score Indicators — Visual confidence scores for packs

**Defer (v4+):**
- iOS splash screen images — many device variants, high implementation cost
- Share intent handling — requires deep link handling
- Full offline mode — question packs need download, not essential for web MVP
- Cloud Pack Repository — Download packs from central server
- Real-Time Multiplayer Sync — Undermines conductor model, anti-feature

### Architecture Approach

The architecture uses platform-specific adapters: WatermelonDB + AsyncStorage for mobile, bundled questions + sessionStorage for web. The monorepo structure separates concerns with shared types in `@trivial-world/types`.

**Major components:**
1. **Platform storage layer** (`services/platformStorage.ts`) — abstracts AsyncStorage (mobile) vs sessionStorage (web)
2. **Question provider** (`services/questionProvider.ts`) — database queries on mobile, in-memory bundle on web
3. **App layout initialization** — conditional WatermelonDB initialization (mobile only)
4. **Shared Types Package** (`@trivial-world/types`) — Zod schemas for question packs, categories, validation
5. **Generator Web App** (Next.js) — AI-powered question generation, pack management, static export
6. **Two Netlify sites** — independent deployment from shared monorepo

### Critical Pitfalls

**Web Deployment (v3.0):**

1. **Missing SPA redirects** — Netlify serves static files; without redirect rules, direct navigation to `/game/setup` returns 404. Create `netlify.toml` with `from = "/*"` to `/index.html` before deployment.

2. **Expo grouped routes 404** — Routes under `(group)` folders threw 404 in production before expo-router v3.5.17. Verify version and test grouped routes after export.

3. **Native modules without web fallbacks** — `expo-haptics` works on web after SDK 55 (Web Vibration API), but wrap calls in `Platform.OS !== 'web'` checks. Screen orientation is no-op on web.

4. **Zustand hydration mismatch** — On static export, server renders initial state while client hydrates from storage. Use `skipHydration: true` and call `persist.rehydrate()` in `useEffect`.

5. **Outdated Expo export commands** — Use `npx expo export --platform web` (output to `dist/`), not deprecated `expo build:web`.

**Question Pack System (v2.0):**

6. **AI Hallucination** — 20-45% of AI-generated content has factual issues. Prevent with multi-model fact-checking, confidence scoring, human review queue.

7. **Prompt Injection** — #1 OWASP LLM security risk. Prevent with input sanitization, structured output enforcement, content moderation layer.

8. **Schema Migration Breaking Packs** — JSON schema changes break local cached packs. Prevent with version field in every payload, additive-only changes.

## Implications for Roadmap

Based on research combining both v2.0 (Question Pack) and v3.0 (Web Deployment), suggested phase structure:

### Phase 1: Mobile Web Export Configuration
**Rationale:** Foundation for web deployment — configuration changes only, no new packages. Must establish correct build process before adding features.
**Delivers:** Working static export of mobile app with proper output directory.
**Addresses:** WEB-01 foundation
**Avoids:** Pitfall 5 (outdated commands), Pitfall 2 (grouped routes with correct version)
**Key tasks:**
- Update `app.json` with `web.output: "static"`
- Add `build:web` script to package.json
- Verify expo-router >= 3.5.17
- Test `npx expo export --platform web` produces `dist/` directory

### Phase 2: Platform-Specific Storage Layer
**Rationale:** Core architectural change for web. Must separate mobile (WatermelonDB) from web (sessionStorage + bundled questions) before testing.
**Delivers:** Platform-aware storage that works on both mobile and web.
**Addresses:** WEB-01 storage requirement, PROJECT.md WEB-01 session-only
**Avoids:** Pitfall 3 (native module fallbacks), Pitfall 4 (Zustand hydration)
**Key tasks:**
- Create `services/platformStorage.ts` with Platform.OS detection
- Create `services/questionProvider.ts` with conditional database/bundle
- Update `_layout.tsx` with conditional WatermelonDB initialization
- Update game stores to use platform storage adapter

### Phase 3: Netlify Deployment Configuration
**Rationale:** Deploy both apps to production. Requires correct monorepo configuration.
**Delivers:** Two live Netlify sites (game and generator) from one repo.
**Addresses:** WEB-03 deployment
**Avoids:** Pitfall 1 (SPA redirects), Pitfall 7 (monorepo configuration)
**Key tasks:**
- Create `apps/mobile/netlify.toml` with SPA redirects
- Create `apps/generator/netlify.toml` (already static export ready)
- Configure two Netlify sites from GitHub repo
- Set correct base/package directories for monorepo

### Phase 4: PWA Manifest and Icons
**Rationale:** Enable "Add to Home Screen" functionality. Required for installability.
**Delivers:** PWA manifest with proper icons, enabling mobile installation.
**Addresses:** WEB-04 PWA features
**Avoids:** Pitfall 8 (service worker blocking updates) — skip aggressive caching
**Key tasks:**
- Create `web/manifest.json` with name, icons, theme colors
- Generate 192px and 512px icons from existing app icons
- Add manifest link to HTML template
- Test install prompt on Android Chrome and iOS Safari

### Phase 5: Web UI Polish and Testing
**Rationale:** Verify all screens render correctly on web. Address React Native Web CSS differences.
**Delivers:** Fully functional web app with proper layout on desktop browsers.
**Addresses:** Full user experience validation
**Avoids:** Pitfall 9 (CSS property differences)
**Key tasks:**
- Test all routes on web (direct URL entry, refresh, navigation)
- Verify text is wrapped in `<Text>` components
- Add Platform.select for web-specific styles where needed
- Test native module fallbacks (haptics, orientation)

### Phase Ordering Rationale

- **Configuration first (Phase 1-2):** Cannot test web without correct export and storage setup. These are prerequisites.
- **Deployment before polish (Phase 3-4):** Get working deployment early, then add PWA features. Deploying reveals integration issues.
- **Testing last (Phase 5):** Comprehensive web testing after all pieces in place. Earlier testing on broken builds wastes time.
- **PWA after basic deployment:** Manifest and icons are additive. Core functionality works without them.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Platform-specific storage implementation — Zustand persist behavior on web needs careful testing with skipHydration
- **Phase 4:** Service worker caching strategy — research recommends shell-only caching, but implementation details may need verification

Phases with standard patterns (skip research-phase):
- **Phase 1:** Well-documented Expo export configuration, follow official docs
- **Phase 3:** Standard Netlify monorepo deployment, documented in Netlify guides
- **Phase 5:** React Native Web CSS differences are known patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Expo docs, verified version compatibility, existing project uses proven stack |
| Features | HIGH | PWA requirements well-documented, clear distinction between table stakes and differentiators |
| Architecture | HIGH | Platform-specific storage pattern is standard, monorepo deployment well-documented |
| Pitfalls | HIGH | All pitfalls have official GitHub issues or documentation with solutions |

**Overall confidence:** HIGH

### Gaps to Address

- **WatermelonDB LokiJS adapter on web:** Issue #1920 reports data persistence bugs. Mitigation is session-only storage (bundled questions) instead of IndexedDB. This is already the recommended approach per PROJECT.md WEB-01.
- **Next.js 16.1.2 RSC path fix:** Monitor for release if RSC path errors occur. Current workaround is adapter or downgrade to Next.js 15 for static exports.
- **iOS Safari PWA limitations:** Background sync not supported, IndexedDB unreliable after 7 days. Design assumes session-only storage, so this gap is acceptable.
- **AI hallucination calibration:** Need prompt engineering testing during question generation to calibrate difficulty and fact-check quality.

## Sources

### Primary (HIGH confidence)
- `/expo/expo` (Context7) — Expo Web Export, PWA Guide, Static Rendering, Grouped Routes
- `/vercel/next.js` (Context7) — Next.js Static Export documentation
- `/pmndrs/zustand` (Context7) — Zustand Persist Middleware
- Expo SDK 56 Documentation — React Native 0.85 compatibility, New Architecture
- WatermelonDB Documentation — Offline-first patterns, database adapters
- Tamagui Installation Guide — Setup, config, components
- Netlify Monorepo Deployment Guide — Multiple sites from one repo
- Vercel AI SDK Documentation — LLM integration patterns, structured output
- Zod 4 Documentation — Schema validation, TypeScript integration
- OWASP Top 10 for LLM Applications 2025 — Security risks, prompt injection

### Secondary (MEDIUM confidence)
- PWA 2025 Field Guide — Anti-patterns and production considerations
- WatermelonDB Issue #1920 — LokiJS data persistence bug (needs monitoring)
- Expo Router Web Best Practices (community article) — Lessons from mobile-to-web conversion
- BBC/EBU News Integrity Study (October 2025) — AI hallucination rates
- NAACL 2025 Semantic Leakage paper — Category leakage in generated content

### Tertiary (LOW confidence)
- None identified — all critical sources are official documentation or verified GitHub issues

---
*Research completed: 2026-06-09*
*Ready for roadmap: yes*
