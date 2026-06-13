# Retrospective: Trivial World

---

## Milestone: v5.0 — Content Generation Tooling

**Shipped:** 2026-06-13
**Phases:** 2 (16 CLI Bulk Question Generation, 17 Per-Player Difficulty)
**Plans:** 6 | **Verified:** 13/13 + 5/5 must-haves

### What Was Built

- QuestionSchema v3 with `tidbits` field + WatermelonDB migration 003 (TDD RED/GREEN)
- `generate.ts` CLI: bulk question generation from `--topic` with incremental draft saves
- `draft.ts` helper library: DraftPack/DraftQuestion interfaces, append-per-question pattern
- `review.ts` CLI: readline-based interactive approve/edit/reject + publishDraft to pack index
- `buildCLIQuestionPrompt` in `prompts.ts`: JSON schema example + REQUIRED tidbits instruction
- QuestionCard tidbits display after answer reveal (conditional on `revealed && tidbits`)
- `Player.difficultyPreference` field + `updatePlayerDifficulty` Zustand action
- `GameState.playerDifficulties` snapshot at `startGame()` mirroring `playerPackIds`
- Per-player difficulty forwarded through `selectCategory → selectQuestion → getNextQuestion`
- `effectiveDifficulties` pattern: per-player difficulty overrides game-level `enabledDifficulties`
- Difficulty chip per player in `setup.tsx` (Alert.alert picker, native only)
- Difficulty label in `turn.tsx` progress strip (null-guards for blank-when-unset)

### What Worked

- **Self-analog planning**: Phase 17 used Phase 15's `packId`/`playerPackIds`/`updatePlayerPack` pattern as a perfect template. Every file had a direct difficulty analog — planning was precise and execution was fast.
- **TDD RED/GREEN cycles**: Wave 1 of both phases committed failing tests first, then implementation. This caught the Phase 16 `buildCLIQuestionPrompt` gap during verification (test expected function to exist before it was written).
- **Worktree isolation for executor waves**: Each wave ran in its own git worktree with `--no-verify` commits. Orchestrator merge restored STATE.md/ROADMAP.md. No conflicts across parallel waves.
- **UI-SPEC checker gate**: Phase 17's typography issue (5 font sizes, 3 weights) was caught at design-contract review before planning — avoided implementing a spec that would fail brand consistency.
- **Gap closure on Phase 16**: Initial verification caught `buildCLIQuestionPrompt` missing from generate.ts. Gap closure plan was narrow (2 files, 1 commit) and fully resolved both gaps.

### What Was Inefficient

- **Context overflow between phases**: Summary covering Phase 17 execution was so large it was compacted mid-session. The code-review skill had to resume from a compacted state. Cost: re-deriving diff context from scratch.
- **State file cwd bug**: During Phase 17 Wave 2 merge, the shell cwd was `/apps/mobile` (set by vitest). Relative `.planning/STATE.md` path failed. Fix required prepending `cd /repo &&` to every merge command. This pattern recurs across phases.
- **ROADMAP.md not updated after Phase 16 completion** (in prior session): The autonomous run had to detect the stale ROADMAP state and self-correct before proceeding to lifecycle.
- **questionProvider.getNextQuestionFromDatabase drift**: Two separate WatermelonDB implementations (`questionStore.ts` inline vs `questionProvider.ts`) diverged independently. The provider version now has latent tidbits + packId bugs. Should have been unified at the architectural decision point in Phase 15.

### Patterns Established

- **Snapshot-at-startGame pattern**: `playerPackIds` and `playerDifficulties` are both snapshotted at `startGame()` from player store. Any future per-player field follows the same pattern (snapshot once, read by index during play).
- **effectiveDifficulties = per-player ?? game-level**: `difficulty != null ? [difficulty] : (enabledDifficulties?.length > 0 ? enabledDifficulties : null)` — this exact pattern should be extracted to a shared utility before the next difficulty-related feature.
- **Draft JSON workflow**: generate writes immediately (never blocks), review decouples inspection from generation. Incremental saves (`appendDraftQuestion`) mean a crashed generation preserves all completed questions.
- **Alert.alert picker for enum selection (native)**: Same 5-option structure as `handlePickPack` — shows enum options + "Cancel". Platform.OS === 'web' guard at top. Established in Phase 15, confirmed in Phase 17.

### Key Lessons

1. **The `null != null` vs `!value` guard matters**: `difficulty != null` correctly treats both `null` (explicit "none selected") and `undefined` (absent) as "fall through to game default". `!difficulty` would also filter out `0` or `''` (falsy coercion). Use `!= null` for nullable optional fields.
2. **Dead code accumulates risk**: `questionProvider.getNextQuestionFromDatabase` was written as the "canonical" mobile function but the active mobile path bypasses it entirely. The function drifted and now has two bugs. When an architectural abstraction isn't actually used, either make it the active path or delete it.
3. **Worktree STATE.md protection is fragile**: The restore step (`cp .planning/STATE.md.bak .planning/STATE.md`) fails silently when cwd is wrong. Consider using absolute paths or a wrapper script for milestone-level files.
4. **Pre-close audit surfaces cross-milestone debt**: The audit found 8 open items from v3.0/v4.0 that accumulated without closure. Earlier milestones should have run `/gsd-cleanup` to address these.

### Cost Observations

- Autonomous mode with `--auto` flag removed all interactive prompts — discuss/UI-spec/plan/execute/verify ran as a single pipeline
- Context compaction occurred mid-session during Phase 17 execution; resumed cleanly from compacted state
- 4 agents in parallel for code-review finder angles (A, B, C, D+E+F) — efficient
- Lifecycle (audit + complete) added ~30 minutes after phases were complete

---

## Cross-Milestone Trends

| Milestone | Duration | Plans | Verification Score | Notable |
|-----------|----------|-------|-------------------|---------|
| v1.0 | ~65 min | 10 | N/A (pre-verifier) | First implementation |
| v2.0 | ~2 days | 11 | N/A | AI generation, WatermelonDB |
| v3.0 | — | 8 | human_needed on Phase 10 | Web export, Netlify |
| v4.0 | — | 6 | passed | Simplified gameplay, per-player packs |
| v5.0 | ~1 day | 6 | 13/13 + 5/5 | CLI pipeline, per-player difficulty |

**Velocity trend:** Stable at 6–11 plans per milestone. Autonomous mode accelerated v5.0 to ~1 day from plan to shipped.

**Verification trend:** Gap closure required in v5.0 Phase 16 (11/13 → 13/13). Phase 17 verified 5/5 on first pass. Overall verification gap rate: ~15%.

---

*Retrospective started: 2026-06-13*
