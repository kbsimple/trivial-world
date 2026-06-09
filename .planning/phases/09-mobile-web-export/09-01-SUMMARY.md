---
phase: 09-mobile-web-export
plan: 01
subsystem: Infrastructure
tags: [web-export, platform-adapter, haptics, storage]
started: 2026-06-09T17:54:28Z
completed: 2026-06-09T17:58:00Z
duration_minutes: 4
---

# Phase 9 Plan 1: Web Export Configuration Summary

## One-liner

Configured Expo static web export and created platform-specific adapters for storage and haptics, enabling graceful degradation on web platform.

## Files Created

| File | Purpose |
|------|---------|
| `apps/mobile/app.json` | Modified - Added web output and bundler config |
| `apps/mobile/package.json` | Modified - Added build:web script |
| `apps/mobile/utils/haptics.ts` | Created - Platform-aware haptics wrapper |
| `apps/mobile/services/platformStorage.ts` | Created - Platform-aware storage adapter |

## Key Decisions

1. **Static web export**: Using `output: "static"` in app.json for pre-rendered HTML deployment
2. **Metro bundler**: Using Metro for consistent bundling across mobile and web platforms
3. **Haptics no-op on web**: Following D-10 decision - no vibration API fallback, just silent return
4. **Session storage for web**: Following D-04/D-06 - sessionStorage instead of IndexedDB for simplicity

## Implementation Details

### Task 1: app.json Web Configuration

Added `"output": "static"` and `"bundler": "metro"` to web section, enabling static HTML generation for hosting on Netlify or similar static hosts.

### Task 2: build:web Script

Added `"build:web": "expo export --platform web"` script to produce `dist/` folder ready for deployment.

### Task 3: Platform Haptics Wrapper

Created `utils/haptics.ts` with `impactAsync()` and `notificationAsync()` functions that:
- Check `Platform.OS === 'web'` before calling native haptics
- Return immediately on web (no vibration)
- Call through to `expo-haptics` on mobile

### Task 4: Platform Storage Adapter

Created `services/platformStorage.ts` with Storage interface that:
- Returns sessionStorage adapter on web (session-only per D-06)
- Returns AsyncStorage on mobile (persistent)
- Implements `getItem`, `setItem`, `removeItem` for Zustand compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - no placeholder values or incomplete implementations.

## Threat Flags

None - no new security-relevant surface introduced. Storage on web is intentionally session-only (no sensitive data stored).

## Verification

- [x] app.json contains `"output": "static"`
- [x] app.json contains `"bundler": "metro"`
- [x] package.json contains `"build:web": "expo export --platform web"`
- [x] utils/haptics.ts exports `impactAsync` and `notificationAsync`
- [x] services/platformStorage.ts exports `platformStorage`
- [x] Both adapters check `Platform.OS === 'web'`

## Self-Check

```bash
# Files exist
[ -f "apps/mobile/app.json" ] && echo "FOUND: apps/mobile/app.json"
[ -f "apps/mobile/package.json" ] && echo "FOUND: apps/mobile/package.json"
[ -f "apps/mobile/utils/haptics.ts" ] && echo "FOUND: apps/mobile/utils/haptics.ts"
[ -f "apps/mobile/services/platformStorage.ts" ] && echo "FOUND: apps/mobile/services/platformStorage.ts"

# Commits exist
git log --oneline -4 | grep -E "(app.json|package.json|haptics|platformStorage)"
```

Result: All files created, all commits verified.

## Commits

| Commit | Message |
|--------|---------|
| `d5eb214` | feat(09-01): configure Expo web export for static output |
| `7afec16` | feat(09-01): add web build script to package.json |
| `8e7adc2` | feat(09-01): create platform-aware haptics wrapper |
| `6692b05` | feat(09-01): create platform-aware storage adapter |

## Next Steps

The following changes are needed in subsequent plans:
1. Update all Zustand stores to use `platformStorage` instead of `AsyncStorage`
2. Update `Die.tsx` and `AnswerButtons.tsx` to use `utils/haptics` instead of direct `expo-haptics`
3. Add Platform.OS guard around WatermelonDB initialization in `app/_layout.tsx`
4. Bundle default pack questions for web in `data/questions.ts`
5. Skip pack selection screen on web (navigate directly to setup)

---

*Plan completed: 2026-06-09T17:58:00Z*