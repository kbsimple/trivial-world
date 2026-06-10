---
created: 2026-06-10T23:28:04Z
title: Fix Netlify deployment - transpilePackages for Turbopack
area: deployment
files:
  - apps/generator/next.config.ts
status: completed
---

## Problem

Netlify build failed with error: "Module not found: Can't resolve '@trivial-world/types'" in the generator app. Turbopack (Next.js 16 default) doesn't automatically resolve local workspace packages in monorepos.

## Solution

Added `transpilePackages: ['@trivial-world/types']` to `apps/generator/next.config.ts` to tell Next.js/Turbopack to bundle the shared types package from the monorepo workspace.

Committed in: 31f89f7