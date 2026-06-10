---
created: 2026-06-10T23:28:04Z
title: Fix mobile web - WatermelonDB stubs for web platform
area: mobile
files:
  - apps/mobile/database/index.web.ts
  - apps/mobile/database/schema.web.ts
  - apps/mobile/database/migrations/index.web.ts
  - apps/mobile/database/migrations/002_add_question_packs.web.ts
  - apps/mobile/database/models/index.web.ts
  - apps/mobile/database/models/QuestionPack.web.ts
  - apps/mobile/database/models/Question.web.ts
status: completed
---

## Problem

React Native bridge error `__fbBatchedBridgeConfig is not set, cannot invoke native modules` when loading mobile web app. WatermelonDB modules were being imported at module load time, causing native bridge initialization before web polyfills were ready.

## Solution

Created `.web.ts` stub files for all database modules that import WatermelonDB. Metro's platform resolution picks up `.web.ts` files for web builds, preventing native modules from being bundled.

Files created:
- database/index.web.ts - Main database stub
- database/schema.web.ts - Schema stub
- database/migrations/index.web.ts - Migrations stub
- database/migrations/002_add_question_packs.web.ts - Migration stub
- database/models/index.web.ts - Models index stub
- database/models/QuestionPack.web.ts - QuestionPack model stub
- database/models/Question.web.ts - Question model stub

Committed in: 3f80035