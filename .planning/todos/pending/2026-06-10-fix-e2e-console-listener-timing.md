---
created: 2026-06-10T23:28:04Z
title: Fix E2E tests - console listener before navigation
area: testing
files:
  - e2e/mobile.spec.ts
  - playwright.config.ts
status: completed
---

## Problem

E2E test for console errors wasn't catching the `__fbBatchedBridgeConfig` error because the console listener was set up AFTER the page had already loaded. The error occurs during JavaScript module initialization, before the test's listener was attached.

## Solution

Moved the console listener setup to BEFORE `page.goto('/')` in the test. Also:
- Added `pageerror` listener for uncaught exceptions
- Removed `beforeEach` hook so each test controls its own navigation
- Updated playwright.config.ts to require manual server startup (removed webServer config)

The test now correctly fails when the console error is present, and will pass once the fix is deployed.

Committed in: 5150ebd