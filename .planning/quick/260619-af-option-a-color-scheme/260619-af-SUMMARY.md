---
quick_id: 260619-af
slug: option-a-color-scheme
status: complete
date: 2026-06-19
commits:
  - 9846e55
  - b639934
---

# Quick Task 260619-af: Option A Newspaper/Editorial Color Scheme

## What changed

Applied the "Option A — Newspaper / Editorial" palette across the app, replacing the dark blue theme with near-black, off-white, and bold red.

### Task 1 — Config layer
- `apps/mobile/tamagui.config.ts`: dark theme background `#1a1a2e` → `#0d0d0d`, color `#ffffff` → `#f0f0f0`; added surface (`#1a1a1a`), border (`#2e2e2e`), accent (`#e5191e`), muted (`#6b6b6b`) tokens
- `apps/mobile/constants/theme.ts`: `SEMANTIC_COLORS.success` `#228b22` → `#e5191e` (bold red replaces forest green for start/success actions); overlay `rgba(255,255,255,0.2)` → `rgba(255,255,255,0.15)`

### Task 2 — Legacy hardcoded colors
- `apps/mobile/app/game/results.tsx`: fallback background `#1a1a2e` → `#0d0d0d`
- `apps/mobile/components/PlayerScoreCard.tsx`: fallback background `#1a1a2e` → `#0d0d0d`
- `apps/mobile/components/PackDetailsModal.tsx`: both action buttons now use `SEMANTIC_COLORS.success` via import instead of hardcoded `#228b22`

## Unchanged
- Six category colors (blue/pink/yellow/purple/green/orange) — game visual identity
- Difficulty pill colors (#4caf50, #ff9800, #f44336)

## Tests
403 tests passing, no regressions.
