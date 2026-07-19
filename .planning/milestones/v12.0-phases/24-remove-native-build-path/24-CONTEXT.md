# Phase 24: Remove Native Android/iOS Build Path - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Remove the native (Android/iOS) build path and the WatermelonDB native database layer, collapsing the app to a single web/PWA target. Delete the `database/` directory, `services/packDownloader.ts`, native platform extensions (`services/platformStorage.native.ts`), and the `Platform.OS` branches across stores/services/UI that gated native vs web. Remove the `@nozbe/watermelondb` and `@react-native-async-storage/async-storage` dependencies, the `android`/`ios` blocks from `app.config.js`, the `android`/`ios` npm scripts, android icon assets, and the empty `dist-ios/`. Simplify `metro.config.js` (drop the native-mock resolver) and `babel.config.js` (drop WatermelonDB decorator plugins). Rewrite the native-path tests (`questionStore.test.ts`, `packStore.test.ts`) to cover the web path; update `__mocks__/react-native.ts` to `Platform.OS = 'web'`. Update README to reflect web/PWA-only deployment.

Gates: full test suite green, `tsc --noEmit` clean, `pnpm build:web` succeeds.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/removal phase. Use ROADMAP phase goal, success criteria, and existing codebase conventions to guide decisions. The web/PWA path is already the sole functioning runtime; this phase deletes dead native code rather than building new behavior.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Web persistence already exists: `services/packCache.ts` + `services/packCache.web.ts` (IDB via `idb-keyval`), wired into `services/questionProvider.ts` (IDB-first) and `services/packIndex.ts` (offline fallback). This is the sole persistence layer after native removal.
- `__mocks__/react-native.ts` already centralizes the RN mock — set `Platform.OS = 'web'` here.
- `scripts/build-sw.mjs` + Service Worker layer (Phase 23) handle offline web behavior.

### Established Patterns
- Platform branching via `Platform.OS === 'web'` / `=== 'native'` across: `database/index.ts`, `app/index.tsx`, `app/_layout.tsx`, `app/game/_layout.tsx`, `app/packs/index.tsx`, `app/packs/combos.tsx`, `stores/packStore.ts`, `stores/questionStore.ts`, `utils/haptics.ts`, `components/PauseOverlay.tsx`, `services/packIndex.ts`, `services/questionProvider.ts`, `services/packCache.ts`. After collapse, web branches become the only path — remove the conditional and inline the web logic.
- Native-only artifacts to delete: `database/` (index.ts, migrations, models, schema.ts — WatermelonDB), `services/packDownloader.ts`, `services/platformStorage.native.ts`, `dist-ios/`, android icon assets under `assets/`.

### Integration Points
- `app.config.js`: drop `ios` and `android` blocks (keep `web`).
- `package.json`: drop `android`/`ios` scripts and `start` native default; remove `@nozbe/watermelondb` + `@react-native-async-storage/async-storage` deps; decorator babel plugins (`@babel/plugin-proposal-decorators`, `@babel/plugin-transform-class-properties`) can be dropped from devDependencies if only WatermelonDB used them.
- `metro.config.js`: drop the native-mock resolver.
- `babel.config.js`: drop WatermelonDB decorator plugins.
- Tests `stores/questionStore.test.ts`, `stores/packStore.test.ts`: rewrite native-path cases for the web path.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure/removal phase. Refer to ROADMAP phase goal and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss skipped for infrastructure phase.

</deferred>