---
status: resolved
trigger: "__fbBatchedBridgeConfig is not set, cannot invoke native modules - error on web initial app load"
created: "2026-06-10T00:00:00.000Z"
updated: "2026-06-10T01:30:00.000Z"
---

# Debug Session: fbbatchedbridgeconfig-web-init

## Symptoms

**Error:**
```
entry-4879559292d5aaefd20cdc929bdf9515.js:666 Uncaught Invariant Violation: __fbBatchedBridgeConfig is not set, cannot invoke native modules
```

**Environment:** Web browser (Netlify/localhost)
**When:** On initial app load
**Expected:** App loads in web browser without errors
**Actual:** App crashes immediately with native bridge error

## Context

- Project: Trivial World (Expo/React Native trivia game)
- Phase: 10 (Netlify Deployment)
- Recent work: Phase 9 completed Mobile Web Export
- Platform target: Web + Mobile

## Root Cause

**The error was caused by React Native's NativeModules initialization code running on web without the required globals.**

React Native's NativeModules.js checks:
```javascript
if (global.nativeModuleProxy) {
  NativeModules = global.nativeModuleProxy;
} else {
  const config = global.__fbBatchedBridgeConfig;
  invariant(config, '__fbBatchedBridgeConfig is not set, cannot invoke native modules');
}
```

On web, `nativeModuleProxy` is never set because there's no native bridge. React Native Web should set this, but the Expo/React Native Web initialization wasn't providing it before the NativeModules code evaluated.

## Fix Applied

**Three-part fix:**

1. **Metro config** - Mock WatermelonDB and AsyncStorage for web platform (already had this, but wasn't the root cause)

2. **HTML polyfill** - Added inline script to set `window.nativeModuleProxy = {}` before React Native bundle evaluates:
   ```html
   <script>
     if (typeof window.nativeModuleProxy === 'undefined') {
       window.nativeModuleProxy = {};
     }
   </script>
   ```
   File: `apps/mobile/public/index.html`

3. **Mock files** - Created mock implementations for native-only modules (optional but clean):
   - `apps/mobile/__mocks__/watermelondb.ts`
   - `apps/mobile/__mocks__/async-storage.ts`

## Verification

**E2E tests pass:**
```
Running 4 tests using 4 workers
✓ should load the app without critical console errors
✓ should load without native module errors
✓ should have correct page title
✓ should render React Native Web app
4 passed (3.3s)
```

## Files Changed

| File | Change |
|------|--------|
| `apps/mobile/public/index.html` | Added polyfill script for `nativeModuleProxy` |
| `apps/mobile/metro.config.js` | Mock WatermelonDB and AsyncStorage for web |
| `apps/mobile/__mocks__/watermelondb.ts` | Mock file (optional) |
| `apps/mobile/__mocks__/async-storage.ts` | Mock file (optional) |

## Lessons Learned

1. **React Native Web requires `nativeModuleProxy`** - React Native's NativeModules code checks for either `nativeModuleProxy` or `__fbBatchedBridgeConfig` on web. Without either, it throws.

2. **Expo's polyfill wasn't enough** - Expo's `installExpoGlobalPolyfill` sets up `globalThis.expo` but doesn't set `nativeModuleProxy`.

3. **HTML polyfills run before bundle** - Adding a script in `<head>` ensures it runs before React Native's bundle evaluates.

## References

- [Expo FYI: fb-batched-bridge-config-web.md](https://github.com/expo/fyi/blob/main/fb-batched-bridge-config-web.md)
- [React Native for Web documentation](https://necolas.github.io/react-native-web/docs/multi-platform/)