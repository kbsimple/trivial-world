---
created: 2026-06-10T23:28:04Z
title: Fix Netlify deployment - remove Next.js plugin from game site
area: deployment
files:
  - netlify.toml
  - apps/generator/netlify.toml
status: completed
---

## Problem

Netlify build failed with error: "@netlify/plugin-nextjs failed - Your publish directory does not contain expected Next.js build output." The game site uses Expo static export, not Next.js, so the Next.js plugin was failing.

## Solution

1. Removed `@netlify/plugin-nextjs` from root `netlify.toml` since the game site doesn't use Next.js
2. Created `apps/generator/netlify.toml` with the Next.js plugin for the generator site only

Committed in: 174acf2