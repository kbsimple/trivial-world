---
phase: 08-game-configuration
plan: 02
subsystem: pack-selection-ui
tags: [ui-components, pack-card, modal, filters, navigation, screens]
dependencies:
  requires:
    - apps/mobile/stores/packStore.ts (pack state and actions)
    - apps/mobile/services/packDownloader.ts (download service)
    - apps/mobile/constants/packConfig.ts (pack configuration)
    - packages/types/src/question-pack.ts (PackIndexEntry type)
    - packages/types/src/category.ts (Category, Difficulty types)
  provides:
    - apps/mobile/app/packs/_layout.tsx (pack navigation layout)
    - apps/mobile/app/packs/index.tsx (pack selection screen)
    - apps/mobile/components/PackCard.tsx (pack list item component)
    - apps/mobile/components/PackDetailsModal.tsx (pack details modal)
    - apps/mobile/components/DownloadProgress.tsx (download progress bar)
    - apps/mobile/components/CategoryFilter.tsx (category toggle UI)
    - apps/mobile/components/DifficultyFilter.tsx (difficulty toggle UI)
  affects:
    - apps/mobile/app/_layout.tsx (added packs route)
tech-stack:
  added: []
  patterns:
    - Expo Router file-based navigation (_layout.tsx + index.tsx)
    - React Native Modal component for overlay
    - Zustand store integration (usePackStore)
    - Category/Difficulty filtering UI pattern
key-files:
  created:
    - apps/mobile/app/packs/_layout.tsx
    - apps/mobile/app/packs/index.tsx
    - apps/mobile/components/PackCard.tsx
    - apps/mobile/components/PackDetailsModal.tsx
    - apps/mobile/components/DownloadProgress.tsx
    - apps/mobile/components/CategoryFilter.tsx
    - apps/mobile/components/DifficultyFilter.tsx
  modified:
    - apps/mobile/app/_layout.tsx
decisions:
  - D-08: Modal overlay for pack details (not separate screen)
  - D-09: Pack details show category distribution, counts, difficulty, metadata
  - D-05: Category filtering before game start
  - D-06: Difficulty filtering as optional pre-game setting
  - D-10: Progress bar during pack download
  - D-11: Alert with retry on download failure
  - D-13: Badge on pack for available updates
  - D-14: hasUpdateAvailable() stub (version comparison implemented in 08-03)
metrics:
  duration: 2 minutes
  completed: 2026-06-09
---

# Phase 08 Plan 02: Pack Selection UI and Components Summary

## One-liner

Created pack selection screen with pack list, details modal, download progress, and category/difficulty filtering components for pre-game configuration.

## Summary

This plan implements the pack selection UI components enabling game conductors to browse available packs, view pack details in a modal overlay, see download progress, and configure category/difficulty filters before starting a game.

### Files Created

| File | Purpose |
|------|---------|
| `apps/mobile/app/packs/_layout.tsx` | Pack navigation layout with Stack navigator |
| `apps/mobile/app/packs/index.tsx` | Pack selection screen with pack list and filters |
| `apps/mobile/components/PackCard.tsx` | Pack list item with status badges |
| `apps/mobile/components/PackDetailsModal.tsx` | Modal overlay showing pack details (D-08, D-09) |
| `apps/mobile/components/DownloadProgress.tsx` | Progress bar for pack downloads (D-10) |
| `apps/mobile/components/CategoryFilter.tsx` | Category toggle UI (D-05) |
| `apps/mobile/components/DifficultyFilter.tsx` | Difficulty toggle UI (D-06) |

### Files Modified

| File | Change |
|------|--------|
| `apps/mobile/app/_layout.tsx` | Added packs route to root layout |

### Key Exports

| Export | Description |
|--------|-------------|
| `PacksLayout` | Stack navigation layout for pack screens |
| `PackSelectionScreen` | Main pack selection screen |
| `PackCard` | Pack list item component with status badges |
| `PackDetailsModal` | Modal overlay for pack details |
| `DownloadProgress` | Download progress bar component |
| `CategoryFilter` | Category filtering component |
| `DifficultyFilter` | Difficulty filtering component |

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| CONF-01 | COMPLETE | Pack selection screen shows available packs with metadata |
| CONF-03 | COMPLETE | CategoryFilter component enables category filtering |
| CONF-04 | COMPLETE | PackDetailsModal shows category distribution and question counts |
| CONF-02 (partial) | COMPLETE | Download progress shown, retry on error (D-10, D-11) |

## Threat Flags

None - this plan is primarily UI components with no new trust boundaries. Security validation handled in 08-01 (checksum, Zod validation).

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `hasUpdateAvailable()` | apps/mobile/app/packs/index.tsx | L227 | Returns false until 08-03 implements semver comparison |

## Self-Check: PASSED

- [x] All 7 files created
- [x] Root layout updated with packs route
- [x] All 8 commits exist in git history
- [x] TypeScript compilation passes
- [x] Components follow existing patterns (useTheme, StyleSheet)

Verified commits:
- 109e5d6: create pack navigation layout
- 123cfd6: create PackCard component
- 3e85fe4: create PackDetailsModal component
- 7decaf7: create DownloadProgress component
- f32d6fd: create CategoryFilter component
- 28c9be2: create DifficultyFilter component
- 70f995c: create pack selection screen
- 45d4c8b: add packs route to root layout

## Commits

| Commit | Message |
|--------|---------|
| 109e5d6 | feat(08-02): create pack navigation layout |
| 123cfd6 | feat(08-02): create PackCard component with status badges |
| 3e85fe4 | feat(08-02): create PackDetailsModal component with category distribution |
| 7decaf7 | feat(08-02): create DownloadProgress component with progress bar |
| f32d6fd | feat(08-02): create CategoryFilter component for category toggling |
| 28c9be2 | feat(08-02): create DifficultyFilter component for difficulty toggling |
| 70f995c | feat(08-02): create pack selection screen with filters and modal |
| 45d4c8b | feat(08-02): add packs route to root layout |