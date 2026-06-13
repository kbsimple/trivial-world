---
phase: 18-pack-combos
plan: "04"
subsystem: combos-ui
tags: [expo-router, react-native, zustand, combo-management, setup-ui]

# Dependency graph
requires:
  - phase: 18-01
    provides: Player.comboId type contract
  - phase: 18-02
    provides: packStore.savedCombos, createCombo, deleteCombo
  - phase: 18-03
    provides: playerStore.updatePlayerCombo, multi-pack runtime pooling

provides:
  - apps/mobile/app/packs/combos.tsx: combo management screen (create/list/delete)
  - apps/mobile/app/packs/_layout.tsx: combos route registration
  - apps/mobile/app/packs/index.tsx: "Manage Combos" navigation entry
  - apps/mobile/app/game/setup.tsx: per-player source picker + combo-aware chip label

affects:
  - apps/mobile/app/packs/combos.tsx
  - apps/mobile/app/packs/_layout.tsx
  - apps/mobile/app/packs/index.tsx
  - apps/mobile/app/game/setup.tsx

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Combo management screen: FlatList over savedCombos + TextInput + multi-select Pressable list
    - Source picker: Alert.alert with Default / per-pack / per-combo options
    - Combo-aware chip label: playerComboName takes precedence over playerPackName via displayName

key-files:
  created:
    - apps/mobile/app/packs/combos.tsx
  modified:
    - apps/mobile/app/packs/_layout.tsx
    - apps/mobile/app/packs/index.tsx
    - apps/mobile/app/game/setup.tsx

key-decisions:
  - "combos.tsx filters selectable packs by downloadedPackIds on native (Platform.OS check) — web shows all"
  - "handlePickSource replaces handlePickPack — single unified Alert for Default / pack / combo selection"
  - "displayName (combo > pack) drives chip active style and label; 'Default' shown when both null"
  - "Create button disabled when name.trim().length === 0 or selectedPackIds.length < 2 (threat T-18-07)"

metrics:
  duration: "~20min"
  completed: "2026-06-13"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 18 Plan 04: Pack Combos UI Summary

**New combos management screen at /packs/combos with create-from-2+-packs + delete, packs screen navigation link, and a unified per-player source picker in setup that offers Default / single pack / saved combo with a combo-aware chip label.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-06-13
- **Tasks:** 3/3 (Task 3 auto-approved — checkpoint:human-verify with auto_advance=true)
- **Files changed:** 4

## Accomplishments

- `apps/mobile/app/packs/combos.tsx` (234 lines): full create/list/delete combo screen
  - TextInput for combo name, Pressable toggle list of downloaded packs, "Create Combo" button gated on name + 2+ packs
  - FlatList over `savedCombos` with name + pack count + "Remove" (Alert confirm) per row
  - `downloadedPackIds` filter on native; web shows all available packs
- `apps/mobile/app/packs/_layout.tsx`: added `Stack.Screen name="combos"` after index
- `apps/mobile/app/packs/index.tsx`: added "Manage Combos" Pressable calling `router.push('/packs/combos')` above Back button
- `apps/mobile/app/game/setup.tsx`:
  - Added `updatePlayerCombo` to playerStore destructure
  - Added `const savedCombos = usePackStore((state) => state.savedCombos)`
  - Replaced `handlePickPack` with `handlePickSource`: Alert offers Default (clears both), downloaded packs, and saved combos
  - Replaced pack-only chip label with combo-takes-precedence: `playerComboName ?? playerPackName` → `displayName`
  - Chip active style and onPress updated to use `displayName` and `handlePickSource(player.id)`

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Combos screen, route, packs link | ec642e5 | combos.tsx, _layout.tsx, index.tsx |
| 2 | Per-player source picker + combo chip | 63232f9 | setup.tsx |
| 3 | Checkpoint auto-approved (⚡ auto_advance) | — | — |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The combos screen calls real `createCombo`/`deleteCombo` from packStore (plan 02). The source picker calls real `updatePlayerCombo`/`updatePlayerPack` from playerStore (plan 03). No placeholder data or hardcoded values.

## Threat Surface Scan

Threat mitigations T-18-07 and T-18-08 from the plan's threat model are implemented:
- T-18-07: UI gates create on `name.trim().length > 0 && selectedPackIds.length >= 2`; combo name rendered as plain `Text` (no injection surface)
- T-18-08: React Native Text renders strings literally — no markup interpretation; offline local-only display

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Self-Check: PASSED

- [x] `apps/mobile/app/packs/combos.tsx` — exists, 234 lines, contains `createCombo(`, `deleteCombo`, `selectedPackIds.length >= 2`
- [x] `apps/mobile/app/packs/_layout.tsx` — contains `name="combos"`
- [x] `apps/mobile/app/packs/index.tsx` — contains `router.push('/packs/combos')`
- [x] `apps/mobile/app/game/setup.tsx` — contains `updatePlayerCombo`, `savedCombos = usePackStore`, `handlePickSource`, `player.comboId`, `handlePickSource(player.id)`, no `handlePickPack(player.id)`
- [x] Commits ec642e5, 63232f9 exist
- [x] All 229 mobile tests pass (`cd apps/mobile && node_modules/.bin/vitest run`)
