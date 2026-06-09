# Pitfalls Research

**Domain:** Web Deployment (Expo Web Export + Next.js Static + Netlify)
**Researched:** 2026-06-09
**Confidence:** HIGH (official documentation, GitHub issues, verified solutions)

---

## Critical Pitfalls

### Pitfall 1: Missing SPA Redirects for Client-Side Routing

**What goes wrong:**
Direct navigation to routes (e.g., `/game/setup` or `/generator/packs`) returns 404 errors. Routes work when navigating via links but fail on page refresh or direct URL entry.

**Why it happens:**
Netlify serves static files. When a user navigates directly to `/game/setup`, Netlify looks for a file at that path. Since the app is an SPA with client-side routing, no such file exists - only `index.html` at the root.

**How to avoid:**
Create `netlify.toml` with redirect rules for all client-side routes:

```toml
# For mobile app (Expo export)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# For generator (Next.js static export) - if using dynamic routes
[[redirects]]
  from = "/packs/*"
  to = "/packs/[id].html"
  status = 200
```

**Warning signs:**
- Routes work via `<Link>` components but 404 on direct URL entry
- Browser refresh shows Netlify 404 page
- URL changes work but server returns 404 status code

**Phase to address:**
WEB-01 (Game web app) and WEB-02 (Generator web app) - before deployment

---

### Pitfall 2: Expo Grouped Routes 404 Errors

**What goes wrong:**
Routes under `(group)` folders (e.g., `(tabs)/index`) throw 404 errors when deployed. Works locally but fails in production.

**Why it happens:**
Expo Router had a bug where grouped routes weren't properly mapped for server output. Fixed in expo-router v3.5.17+.

**How to avoid:**
- Update to expo-router >= 3.5.17
- Verify `expo-router` version in `package.json`
- Test grouped routes work after `npx expo export --platform web`

**Warning signs:**
- Routes like `(tabs)/home` return 404 in production
- Works in development (`npx expo start`)
- Other routes (non-grouped) work fine

**Phase to address:**
WEB-01 - during initial web export testing

---

### Pitfall 3: Native Modules Without Web Fallbacks

**What goes wrong:**
App crashes or throws errors when calling `expo-haptics` or `expo-screen-orientation` on web. Errors like "Native module not available" or undefined function calls.

**Why it happens:**
Some Expo modules have native implementations without web equivalents. While recent versions (SDK 55+) added web support for haptics via Web Vibration API, older versions or incorrect imports can cause failures.

**How to avoid:**
1. Verify `expo-haptics` version >= 14.1.0 (web support added April 2025)
2. Wrap native module calls in platform checks:

```typescript
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const triggerHaptic = async () => {
  if (Platform.OS !== 'web') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  // On web, haptics gracefully fall back to no-op
};
```

3. For screen orientation, verify event listeners work on web (fixed December 2024 in PR #33361)

**Warning signs:**
- Console errors about missing native modules
- App works on iOS/Android but white screen on web
- "Module not found" errors for Expo modules

**Phase to address:**
WEB-01 - during mobile app web export, when testing native module calls

---

### Pitfall 4: Zustand Persist Hydration Mismatch on SSR

**What goes wrong:**
React hydration errors: "Hydration failed because the initial UI does not match what was rendered on the server" or "Text content does not match server-rendered HTML."

**Why it happens:**
Zustand's `persist` middleware loads state asynchronously from storage. In SSR (or static export with initial render), the server renders with initial state while the client has already hydrated from localStorage/sessionStorage.

**How to avoid:**
For session-only storage (as specified in v3.0), use sessionStorage with hydration handling:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useGameStore = create(
  persist(
    (set) => ({
      // game state
    }),
    {
      name: 'trivial-world-session',
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true, // For SSR/static export
    }
  )
);

// In component:
useEffect(() => {
  useGameStore.persist.rehydrate();
}, []);
```

**Warning signs:**
- Console hydration warnings in browser
- State flickers on initial load (default values then persisted values)
- "Cannot read property of undefined" during first render

**Phase to address:**
WEB-01 - when migrating WatermelonDB to sessionStorage for web

---

### Pitfall 5: Outdated Expo Export Commands

**What goes wrong:**
Build fails with "command not found: expo build:web" or "command not found: expo export:web". CI/CD pipeline errors on Netlify.

**Why it happens:**
Expo renamed commands. Old tutorials use `expo build:web` or `expo export:web`, but current command is `npx expo export --platform web`. Output directory also changed from `web-build` to `dist`.

**How to avoid:**
Use correct commands:
- Build: `npx expo export --platform web`
- Output directory: `dist/` (not `web-build/`)
- For development server: `npx expo start --web`

**Warning signs:**
- "expo build:web is deprecated" warnings
- Netlify build fails with command not found
- Publish directory doesn't exist after build

**Phase to address:**
WEB-01, WEB-03 - during initial Netlify configuration

---

### Pitfall 6: Next.js 16 Static Export RSC Path Errors

**What goes wrong:**
Static export produces 404 errors for pages. Browser requests `/page/__next.page.__PAGE__.txt` but file exists at `/page/__next.page/__PAGE__.txt` (path separator mismatch with dots vs slashes).

**Why it happens:**
Next.js 16.0.0-16.1.1 has a bug with RSC (React Server Components) payload file paths in static exports.

**How to avoid:**
- Check Next.js version in `apps/generator/package.json`
- If using Next.js 16.0.0-16.1.1, either:
  1. Use build adapter workaround (see [nextjs-rsc-issue-adapter](https://github.com/Aaakul/nextjs-rsc-issue-adapter))
  2. Upgrade to Next.js >= 16.1.2 (when fix available)
  3. Downgrade to Next.js 15 for static exports

**Warning signs:**
- Static export succeeds but pages return 404
- Browser console shows 404 for `.txt` RSC files
- Path separator mismatch in network tab requests

**Phase to address:**
WEB-02 - when configuring Next.js static export for generator

---

### Pitfall 7: Monorepo Turborepo Netlify Build Configuration

**What goes wrong:**
- Changes to one app trigger rebuilds of both apps
- Netlify can't find build artifacts
- Base directory misconfiguration causes wrong paths

**Why it happens:**
Monorepo deployments require specific configuration. Without proper setup, Netlify may:
- Run builds from wrong directory
- Not find `netlify.toml` in app subdirectory
- Rebuild all apps when only one changed

**How to avoid:**
Create separate `netlify.toml` files for each app:

**apps/mobile/netlify.toml:**
```toml
[build]
  command = "npx turbo run build:web --filter=@trivial-world/mobile"
  publish = "apps/mobile/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**apps/generator/netlify.toml:**
```toml
[build]
  command = "npx turbo run build --filter=@trivial-world/generator"
  publish = "apps/generator/out"
```

Netlify Site Settings:
- Base directory: (leave unset for repo root)
- Package directory: `apps/mobile` or `apps/generator`

**Warning signs:**
- "Publish directory not found" errors
- Both apps rebuild when only one changed
- netlify.toml not being read

**Phase to address:**
WEB-03 - when setting up Netlify sites and GitHub sync

---

### Pitfall 8: PWA Service Worker Cache Blocking Updates

**What goes wrong:**
Users don't receive app updates. Old version persists even after new deployment. Service worker serves cached assets indefinitely.

**Why it happens:**
Aggressive service worker caching can prevent users from receiving updates. Service workers only update when all browser tabs are closed.

**How to avoid:**
1. Be cautious with service worker implementation
2. Use Workbox with appropriate caching strategies
3. Test update flow: deploy -> hard refresh -> verify new version
4. Consider NOT implementing full PWA for v3.0 (just add to home screen manifest)

**Warning signs:**
- Deploy succeeds but users see old version
- "Update available" prompt never appears
- Cache-Control headers ignored

**Phase to address:**
WEB-04 - when adding PWA manifest

---

### Pitfall 9: React Native Web CSS Property Differences

**What goes wrong:**
Styles that work on mobile break on web. Properties like `flex: 1`, shadows, and transforms behave differently. Text not wrapping in `<View>` components.

**Why it happens:**
React Native uses a subset of CSS with different defaults:
- `flexDirection` defaults to `column` (web defaults to `row`)
- No CSS Grid support
- Shadows require platform-specific properties
- Text must be in `<Text>` components (web allows text in `<div>`)

**How to avoid:**
1. Use `Platform.select` for web-specific styles:

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      web: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
      default: { flexDirection: 'row' }
    })
  }
});
```

2. Always wrap text in `<Text>` components
3. Use `.web.tsx` file extensions for web-specific components
4. Test all screens on web during development

**Warning signs:**
- Layout broken on web but fine on mobile
- Text not rendering inside Views
- Styles not applying as expected

**Phase to address:**
WEB-01 - when testing mobile app on web platform

---

### Pitfall 10: Zustand Schema Migration Breaking Persisted State

**What goes wrong:**
App crashes or shows undefined values after deploying changes to store structure. Users' persisted session data becomes incompatible with new code.

**Why it happens:**
Persisted state in sessionStorage has the old schema. When code expects new fields or renamed properties, undefined values cause runtime errors.

**How to avoid:**
Use Zustand's version and migrate options:

```typescript
const useGameStore = create(
  persist(
    (set, get) => ({
      // Current schema
      players: [],
      currentTurn: 0,
      // ...
    }),
    {
      name: 'trivial-world-session',
      storage: createJSONStorage(() => sessionStorage),
      version: 1, // Increment when schema changes
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Migration from v0 to v1
          return {
            ...persistedState,
            // Transform old schema to new
          };
        }
        return persistedState;
      },
    }
  )
);
```

**Warning signs:**
- JavaScript errors on first load after deployment
- Missing fields in state after refresh
- Console warnings about undefined properties

**Phase to address:**
WEB-01 - ongoing as game state schema evolves

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip platform checks for native modules | Faster development | Web crashes at runtime | Never - always check Platform.OS |
| Use localStorage instead of sessionStorage | Persistence across sessions | State leakage between games, stale data | Never for game state |
| Omit Zustand version migrations | Simpler code | Breaking changes for returning users | Only if no persisted state |
| Skip netlify.toml redirects | Works for simple routes | 404s on all deep links | Never for SPAs |
| Ignore PWA manifest initially | Faster to launch | Users can't install app | Acceptable for v3.0 MVP |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Netlify + Turborepo | Build from app directory instead of repo root | Set base to repo root, package dir to app folder |
| Expo export + Netlify | Wrong publish directory (`web-build` vs `dist`) | Use `dist` for SDK 50+ |
| Zustand + SSR | Access store before hydration completes | Use `skipHydration` or `onFinishHydration` callback |
| Service Worker + Netlify | Aggressive caching blocks updates | Use short TTL or skip SW for MVP |
| Next.js static + dynamic routes | No fallback for unmatched paths | Add `[[...catchAll]].html` or redirect rules |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Large bundle sizes | Slow initial load, Lighthouse warnings | Code splitting, lazy loading | >500KB initial bundle |
| Unoptimized images | Long load times on mobile | Use responsive images, WebP | >100KB images |
| Too many Zustand stores | Complex state sync, race conditions | Single store with slices | >5 stores |
| WatermelonDB to sessionStorage | Migration complexity, data loss | Keep WatermelonDB for mobile, sessionStorage for web | Never appropriate to mix |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing sensitive data in sessionStorage | XSS attacks can read data | Only store non-sensitive game state |
| Exposing API keys in web bundle | Keys stolen and abused | All AI generation is dev-only (Ollama), no API keys in production |
| Missing Content Security Policy | XSS vulnerabilities | Add CSP headers in netlify.toml |
| Overly permissive CORS | Cross-origin attacks | Restrict to same-origin for game app |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Mobile tab bars on web | Unusual navigation pattern for desktop users | Use `<Slot />` with custom header/footer for web |
| No offline indicator | Users confused when features don't work | Show "Offline" banner, disable network-dependent features |
| Deep links without redirects | Users see 404 on refresh | Configure SPA redirects in netlify.toml |
| No PWA install prompt | Users don't realize mobile app is available | Add "Add to Home Screen" prompts |
| Long initial load | Users leave before app starts | Lazy load routes, optimize bundle |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **SPA Routing:** Works on direct URL entry (not just link navigation) - test with `/game/setup` directly
- [ ] **Native Modules:** All native module calls have web fallbacks - check `expo-haptics`, `expo-screen-orientation`
- [ ] **Grouped Routes:** Routes under `(group)` folders work in production - verify expo-router >= 3.5.17
- [ ] **State Hydration:** No hydration warnings in console - test Zustand persist with SSR/static
- [ ] **Build Commands:** Use `npx expo export --platform web` not deprecated commands
- [ ] **Publish Directory:** Output goes to `dist/` not `web-build/`
- [ ] **Monorepo Config:** Each app has its own `netlify.toml` with correct base/package directories
- [ ] **Update Flow:** Service worker allows updates (or skip SW for MVP)
- [ ] **PWA Manifest:** Icons at 192x192 and 512x512 minimum, manifest linked in HTML
- [ ] **Text Wrapping:** All text wrapped in `<Text>` components (no bare text in Views)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Missing SPA redirects | LOW | Add redirect rules, redeploy |
| Outdated Expo commands | LOW | Update build script in netlify.toml |
| Native modules without web fallbacks | MEDIUM | Add Platform.OS checks, test on web |
| Zustand hydration mismatch | MEDIUM | Add skipHydration, test static export |
| Monorepo build configuration | MEDIUM | Reconfigure Netlify site settings, redeploy |
| Schema migration breaking state | HIGH | Implement version+migrate, clear user storage |
| Next.js RSC path errors | HIGH | Upgrade/downgrade Next.js, or use adapter |
| Service worker blocking updates | HIGH | Clear all user browser tabs, or force SW update |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Missing SPA redirects | WEB-01, WEB-02 | Test direct URL navigation |
| Grouped routes 404 | WEB-01 | Verify expo-router version, test grouped routes |
| Native modules without web fallback | WEB-01 | Call all native modules on web, check console |
| Zustand hydration mismatch | WEB-01 | Check console for hydration errors |
| Outdated export commands | WEB-01, WEB-03 | Verify `npx expo export --platform web` |
| Next.js RSC errors | WEB-02 | Test static export pages load correctly |
| Monorepo Netlify config | WEB-03 | Verify both sites deploy independently |
| Service worker caching | WEB-04 | Deploy update, verify users receive it |
| CSS property differences | WEB-01 | Visual testing on web browser |
| Schema migration | WEB-01 | Deploy schema change, test returning user |

---

## Sources

### Expo Web Export and Deployment
- [Expo Grouped Routes 404 Issue](https://github.com/expo/expo/issues/29883) - HIGH confidence (official GitHub issue, fixed in v3.5.17)
- [Expo Web Hosting Providers Docs](https://expo-expo.mintlify.app/deployment/hosting-providers) - HIGH confidence (official docs)
- [Expo CDN Cache Invalidation Issue](https://github.com/expo/expo/issues/45806) - HIGH confidence (official GitHub issue)
- [Expo Web Netlify Issue](https://github.com/expo/expo/issues/19351) - HIGH confidence (historical context)

### Next.js Static Export
- [Next.js Static Export Dynamic Routes Issue](https://github.com/vercel/next.js/issues/79380) - HIGH confidence (official GitHub issue)
- [Next.js 16 RSC Path Errors](https://github.com/vercel/next.js/issues/85374) - HIGH confidence (official GitHub issue, critical bug)
- [Netlify Next.js Rewrites Issue](https://answers.netlify.com/t/nextjs-rewrites-not-applied-on-spa-navigation/143270) - MEDIUM confidence (community forum)
- [Netlify Plugin Breaking Changes](https://github.com/opennextjs/opennextjs-netlify/issues/2756) - HIGH confidence (official GitHub issue)

### Expo Native Modules Web Support
- [Expo Haptics Web Support PR](https://github.com/expo/expo/pull/34131) - HIGH confidence (official PR, merged January 2025)
- [Expo Screen Orientation Web Fix](https://github.com/expo/expo/pull/33361) - HIGH confidence (official PR, fixed December 2024)
- [Expo Web Native Modules Architecture](https://github.com/expo/expo/pull/31662) - HIGH confidence (official PR)

### Zustand Persist and Storage
- [Zustand Persist Documentation](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md) - HIGH confidence (official docs)
- [Zustand Session Storage Discussion](https://github.com/pmndrs/zustand/discussions/1699) - MEDIUM confidence (community discussion)
- [Zustand Persist Middleware Guide](https://zustand.site/en/guides/persistence-and-middleware) - HIGH confidence (official docs)

### PWA and Service Workers
- [Expo PWA Guide](https://docs.expo.dev/guides/progressive-web-apps/) - HIGH confidence (official docs)
- [Expo Service Workers FYI](https://github.com/expo/fyi/blob/main/enabling-web-service-workers.md) - HIGH confidence (official Expo team resource)
- [Workbox Integration Example](https://github.com/expo/examples/blob/4820485f/with-workbox/README.md) - HIGH confidence (official example)

### Netlify Monorepo Deployment
- [Netlify Monorepo Deployment Guide](https://netli.fyi/blog/netlify-monorepo-deploys) - HIGH confidence (official Netlify docs)
- [Enhanced Monorepo Experience](https://www.netlify.com/blog/better-monorepos-on-netlify/) - HIGH confidence (official Netlify blog)
- [Netlify Monorepo Rebuilds Issue](https://answers.netlify.com/t/unnecessary-full-monorepo-redeployment-on-netlify-with-turborepo-cascading-builds-across-unmodified-apps/143169) - MEDIUM confidence (community forum)
- [Netlify CLI Deploy Issue](https://github.com/netlify/cli/issues/7342) - HIGH confidence (official GitHub issue)

### Expo Router and React Native Web
- [Expo Router Common Navigation Patterns](https://docs.expo.dev/router/basics/common-navigation-patterns) - HIGH confidence (official docs)
- [Expo Router v55 Web Improvements](https://expo.dev/blog/expo-router-v55-more-native-navigation-more-powerful-web) - HIGH confidence (official Expo blog)
- [Expo Router Web Best Practices](https://medium.com/@andrew.chester/expo-router-web-best-practices-lessons-from-converting-a-mobile-app-to-web-6c26cb67c8de) - MEDIUM confidence (community article)
- [React Native Web Styling Docs](https://necolas.github.io/react-native-web/docs/styling/) - HIGH confidence (official RNW docs)
- [NativeWind Platform Differences](https://www.nativewind.dev/docs/core-concepts/differences) - MEDIUM confidence (third-party library docs)

---

*Pitfalls research for: Web Deployment (Expo + Next.js + Netlify)*
*Researched: 2026-06-09*