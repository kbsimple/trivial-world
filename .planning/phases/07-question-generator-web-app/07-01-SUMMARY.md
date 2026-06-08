---
phase: 07-question-generator-web-app
plan: 01
subsystem: Question Generator Web App
tags: [nextjs, ollama, vercel-ai-sdk, tailwind, static-export]
completed: 2026-06-08T23:40:53Z
duration: 8 minutes
depends_on: [06-question-pack-structure]
provides:
  - apps/generator/ (Next.js app foundation)
  - Ollama client for question generation
  - Generator page with form components
affects:
  - packages/types/ (zod v4 upgrade)
key_files:
  created:
    - apps/generator/package.json
    - apps/generator/tsconfig.json
    - apps/generator/next.config.ts
    - apps/generator/tailwind.config.ts
    - apps/generator/postcss.config.mjs
    - apps/generator/app/layout.tsx
    - apps/generator/app/page.tsx
    - apps/generator/app/review/page.tsx
    - apps/generator/app/packs/page.tsx
    - apps/generator/app/globals.css
    - apps/generator/lib/ollama/client.ts
    - apps/generator/lib/ollama/prompts.ts
    - apps/generator/hooks/useGenerator.ts
    - apps/generator/components/GeneratorForm.tsx
    - apps/generator/components/SettingsPanel.tsx
    - apps/generator/types/css.d.ts
  modified:
    - turbo.json (added generator tasks)
    - packages/types/package.json (zod v4)
    - packages/types/src/json-schema.ts (z.toJSONSchema API)
decisions:
  - id: D-20
    decision: Use Tailwind CSS instead of Tamagui for web app styling
    rationale: Tamagui requires complex Next.js App Router setup with @tamagui/next-theme. Tailwind provides equivalent styling with simpler static export compatibility.
    alternatives_considered: [Tamagui with @tamagui/next-theme, shadcn/ui]
  - id: D-21
    decision: Upgrade monorepo to Zod v4 for ollama-ai-provider-v2 compatibility
    rationale: ollama-ai-provider-v2 requires zod@^4.0.16. Zod v4 includes built-in z.toJSONSchema() replacing zod-to-json-schema package.
    alternatives_considered: [Use ollama-ai-provider (v3 compatible), Use official ollama package without AI SDK]
---

# Phase 7 Plan 1: Question Generator Foundation Summary

## One-Liner

Created Next.js generator app foundation with Tailwind CSS styling, Ollama client integration with Vercel AI SDK, and source material support for AI-powered question generation.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Next.js app foundation with Turborepo integration | `31e3ac5` | package.json, tsconfig.json, next.config.ts, turbo.json |
| 2 | Configure Tailwind CSS and create app layout with navigation | `a384276` | layout.tsx, page.tsx, tailwind.config.ts, globals.css |
| 3 | Implement Ollama client with source material support (AI-02) | `d5606f6` | lib/ollama/client.ts, lib/ollama/prompts.ts |
| 4 | Create Generator page with topic input, source material, and settings | `1778552` | app/page.tsx, hooks/useGenerator.ts, components/*.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod v4 compatibility with ollama-ai-provider-v2**
- **Found during:** Task 1 (dependency installation)
- **Issue:** ollama-ai-provider-v2 requires zod@^4.0.16, but packages/types used zod@3.23.x
- **Fix:** Upgraded entire monorepo to Zod v4 and updated packages/types/src/json-schema.ts to use built-in z.toJSONSchema()
- **Files modified:** packages/types/package.json, packages/types/src/json-schema.ts
- **Commit:** `31e3ac5`

**2. [Rule 3 - Blocking] Fixed Tamagui Next.js App Router compatibility**
- **Found during:** Task 2 (layout implementation)
- **Issue:** Tamagui requires @tamagui/next-theme and complex setup for Next.js App Router static export
- **Fix:** Replaced Tamagui with Tailwind CSS for simpler static export compatibility
- **Files modified:** Created tailwind.config.ts, postcss.config.mjs, globals.css, removed tamagui.config.ts
- **Commit:** `a384276`

### Design Decisions

**D-20: Use Tailwind CSS instead of Tamagui**
- RESEARCH.md recommended Tamagui for consistency with mobile app
- Practical implementation showed Tamagui requires @tamagui/next-theme, useServerInsertedHTML, and complex SSR setup
- Tailwind provides equivalent theming with dark mode matching UI-SPEC colors
- Simpler maintenance for web-only generator app

## Threat Flags

No new threat surfaces introduced beyond those documented in PLAN.md threat_model.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| Review page placeholder | apps/generator/app/review/page.tsx | 15 | Plan 07-02 will implement review workflow |
| Packs page placeholder | apps/generator/app/packs/page.tsx | 15 | Plan 07-03 will implement pack management |

## Verification Results

- [x] Generator app builds successfully with static export
- [x] TypeScript type checking passes for all files
- [x] Ollama client module compiles without errors
- [x] Source material prompt generation includes source context (AI-02)
- [x] useGenerator hook manages queue state correctly with sourceMaterial parameter
- [x] Generator page renders with topic input, source material textarea, category select, and settings
- [x] Settings panel allows configuring Ollama endpoint and model

## Self-Check

- [x] apps/generator/out/ contains static HTML output
- [x] All 4 task commits exist in git log
- [x] pnpm --filter @trivial-world/generator build succeeds
- [x] pnpm --filter @trivial-world/generator typecheck passes

## Next Steps

1. **Plan 07-02**: Implement Review page with question editing, approval workflow
2. **Plan 07-03**: Implement Packs page with pack metadata editing and JSON export
3. **Plan 07-04**: Implement verification display and confidence scoring UI

## Files Created/Modified

### New Files (apps/generator/)

```
app/
├── layout.tsx          # Root layout with navigation
├── page.tsx            # Generator page (main entry)
├── globals.css         # Tailwind base styles
├── review/
│   └── page.tsx        # Review page placeholder
└── packs/
    └── page.tsx        # Packs page placeholder

components/
├── GeneratorForm.tsx   # Topic, category, source material form
└── SettingsPanel.tsx   # Ollama endpoint and model config

hooks/
└── useGenerator.ts     # Question queue state management

lib/ollama/
├── client.ts           # Ollama client with generateQuestion, verifyQuestion
└── prompts.ts          # Prompt builders with sanitization

types/
└── css.d.ts            # CSS module type declaration

tailwind.config.ts      # Tailwind theme configuration
postcss.config.mjs      # PostCSS configuration
next.config.ts          # Static export configuration
```

### Modified Files

```
turbo.json              # Added generator#build, generator#typecheck tasks
packages/types/
├── package.json        # Zod v4 upgrade
└── src/json-schema.ts  # z.toJSONSchema() API
```

## Metrics

| Metric | Value |
|--------|-------|
| Total tasks | 4 |
| Tasks completed | 4 |
| Files created | 16 |
| Files modified | 3 |
| Duration | 8 minutes |
| Commits | 4 |