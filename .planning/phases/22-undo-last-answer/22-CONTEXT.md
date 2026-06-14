# Phase 22: Undo Last Answer - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow the game conductor to undo an accidentally-marked answer (correct or incorrect) before the next question starts. This covers: snapshotting game state before `markAnswer()` runs, exposing an Undo affordance on the turn screen, restoring the snapshot (including un-marking the question in questionStore) when Undo is tapped, and clearing the snapshot when a new question is selected.

This phase does NOT add undo for any other action (skip, pack selection, player removal).

</domain>

<decisions>
## Implementation Decisions

### Undo Trigger & Window
- **D-01:** Undo is available on the turn screen (`/game/turn`) after a mark is made and before the next category is selected. Snapshot is cleared when `selectCategory()` is called.
- **D-02:** Single level of undo only — the most recent mark. No undo history stack.

### Undo Affordance Placement
- **D-03:** Undo affordance is a subtle text link at the bottom of the turn screen, below the all-players progress strip.
- **D-04:** The affordance is only rendered when an undo is available (`lastMarkSnapshot !== null`). It does NOT appear during normal turns when there is nothing to undo.

### Post-Undo Recovery
- **D-05 (Claude's Discretion):** After tapping Undo, navigate back to `/game/question` with `answerRevealed: true` and the original question restored. The conductor lands back on the question screen seeing the full question + answer, and can re-mark correctly.

### State Snapshot
- **D-06:** Snapshot captured immediately before `markAnswer()` mutates state. Snapshot must include all fields that `markAnswer` modifies: `currentQuestion`, `currentCategory`, `currentPlayerIndex`, `questionNumber`, `completedCategories`, `isChampionshipMode`, `phase`, `answerRevealed`.
- **D-07:** Undo also calls `questionStore.unmarkAsked(questionId)` to remove the question from the asked pool. On web: remove from `askedQuestionIds` array. On mobile: clear `asked_at` in WatermelonDB.

### Claude's Discretion
- Label text for the Undo link (e.g., "Undo last mark" or "↩ Undo")
- Exact visual styling of the subtle link (font size, opacity, color)
- Whether a brief toast/flash confirms the undo completed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game State
- `apps/mobile/stores/gameStore.ts` — `markAnswer()` is the function being snapshotted; `selectCategory()` is the undo window expiry point
- `apps/mobile/stores/questionStore.ts` — `markAsked()` is being reversed; need to add `unmarkAsked()` with web (array) and mobile (WatermelonDB) branches

### Turn Screen
- `apps/mobile/app/game/turn.tsx` — Where the Undo affordance is added (bottom, below progress strip)

### Question Screen
- `apps/mobile/app/game/question.tsx` — Post-undo landing point; navigated to with `answerRevealed: true`

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useGameStore` Zustand store: `set()` is synchronous, `getState()` gives latest state post-mutation. Snapshot can be a plain JS object stored in the store's state.
- `useQuestionStore.markAsked()`: already has web/mobile branches — `unmarkAsked()` should follow the same dual-branch pattern.
- Turn screen `progressStrip` View: Undo link goes after this View, before the closing container View.

### Established Patterns
- All store mutations use `set({...})` with a partial state object — snapshot can be stored as `lastMarkSnapshot: Partial<GameStore> | null`
- Navigation uses `router.replace()` — post-undo navigation to `/game/question` should also use `router.replace()`
- Conditional rendering pattern already used in turn.tsx (`inChampionship ? ... : ...`) — the Undo affordance follows the same `{condition && <Pressable>}` pattern

### Integration Points
- `gameStore.ts` → `markAnswer()`: snapshot captured here, `undoLastMark()` action added here
- `questionStore.ts`: `unmarkAsked(id)` action added here
- `turn.tsx`: reads `lastMarkSnapshot` from `useGameStore`, conditionally renders Undo link at bottom
- `question.tsx`: no changes needed (post-undo navigation lands here naturally)

</code_context>

<specifics>
## Specific Ideas

- Conductor's scenario: marks "Incorrect" by accident when player got it right. Lands on turn screen. Sees "↩ Undo last mark" at the bottom. Taps it. Lands back on question screen with answer revealed. Marks "Correct". Play continues correctly.
- The 600ms `setTimeout` in `question.tsx` before navigation means the snapshot must already be stored before the timeout fires — `markAnswer()` itself stores the snapshot synchronously.

</specifics>

<deferred>
## Deferred Ideas

- Undo for skip (skip puts question in asked pool — could also be undoable, but separate scope)
- Multi-level undo history (full session rollback)
- Visual confirmation toast after undo completes

None of these were requested for Phase 22.

</deferred>

---

*Phase: 22-undo-last-answer*
*Context gathered: 2026-06-14*
