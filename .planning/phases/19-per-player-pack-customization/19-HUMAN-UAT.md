---
status: partial
phase: 19-per-player-pack-customization
source: [19-VERIFICATION.md]
started: 2026-06-13T00:00:00.000Z
updated: 2026-06-13T00:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Per Player mode expands player rows
expected: Tapping "Per Player" segment shows a full-width tappable source row ("Pack: Default (game pack) →") plus a difficulty chip below it for each player
result: [pending]

### 2. Switching back to Shared clears overrides and hides rows
expected: With custom pack override set for a player, switching to "Shared Pack" segment clears the override (player reverts to game-level pack) and the per-player rows disappear entirely
result: [pending]

### 3. packMode persists across app restart
expected: Setting "Per Player" mode, force-quitting the app, and relaunching shows the segmented control still on "Per Player"
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
