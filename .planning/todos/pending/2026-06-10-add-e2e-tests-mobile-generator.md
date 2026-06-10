---
created: 2026-06-10T23:28:04Z
title: Add E2E tests for mobile and generator apps
area: testing
files:
  - e2e/mobile.spec.ts
  - e2e/generator.spec.ts
  - playwright.config.ts
  - package.json
status: completed
---

## Problem

No functional tests to verify that both apps can start and load without errors.

## Solution

Created E2E tests using Playwright:

**Mobile app tests (e2e/mobile.spec.ts):**
- App loads without critical console errors (detects `__fbBatchedBridgeConfig` error)
- Page title contains "Trivial World"
- Page content renders properly
- React Native Web styles applied

**Generator app tests (e2e/generator.spec.ts):**
- App loads without critical console errors
- "Question Generator" title displayed
- Topic input field visible
- Category dropdown with all 6 categories
- Generate button disabled initially
- Navigation to Review/Packs pages works
- Static export serves files correctly

**Configuration:**
- Added @playwright/test and serve as dev dependencies
- Created playwright.config.ts for test configuration
- Added test scripts: test:e2e, test:e2e:mobile, test:e2e:generator

Committed in: fa0afa3