---
phase: 08-game-configuration
plan: 01
subsystem: pack-management
tags: [state-management, download-service, checksum, watermelondb, zustand, default-pack]
dependencies:
  requires:
    - packages/types (PackIndexEntry, QuestionPack, Category, Difficulty schemas)
    - apps/mobile/database (QuestionPackModel, QuestionModel, database)
    - apps/mobile/constants/categories (PlayerColor)
    - apps/mobile/data/questions (getQuestionsByCategory, ALL_QUESTIONS)
  provides:
    - apps/mobile/constants/packConfig.ts (GENERATOR_PACK_INDEX_URL, DEFAULT_PACK_ID)
    - apps/mobile/services/checksum.ts (computeSha256, verifyChecksum)
    - apps/mobile/services/packIndex.ts (fetchPackIndex)
    - apps/mobile/services/packDownloader.ts (downloadPackWithProgress, getActivePack, setActivePack)
    - apps/mobile/stores/packStore.ts (usePackStore, PackState)
    - apps/mobile/database/migrations/003_seed_default_pack.ts (seedDefaultPack, ensureDefaultPack)
  affects:
    - apps/mobile/stores/questionStore.ts (will query WatermelonDB instead of imports)
    - apps/mobile/app/packs/ (new pack selection screens in plan 08-02)
tech-stack:
  added:
    - Web Crypto API for SHA-256 (React Native polyfill)
    - Zustand persist middleware for pack state
  patterns:
    - Zustand store with persist middleware (matches questionStore pattern)
    - WatermelonDB write transaction for pack storage
    - Fetch API with progress tracking for downloads
    - Zod schema validation for pack content
key-files:
  created:
    - apps/mobile/constants/packConfig.ts
    - apps/mobile/services/checksum.ts
    - apps/mobile/services/packIndex.ts
    - apps/mobile/services/packDownloader.ts
    - apps/mobile/stores/packStore.ts
    - apps/mobile/database/migrations/003_seed_default_pack.ts
  modified: []
decisions:
  - D-03: Hardcoded generator URL in packConfig.ts constant
  - D-02: Default pack seeded from bundled questions via migration
  - D-10: Download progress callback in downloadPackWithProgress()
  - D-11: Error storage in downloadError for retry UI
  - D-12: Silent checksum verification with verifyChecksum()
  - D-15: Single active pack enforced via setActivePack()
  - D-16: Downloaded packs stored in WatermelonDB
  - D-05: enabledCategories state in packStore
  - D-06: enabledDifficulties state in packStore
metrics:
  duration: 12 minutes
  completed: 2026-06-08
---

# Phase 08 Plan 01: Pack State Management and Download Infrastructure

## One-liner

Created pack state management with Zustand and download infrastructure with checksum verification for pack discovery, download, and storage in WatermelonDB.

## Summary

This plan implements the backend infrastructure for pack management, enabling users to discover available packs from the hardcoded generator URL, download packs with progress indication, verify pack integrity with SHA-256 checksums, and store packs in WatermelonDB for offline-first gameplay. The default pack with 120 bundled questions is seeded on first launch.

### Files Created

| File | Purpose |
|------|---------|
| `apps/mobile/constants/packConfig.ts` | Pack configuration constants (URL, default pack ID, timeouts) |
| `apps/mobile/services/checksum.ts` | SHA-256 checksum computation and verification |
| `apps/mobile/services/packIndex.ts` | Fetch available packs from generator URL |
| `apps/mobile/services/packDownloader.ts` | Download packs with progress, validation, and storage |
| `apps/mobile/stores/packStore.ts` | Zustand store for pack state management |
| `apps/mobile/database/migrations/003_seed_default_pack.ts` | Seed default pack from bundled questions |

### Key Exports

| Export | Description |
|--------|-------------|
| `GENERATOR_PACK_INDEX_URL` | Hardcoded generator endpoint URL (D-03) |
| `DEFAULT_PACK_ID` | UUID for built-in default pack (D-02) |
| `computeSha256()` | SHA-256 hash computation |
| `verifyChecksum()` | Silent-on-success checksum verification (D-12) |
| `fetchPackIndex()` | Fetch and validate pack index from URL |
| `downloadPackWithProgress()` | Download with progress callback (D-10) |
| `getActivePack()` | Get currently active pack (D-15) |
| `setActivePack()` | Set active pack (deactivates others) |
| `usePackStore` | Zustand hook for pack state |
| `seedDefaultPack()` | Seed 120 bundled questions on first launch |
| `ensureDefaultPack()` | Check and seed if needed |

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| CLOUD-02 | COMPLETE | checksum.ts + packDownloader.ts verifyChecksum |
| CLOUD-03 | COMPLETE | packIndex.ts fetches version info from generator |
| CONF-01 (partial) | COMPLETE | packStore.ts availablePacks, packIndex.ts fetchPackIndex |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: untrusted_input | packIndex.ts | Pack index JSON from external server - validated with Zod schema |
| threat_flag: untrusted_content | packDownloader.ts | Pack content from CDN - validated with Zod + checksum |

All mitigations implemented per threat model:
- T-08-01: SHA-256 checksum verification (verifyChecksum)
- T-08-02: Zod schema validation (QuestionPackSchema.safeParse)
- T-08-03: HTTPS-only URL enforced (GENERATOR_PACK_INDEX_URL)
- T-08-05: 60-second timeout (PACK_DOWNLOAD_TIMEOUT_MS)
- T-08-06: UUID validation in schema (PackIndexEntrySchema)

## Known Stubs

None - all functionality implemented.

## Self-Check: PASSED

- [x] All 6 files exist
- [x] All 6 commits exist in git history
- [x] All exports match plan must_haves

Verified at execution time:
- dc8ea30: pack configuration constants
- a6e18d6: checksum utility
- 23f4201: pack index service
- bbe071e: pack download service
- ce3aaaf: pack state store
- 21db719: default pack seeding migration

## Commits

| Commit | Message |
|--------|---------|
| dc8ea30 | feat(08-01): create pack configuration constants |
| a6e18d6 | feat(08-01): create checksum utility for SHA-256 verification |
| 23f4201 | feat(08-01): create pack index service |
| bbe071e | feat(08-01): create pack download service with checksum verification |
| ce3aaaf | feat(08-01): create pack state store with Zustand |
| 21db719 | feat(08-01): create default pack seeding migration |