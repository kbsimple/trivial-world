# Phase 9: Mobile Web Export - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **web browser support for the game app via Expo static export** — enabling users to access Trivial World in a browser with session-only storage and graceful degradation of native features.

**In scope:**
- Expo web export configuration for game app
- Platform-specific storage adapter (AsyncStorage for mobile, sessionStorage for web)
- Question provider abstraction (WatermelonDB for mobile, bundled questions for web)
- Haptics graceful degradation (no-op on web)
- Visual parity via React Native Web CSS adjustments
- Web build and export scripts

**Out of scope:**
- Netlify deployment (Phase 10)
- PWA manifest and icons (Phase 11)
- Generator app web deployment (already Next.js static export ready)
- IndexedDB persistence (explicitly deferred per D-02)
- Service worker caching (deferred to v4.0)

</domain>

<decisions>
## Implementation Decisions

### Web Export Configuration

- **D-01:** Use Expo static export with `npx expo export --platform web`. This produces a static `dist/` folder deployable to any static hosting. No SSR needed — the app is client-side only.
- **D-02:** Configure `app.json` web section with: output directory `dist/`, bundler `metro`, no server rendering. The generator app already uses Next.js static export and doesn't need changes.
- **D-03:** Single build command for web: add `"build:web": "expo export --platform web"` to mobile package.json. Output goes to `apps/mobile/dist/`.

### Storage Layer

- **D-04:** Create platform-aware storage adapter in `services/platformStorage.ts`. Uses AsyncStorage on mobile (existing pattern) and sessionStorage on web. This implements D-02 from v3.0 decisions (session-only storage).
- **D-05:** All Zustand stores update to use the platform storage adapter instead of hardcoded AsyncStorage. The `createJSONStorage` pattern remains, only the storage backend changes.
- **D-06:** No IndexedDB. Session storage persists during browser session and clears on tab close. This matches the in-person social gameplay model — no long-term persistence needed for web.

### Question Source

- **D-07:** Create question provider abstraction in `services/questionProvider.ts`. Mobile continues using WatermelonDB with pack downloads. Web uses bundled questions from the built-in default pack.
- **D-08:** Bundle the 120 default pack questions in `data/questions.ts` for web. This file is imported directly on web, avoiding database queries.
- **D-09:** Web skips pack selection screen. When Platform.OS === 'web', the app flow goes: Home → Setup → Game. The bundled default pack is the only option for web in v3.0.

### Native Module Degradation

- **D-10:** Wrap haptics calls in platform check. Create `utils/haptics.ts` with `impactAsync()` and `notificationAsync()` functions that call expo-haptics on mobile and return immediately on web.
- **D-11:** Screen orientation is web-agnostic. Browsers don't lock orientation the same way. Remove `expo-screen-orientation` plugin from web build or make it mobile-only in app.json.
- **D-12:** All native module calls must have fallback. Pattern: `if (Platform.OS !== 'web') { nativeCall() }`.

### Visual Parity

- **D-13:** Use React Native Web's automatic style conversion for most components. Tamagui already handles web styles via its CSS extraction.
- **D-14:** Platform-specific adjustments via `Platform.select()`. Apply to: font weights (web renders lighter), shadow offsets, and any `elevation` props that don't translate to web.
- **D-15:** Test on Chrome, Firefox, and Safari. Primary test on mobile Chrome (Android) and Safari (iOS) for PWA preview.

### Claude's Discretion

- Exact font weight adjustments for web (usually +100-200 from mobile)
- Shadow/elevation replacement pattern (box-shadow on web)
- Web-specific CSS for any layout issues discovered during testing
- Loading state during web bundle initialization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, constraints
- `.planning/REQUIREMENTS.md` — WEBG-01 through WEBG-04 requirements
- `.planning/ROADMAP.md` — Phase 9 definition and success criteria
- `.planning/STATE.md` — v3.0 decisions (D-01, D-02, D-03)

### Research
- `.planning/research/ARCHITECTURE.md` — Platform-specific storage patterns, question provider abstraction, web deployment architecture (lines 100-250)
- `.planning/research/STACK.md` — Expo web export, React Native Web, Tamagui web support

### Prior Phase Context
- `.planning/phases/05-state-persistence/05-CONTEXT.md` — Storage pattern using Zustand persist middleware
- `.planning/phases/08-game-configuration/08-CONTEXT.md` — Pack selection flow, built-in default pack

### Key Code References
- `apps/mobile/stores/gameStore.ts` — AsyncStorage persist middleware pattern (lines 247-255)
- `apps/mobile/stores/playerStore.ts` — AsyncStorage persist middleware (same pattern)
- `apps/mobile/stores/questionStore.ts` — AsyncStorage persist with Set serialization
- `apps/mobile/stores/packStore.ts` — AsyncStorage persist for pack state
- `apps/mobile/app/_layout.tsx` — Database initialization (needs Platform.OS !== 'web' guard)
- `apps/mobile/components/Die.tsx` — Haptics usage (needs platform check)
- `apps/mobile/components/AnswerButtons.tsx` — Haptics usage (needs platform check)
- `apps/mobile/data/questions/` — Existing question data (source for bundled questions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Zustand persist middleware pattern**: Already used in gameStore, playerStore, questionStore, packStore — same pattern with platform-aware storage adapter
- **Tamagui config**: Already configured with themes — works for web automatically
- **Default pack questions**: 120 questions in `data/questions/` can be bundled for web
- **Expo Router**: File-based routing already in place — works for web

### Established Patterns
- **createJSONStorage from Zustand**: Accepts any storage interface — sessionStorage implements the same interface as AsyncStorage
- **Platform.OS from react-native**: Use for platform detection
- **Platform.select()**: Apply platform-specific values (font weights, shadows)
- **Expo plugins in app.json**: Configured for mobile plugins (haptics, orientation)

### Integration Points
- **services/platformStorage.ts**: New file for platform-aware storage adapter
- **services/questionProvider.ts**: New file for question source abstraction
- **utils/haptics.ts**: New file wrapping haptics with platform check
- **app/_layout.tsx**: Add Platform.OS guard around database initialization
- **app/index.tsx**: Skip pack selection screen on web, navigate directly to setup
- **app.json**: Add web output configuration

### Critical Changes
- **Stores**: Replace AsyncStorage import with platform storage adapter
- **Database initialization**: Guard with `if (Platform.OS !== 'web')`
- **Pack selection**: Skip on web (use bundled default pack)
- **Haptics calls**: Wrap in platform check
- **Web build**: Add build:web script to package.json

</code_context>

<specifics>
## Specific Ideas

- Web build should produce a `dist/` folder ready for static hosting
- Session storage persists game state during browser session (refresh keeps state)
- Haptics are mobile-only — no vibration API fallback for web
- Default pack (120 questions) bundled for web, no download needed
- Visual parity goal: same gameplay experience, minor styling adjustments acceptable

</specifics>

<deferred>
## Deferred Ideas

### IndexedDB Persistence for Web
- Longer-term storage for web (game state survives browser close)
- Would enable offline web gameplay
- Deferred to v4.0 (OFFW-01, OFFW-02, OFFW-03)

### Service Worker Caching
- Shell caching for faster loads
- Offline-first web experience
- Deferred to v4.0

### Pack Downloads for Web
- Fetching question packs from cloud on web
- Would require IndexedDB for offline pack storage
- Out of scope for v3.0 (session-only storage decision D-02)

### Custom Pack Selection on Web
- Let web users choose different question packs
- Would require pack download and IndexedDB
- Deferred — web uses bundled default pack only

</deferred>

---

*Phase: 09-mobile-web-export*
*Context gathered: 2026-06-09*