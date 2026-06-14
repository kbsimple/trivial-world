---
phase: 21-per-player-pack-selection-redesign
review_type: code_review
status: complete
created: 2026-06-13
files_reviewed:
  - apps/mobile/app/game/setup.tsx
  - apps/mobile/app/packs/index.tsx
---

# Phase 21 — Code Review

## Summary

4 findings. 1 HIGH (regression), 1 MEDIUM (fragility), 2 LOW (pre-existing UX gaps now more visible).

---

## Findings

```json
[
  {
    "id": "R-21-01",
    "severity": "HIGH",
    "status": "confirmed",
    "file": "apps/mobile/app/game/setup.tsx",
    "location": "n/a — handler removed",
    "title": "difficultyPreference stuck with no reset path",
    "description": "The difficulty chip and handlePickDifficulty handler were removed as part of phase 21. updatePlayerDifficulty action still exists in playerStore.ts (line 90) and difficultyPreference is persisted via AsyncStorage. Players who had a non-null difficultyPreference set in a prior session will silently have that difficulty applied at game start (gameStore.ts:76: players.map(p => p.difficultyPreference ?? null)) with no UI path to view or clear it.",
    "evidence": "gameStore.ts line 76 snapshots difficultyPreference at startGame(). No screen calls updatePlayerDifficulty after phase 21. Persisted players from prior sessions carry non-null values forward.",
    "recommendation": "Call updatePlayerDifficulty(playerId, null) inside handleRevertToShared in setup.tsx, or add a difficulty reset inside addPlayer (new players always start null). At minimum, document the silent behavior."
  },
  {
    "id": "R-21-02",
    "severity": "MEDIUM",
    "status": "plausible",
    "file": "apps/mobile/app/game/setup.tsx",
    "location": "lines 99-103",
    "title": "handleRevertToShared dual-clear relies on non-obvious store invariant",
    "description": "handleRevertToShared calls updatePlayerPack(id, null) then updatePlayerCombo(id, null). This is correct, but the need for both calls follows from a subtle invariant in playerStore: updatePlayerPack(null) preserves comboId (line 80: comboId: packId !== null ? null : p.comboId). A future refactor that assumes one call is sufficient would silently leave comboId set, making the player appear Custom. There is no inline comment explaining why both calls are required.",
    "evidence": "playerStore.ts lines 78-88 confirmed: updatePlayerPack(null) leaves comboId unchanged.",
    "recommendation": "Add a one-line comment in handleRevertToShared: // updatePlayerPack(null) preserves comboId — both calls required to fully revert"
  },
  {
    "id": "R-21-03",
    "severity": "LOW",
    "status": "plausible",
    "file": "apps/mobile/app/packs/index.tsx",
    "location": "line 252",
    "title": "Empty player name yields 'Select Pack for ' title with trailing space",
    "description": "When targetPlayerId is set and the matched player has an empty name string (e.g., user cleared name input), the title renders as 'Select Pack for ' with no name. Players can have empty names in the current UI — there is no minimum-length validation on the name input.",
    "evidence": "Line 252: `{targetPlayer ? \\`Select Pack for ${targetPlayer.name}\\` : 'Select Question Pack'}`. No fallback for empty string.",
    "recommendation": "Use `targetPlayer.name || 'Player'` as a fallback: `Select Pack for ${targetPlayer.name || 'Player'}`"
  },
  {
    "id": "R-21-04",
    "severity": "LOW",
    "status": "plausible",
    "file": "apps/mobile/app/packs/index.tsx",
    "location": "lines 137-148",
    "title": "Post-download in per-player mode does not auto-select the pack",
    "description": "After a successful download in per-player mode, handleDownload shows a Success alert but does not call handleSelectPack(pack.id). The user must tap the pack again to actually select it for the player. This two-tap interaction is consistent with game-level behavior (pre-existing) but is more friction in per-player mode where the user has clear intent.",
    "evidence": "handleDownload lines 137-148: calls await downloadPack(pack) then Alert.alert('Success', ...) — no handleSelectPack call. handleSelectPack line 151 checks targetPlayerId and would navigate back if called.",
    "recommendation": "After successful download in per-player mode, call handleSelectPack(pack.id) instead of Alert.alert: `if (targetPlayerId) { updatePlayerPack(targetPlayerId, pack.id); router.back(); return; }`"
  }
]
```

---

## Disposition

| ID | Severity | Action |
|----|----------|--------|
| R-21-01 | HIGH | Fix before next phase — add `updatePlayerDifficulty(playerId, null)` to `handleRevertToShared` |
| R-21-02 | MEDIUM | Add inline comment in `handleRevertToShared` |
| R-21-03 | LOW | Deferred — empty names are a pre-existing edge case |
| R-21-04 | LOW | Deferred — consistent with game-level behavior; improvement for a later phase |
