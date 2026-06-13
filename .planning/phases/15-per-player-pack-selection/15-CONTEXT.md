# Phase 15: Per-Player Pack Selection - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow each player to select a different question pack during game setup. Questions for each player are drawn from their assigned pack. Category completion and championship logic respects each player's pack. The UI clearly shows which pack each player is using.

</domain>

<decisions>
## Implementation Decisions

### Data Architecture
- Per-player packId lives in the Player model (`types/player.ts`) — player owns their pack assignment
- `startGame()` snapshots player pack IDs into `gameStore.playerPackIds[]` — decouples ongoing game from setup changes
- If a player has no pack assigned, fall back to `packStore.activePackId` (game-level default) — backward compatible
- `questionStore.selectQuestion` receives optional `packId?: string` parameter, called with the current player's packId in `gameStore.selectCategory`

### Category Win Condition
- Per-player active categories are derived from the pack's `categoryCounts` keys where count > 0 (stored in packStore.availablePacks)
- Player completes all categories *their pack has* to enter championship mode
- If a pack's available categories can't be determined, fall back to all 6 categories
- `startGame()` snapshots `playerCategories: Category[][]` alongside `playerPackIds[]` — immutable during game

### Setup UI
- Per-player pack chip/badge shown below the name input in each player row — tap to open pack picker
- ActionSheet/Alert options listing available downloaded packs (mobile-native, no new modal screen)
- "Default" badge (gray/muted) when no per-player pack selected — inherits game-level pack
- Turn screen progress strip shows pack name (truncated) next to player progress count

### Claude's Discretion
- Specific ActionSheet implementation details (react-native Alert.alert or ActionSheetIOS)
- Exact badge styling within existing design system
- Web compatibility approach for ActionSheet

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packStore.availablePacks: PackIndexEntry[]` — contains pack id, name, categoryCounts
- `packStore.downloadedPackIds: string[]` — IDs of packs available for use
- `CATEGORY_COLORS`, `CATEGORY_NAMES` — for category display
- `usePlayerStore.updatePlayerName` pattern — model for `updatePlayerPack`
- Existing `PlayerRow` layout in setup.tsx — extend with pack chip below name

### Established Patterns
- Zustand store with persist middleware (all stores)
- Player model extended via `types/player.ts` + `stores/playerStore.ts`
- GameState fields added via `types/game.ts` + `stores/gameStore.ts`
- Optional parameters pattern (e.g., `enabledCategories: Category[] | null`)
- `packStore.getState()` called inside async store actions

### Integration Points
- `gameStore.selectCategory(category)` → calls `questionStore.selectQuestion(category, playerPackId)`
- `gameStore.startGame()` → snapshot `playerPackIds` and `playerCategories` from players + packStore
- `gameStore.markAnswer(correct)` → use `playerCategories[currentPlayerIndex]` instead of `getActiveCategories()`
- `setup.tsx` player rows → add pack chip + ActionSheet picker
- `turn.tsx` progress strip → show `playerPackNames[idx]` alongside count

</code_context>

<specifics>
## Specific Ideas

- Use `Alert.alert` with button array for pack picker — already imported in setup.tsx, works on both platforms
- Show pack name truncated to ~15 chars in the turn screen progress strip
- In the setup screen, show "Default" in gray if no player-specific pack, otherwise show the pack name in a tinted chip

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
