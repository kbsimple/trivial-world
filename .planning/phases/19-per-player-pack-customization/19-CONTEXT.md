# Phase 19: Per-Player Pack Customization - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Introduce a top-level "Shared Pack" vs "Custom Per Player" toggle on the setup screen. When Shared (default), all players draw from the game-level pack/combo and no per-player pack UI is shown. When Custom, each player gets a dedicated full-width pack/combo selector row replacing the existing small chips. Difficulty chips remain per-player in Custom mode and are hidden in Shared mode. Replaces the existing implicit small per-player pack chips with a clearer, intentional flow.

</domain>

<decisions>
## Implementation Decisions

### Toggle Design & Placement
- Toggle style: segmented control with two segments — `[ Shared Pack | Per Player ]`
- Placement: below the "Pack: {name}" game-level banner, above the player list — natural top-to-bottom config flow
- Default mode for new games: "Shared Pack" — backward compatible, simpler first-time experience
- Persist packMode across sessions: store in `packStore` (already persisted via Zustand persist middleware)

### Custom Mode Per-Player UX
- Pack/combo selector in custom mode: full-width tappable row per player — `[ Pack: Default → tap to change ]` — replaces the small chips, matches game-level banner affordance
- Difficulty chips: always visible per-player regardless of pack mode — difficulty is orthogonal to the shared/custom source choice
- When a player has no custom source in custom mode: show "Default (game pack)" label — transparent inheritance, no ambiguity

### Mode State & Switching
- State field: `packMode: 'shared' | 'custom'` added to `packStore` — natural home alongside `activePackId`, already persisted
- Difficulty chips in Shared mode: hidden — consistent "shared everything" experience
- Switching Custom → Shared: clear all player `packId` and `comboId` overrides to null — clean slate
- Shared mode supports combo as game-level source: the existing game-level combo picker still works in shared mode (no change to pack banner behavior)

### Claude's Discretion
- Exact segmented control implementation (custom Pressable pair vs native SegmentedControl)
- Animation/transition when toggling modes
- Exact styling of the full-width per-player source row (matches existing card styles)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setup.tsx` — full setup screen; currently has small chips per player (pack + difficulty) in `packChipRow`
- `packStore.activePackId`, `packStore.activeComboId`, `packStore.savedCombos` — game-level source state
- `playerStore.updatePlayerPack(id, packId)`, `playerStore.updatePlayerCombo(id, comboId)` — existing setters to clear on switch
- `Alert.alert` + web Modal pattern for picker — reuse `handlePickSource` and `handlePickDifficulty`
- `SEMANTIC_COLORS` — for active/inactive styling

### Established Patterns
- Zustand persist middleware — add `packMode` field with `'shared'` default; no migration needed (new field)
- `Platform.OS === 'web'` guard for Alert vs Modal picker — already in `handlePickSource`
- Player row layout: `playerRowOuter` → `playerRow` (name row) → `packChipRow` (chips row)
- Web picker modal pattern already exists in `setup.tsx`

### Integration Points
- `packStore`: add `packMode: 'shared' | 'custom'` field + `setPackMode(mode)` action
- `setup.tsx`: conditionally render segmented control; show/hide per-player source row and difficulty chips based on mode; clear overrides when switching to Shared
- `playerStore.resetPlayers` or explicit loop to clear packId/comboId on mode switch

</code_context>

<specifics>
## Specific Ideas

- Segmented control: two `Pressable` blocks side-by-side, styled like a pill — active segment has white fill with dark text, inactive is transparent with muted text
- Full-width per-player source row: same `backgroundColor: 'rgba(255, 255, 255, 0.1)'` card style as `playerRow`, with left-aligned label "Pack: Default" and a right-aligned "→" chevron
- When clearing overrides on switch to Shared: iterate `players` and call `updatePlayerPack(p.id, null)` + `updatePlayerCombo(p.id, null)` for each

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
