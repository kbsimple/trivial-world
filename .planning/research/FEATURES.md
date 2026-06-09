# Feature Research

**Domain:** PWA Web Deployment for Mobile-First Trivia Game
**Researched:** 2026-06-09
**Confidence:** HIGH (official documentation, multiple verified sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist for a PWA. Missing these = app cannot be installed or feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Web App Manifest | Required for PWA installability — browsers check for this | LOW | JSON file with name, icons (192px and 512px), start_url, display mode |
| HTTPS Deployment | Required for service workers and PWA installation | LOW | Netlify provides by default |
| Installable on Mobile | Users expect "Add to Home Screen" to work | LOW | Manifest + icons + HTTPS triggers install prompt |
| Proper Icons (192px, 512px) | Browsers require specific sizes for installability | LOW | Must include both sizes; maskable icons recommended for Android |
| Basic Offline Support | Users expect cached app to load without network | MEDIUM | Service worker with appropriate caching strategy |
| Mobile-Responsive Layout | PWA on phone must display correctly | LOW | Already mobile-first in existing app |

### Differentiators (Competitive Advantage)

Features that improve the experience beyond basic PWA requirements.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Maskable Icons (Android) | Adaptive icons that look native on Android home screen | LOW | Additional icon variant with safe zone padding |
| App Shell Caching | Instant load of UI shell even on slow networks | MEDIUM | Cache-first for static assets, network-first for HTML |
| iOS-Specific Meta Tags | Better splash screens and status bar integration on iOS | LOW | apple-mobile-web-app-capable, theme-color, touch icons |
| Install Prompt Handling | Custom "Install App" button instead of browser default | MEDIUM | Intercept beforeinstallprompt event for better UX |
| Session Storage Persistence | Game state survives tab refresh during play | MEDIUM | Already in scope: session-only storage, not IndexedDB |
| Share Intent Handling | Launch from share sheet with pack data | HIGH | Deferred — requires deep link handling |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good for PWAs but create problems for this use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Aggressive Offline Caching | "Works offline" sounds essential | Service worker bugs can brick the app; updates require all tabs closed; complex debugging | Cache shell only; rely on session storage for game state |
| Precaching All Questions | "Load everything for offline play" | Bundle size explosion; precaching 30+ seconds on slow connections; defeats lazy-loading | Keep existing lazy-load approach; cache pack JSON after selection |
| IndexedDB for Game State | "Persistent game saves" | iOS clears after 7 days of inactivity; quota limits unpredictable; overkill for session-only | Session storage as documented in PROJECT.md |
| Background Sync | "Sync packs in background" | Safari doesn't support; only Chromium browsers; adds complexity | Manual refresh button; explicit user action |
| Push Notifications | "Notify players about updates" | Requires user permission (high rejection rate); iOS Web Push requires install first; not useful for in-person game | Not applicable to social gameplay model |
| Full Offline Mode | "Play without any network" | Question packs need download; AI generator requires Ollama local | Online-first for pack loading; cached pack for gameplay |

## Feature Dependencies

```
[PWA Manifest]
    └──requires──> [Icons (192px, 512px)]
    └──requires──> [HTTPS Deployment]

[Service Worker]
    └──requires──> [HTTPS Deployment]
    └──conflicts──> [Session-Only Storage] (if caching aggressively)

[Install Prompt Handling]
    └──requires──> [PWA Manifest]
    └──requires──> [Service Worker]
    └──requires──> [HTTPS Deployment]

[iOS Meta Tags]
    └──requires──> [Touch Icon (180px)]
    └──requires──> [Splash Screen Images] (optional)

[Session Storage Persistence]
    └──conflicts──> [IndexedDB Offline Cache] (choose one approach)
```

### Dependency Notes

- **PWA Manifest requires Icons:** Browsers reject installation without both 192px and 512px icons. These must be generated from existing app icons.
- **Service Worker requires HTTPS:** Netlify provides this by default. Service workers are disabled in development (localhost exemption).
- **Service Worker conflicts with Session-Only Storage goal:** If SW caches aggressively, it undermines the session-only simplicity. Cache shell only, not game state.
- **Install Prompt Handling requires all PWA basics:** Before customizing the install prompt, all installability criteria must be met (manifest, SW, HTTPS, engagement heuristics).
- **iOS Meta Tags require iOS-specific assets:** Apple has unique requirements (180px touch icon, splash screens per device). Optional but improves iOS experience significantly.

## Platform-Specific Considerations

### Android (Chrome)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Manifest with icons | Required | 192px and 512px minimum |
| Service worker | Required | For installability |
| HTTPS | Required | Netlify provides |
| Install prompt | Auto-triggered | After engagement heuristics (30s view, click) |
| Maskable icons | Recommended | Adaptive icon support |

### iOS (Safari 16.4+)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Manifest with icons | Required | Same as Android |
| Service worker | Required | For installability |
| HTTPS | Required | Netlify provides |
| Install prompt | Manual | User must use Share → Add to Home Screen |
| Touch icon (180px) | Recommended | apple-touch-icon meta tag |
| apple-mobile-web-app-capable | Recommended | Enables standalone mode |
| Background Sync | NOT SUPPORTED | Must design fallbacks |
| IndexedDB | UNRELIABLE | Cleared after 7 days inactive |

### iOS (Safari 16.3 and earlier)

| Requirement | Status | Notes |
|-------------|--------|-------|
| PWA Installation | Safari only | Chrome/Firefox cannot install PWAs |
| Web Push | NOT SUPPORTED | N/A for this app |
| Storage | UNRELIABLE | High risk of data loss |

## Service Worker Strategy

### Recommended Approach: Shell-Only Caching

**What to cache:**
- HTML shell (index.html) — network-first with 3-5s timeout
- Versioned static assets (hashed JS/CSS) — cache-first (hash invalidates)
- Fonts — cache-first with long expiry
- Core images (logo, icons) — cache-first

**What NOT to cache:**
- API responses — network-only
- Question pack JSON — network-first (may want latest)
- Game state — session storage, not SW cache

### Expiration Configuration

```javascript
// Recommended Workbox configuration
new CacheFirst({
  cacheName: 'static-assets',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
    })
  ]
})
```

### Anti-Pattern to Avoid

**Precaching everything:** This causes 30+ second delays on mid-range phones over 3G. Only precache the shell; use runtime caching for everything else.

## Netlify Deployment Configuration

### Required netlify.toml

```toml
[build]
  command = "npx expo export --platform web"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/_expo/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Critical Note: Build Output Directory

Expo SDK 55 changed the output directory from `web-build` to `dist`. Many tutorials still reference the old directory. Use:
- Build command: `npx expo export --platform web`
- Publish directory: `dist`

## MVP Definition

### Launch With (v3.0 — Web Deployment)

Minimum viable web deployment — what's needed to deploy and be installable.

- [x] Manifest file with required fields — Without this, app cannot be installed
- [x] Icons at 192px and 512px — Required by browser installability checks
- [x] HTTPS deployment via Netlify — Required for service workers
- [x] Service worker for shell caching — Prevents blank screen on reload; caches static assets
- [x] Mobile-responsive web layout — Already achieved via Expo web export
- [x] Netlify redirects for SPA routing — Prevents 404 on direct route access
- [x] Session-only storage — No IndexedDB complexity; simpler than full offline

### Add After Validation (v3.x)

Features to add once basic web deployment works.

- [ ] Maskable icon for Android — Improves home screen appearance
- [ ] iOS-specific meta tags — Better iOS integration (apple-mobile-web-app-capable, etc.)
- [ ] iOS touch icon (180px) — Required for iOS Add to Home Screen
- [ ] Custom install prompt UX — Intercept beforeinstallprompt for better user flow
- [ ] Cache versioning with cleanup — Prevent old cache accumulation

### Future Consideration (v4+)

Features to defer until web deployment proves stable.

- [ ] iOS splash screen images — Per-device images for launch screen; many variants
- [ ] Share intent handling — Launch with pack data from share
- [ ] Offline pack caching — Download once, play offline with that pack
- [ ] Lighthouse PWA score >90 — Quality metric, not essential for launch

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Manifest + Icons | HIGH | LOW | P1 |
| HTTPS (Netlify) | HIGH | LOW | P1 |
| Service Worker (shell only) | HIGH | MEDIUM | P1 |
| SPA Redirects | HIGH | LOW | P1 |
| Session Storage | HIGH | LOW | P1 |
| Maskable Icons | MEDIUM | LOW | P2 |
| iOS Meta Tags | MEDIUM | LOW | P2 |
| Custom Install Prompt | MEDIUM | MEDIUM | P2 |
| iOS Touch Icon | MEDIUM | LOW | P2 |
| iOS Splash Screens | LOW | HIGH | P3 |
| Full Offline Mode | LOW | HIGH | P3 |
| Background Sync | LOW | HIGH | P3 |
| Push Notifications | NONE | HIGH | Exclude |

**Priority key:**
- P1: Must have for launch (web app must be installable and functional)
- P2: Should have, improves experience significantly
- P3: Nice to have, future consideration
- Exclude: Not applicable or actively harmful

## Dependency on Existing Features

This web deployment milestone depends on the following already-built features from v1.0 and v2.0:

| Existing Feature | Web Dependency | Notes |
|------------------|----------------|-------|
| Mobile game (Expo) | HIGH | Web export requires working mobile app |
| Pack selection UI | MEDIUM | Must render correctly in web browser |
| Question generator (Ollama) | LOW | Generator stays dev-only; production is static export |
| Built-in default pack | HIGH | Must load in web environment |
| Game state management | MEDIUM | Session storage must work in browser context |
| Expo Router navigation | HIGH | Must work with static export routing |

### Web-Specific Adjustments Needed

1. **Navigation:** Verify Expo Router works with static export (no dynamic routes without generateStaticParams)
2. **Storage:** Replace WatermelonDB with session storage for web (already planned per PROJECT.md)
3. **Haptics:** expo-haptics not available on web — graceful degradation needed
4. **Screen Orientation:** expo-screen-orientation not applicable on web — ignore or conditional

## Sources

- [Expo PWA Documentation](https://docs.expo.dev/guides/progressive-web-apps/) — Official Expo PWA setup guide (HIGH confidence)
- [web.dev Install Criteria](https://web.dev/articles/install-criteria) — Browser installability requirements (HIGH confidence)
- [MDN Making PWAs Installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) — PWA manifest requirements (HIGH confidence)
- [Expo Web Hosting Providers](https://expo-expo.mintlify.app/deployment/hosting-providers) — Netlify deployment configuration (HIGH confidence)
- [Expo Static Rendering](https://docs.expo.dev/router/web/static-rendering/) — Static export documentation (HIGH confidence)
- [PWA 2025 Field Guide](https://gothar.com/en/insights/pwa-2025) — Anti-patterns and production considerations (MEDIUM confidence)
- [Netlify Redirects Documentation](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/) — SPA routing configuration (HIGH confidence)

---
*Feature research for: PWA Web Deployment*
*Researched: 2026-06-09*