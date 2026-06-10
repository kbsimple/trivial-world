---
created: 2026-06-10T23:28:04Z
title: Fix Netlify deployment - add NETLIFY_NEXT_PLUGIN_SKIP
area: deployment
files:
  - netlify.toml
status: completed
---

## Problem

Netlify was auto-detecting Next.js in the monorepo and installing the plugin even for the game site (which uses Expo), causing build failures.

## Solution

Added `NETLIFY_NEXT_PLUGIN_SKIP = "true"` to `netlify.toml` build environment to prevent Netlify from auto-installing the Next.js plugin for the game site.

Committed in: 85d16c5