# Phase 20: Pack Selection UX Overhaul - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Rework the setup screen pack selection UX so each player explicitly shows their pack state via a per-player chip. Remove the top-level segmented control (Shared Pack / Per Player toggle). Every player row always shows either a "Shared Pack" chip (tapping opens the picker to go custom) or a "Custom: [PackName]" chip (tapping reverts to shared). If all players have a custom pack selected, the game-level shared pack becomes optional and the CONF-01 guard is bypassed. Otherwise the shared pack is required as before.

</domain>

<decisions>
## Implementation Decisions

### Player Chip Design
- Each player row always shows a pack chip: "Shared Pack" (inactive/default style) or "Custom: [PackName]" (active style, truncated to ~12 chars)
- Remove the top-level segmented control (Shared Pack / Per Player) — per-player chips replace it entirely
- Tapping "Shared Pack" chip opens the same picker flow (`handlePickSource`) to let the player go custom
- Tapping "Custom: [PackName]" chip reverts that player to shared (clears packId and comboId immediately, no confirmation)

### Pack Picker Flow
- Reuse existing `handlePickSource()` picker exactly as-is — same Alert.alert (native) / Modal (web) flow
- No new picker screen needed
- Clearing a player back to shared is immediate (one tap on custom chip)

### Shared Pack Requirement Logic
- All-custom check runs at startGame time: if every player has a non-null packId or comboId → skip the shared pack CONF-01 guard
- When all players are custom, shared pack row shows "Optional" hint alongside the existing pack name or warning
- Real-time feedback: shared pack header dynamically updates its required/optional state as players toggle
- If any player is on shared → shared pack remains required as before

### State Management
- Remove `packMode` ('shared' | 'custom') from packStore state and persist list — it's no longer needed
- Remove `setPackMode` action from packStore
- Whether a player is custom is determined at render by: `player.packId !== null || player.comboId !== null`
- `clearPlayerPackSources()` (from playerStore) still used to revert a single player — call it per-player (not all-players)
- Update packStore tests; add tests for all-custom bypass logic in gameStore or setup flow

### Claude's Discretion
- Chip placement within player row: alongside difficulty chip in `packChipRow`, or separate row — use best fit for readability
- Difficulty chip behavior: keep as-is (only show when player has a custom source, since difficulty is per-player override only relevant with custom packs)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handlePickSource(playerId)` — Alert.alert / Modal picker for pack + combo selection; reuse unchanged
- `handlePickDifficulty(playerId)` — difficulty picker; keep as-is
- `packChip` / `packChipActive` / `packChipDefault` / `packChipText` styles — ready to reuse for pack chip
- `packChipRow` style — row container for chip(s) below player name row
- `playerSourceRow` style — full-width row (can be repurposed or replaced by chip)
- `clearPlayerPackSources()` from `usePlayerStore` — currently clears ALL players; need per-player version or use `updatePlayerPack(id, null)` + `updatePlayerCombo(id, null)` directly

### Established Patterns
- Zustand stores: packStore + playerStore + gameStore; state mutations via actions
- Per-player pack state: `player.packId` (string|null), `player.comboId` (string|null)
- `savedCombos` from packStore for combo name lookup
- `availablePacks` from packStore for pack name lookup
- Conditional render based on `packMode === 'custom'` in setup.tsx — this block gets replaced by chip logic

### Integration Points
- `apps/mobile/app/game/setup.tsx` — primary file; remove segmented control, replace playerSourceRow with chip
- `apps/mobile/stores/packStore.ts` — remove packMode + setPackMode; remove from persist partialize
- `apps/mobile/stores/packStore.test.ts` — update tests removing packMode assertions
- `apps/mobile/stores/gameStore.ts` — update startGame() CONF-01 guard for all-custom bypass
- `apps/mobile/stores/gameStore.test.ts` — add tests for all-custom bypass

</code_context>

<specifics>
## Specific Ideas

- Phase goal explicitly names: chip shows "Shared Pack" or "Custom Pack" — not "Per Player" or "Override"
- "Custom Pack uses the same picker flow as the game-level shared pack" — the existing picker already does this; no new UI needed for the picker itself
- The cosmetic debt from Phase 19 (playerSourceRow label says "Pack: …" for combos) is resolved by this phase since the label becomes "Custom: [combo name]"

</specifics>

<deferred>
## Deferred Ideas

- Phase 18 bugs (F-01 deleteCombo stale comboId, F-02 resetAskedQuestions corruption, F-03 combos.tsx no ScrollView) — out of scope for this phase, tracked in STATE.md
- Per-player difficulty UI enhancements (e.g., hide difficulty chip when player is on shared pack) — keep existing behavior for now

</deferred>
