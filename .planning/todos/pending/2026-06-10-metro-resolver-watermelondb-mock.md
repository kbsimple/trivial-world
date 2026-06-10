---
created: 2026-06-10T23:28:04Z
title: Fix mobile web - Metro resolver mock for WatermelonDB
area: mobile
files:
  - apps/mobile/metro.config.js
status: completed
---

## Problem

The `.web.ts` stubs weren't being resolved correctly by Metro. The `__fbBatchedBridgeConfig` error still appeared because WatermelonDB was still being imported during module evaluation.

## Solution

Updated `metro.config.js` to use a custom `resolveRequest` handler that returns an empty module for all `@nozbe/watermelondb` imports on the web platform. This completely excludes WatermelonDB from web builds.

```js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === '@nozbe/watermelondb' || moduleName.startsWith('@nozbe/watermelondb/')) {
      return { type: 'empty' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

Committed in: bf4ba0d