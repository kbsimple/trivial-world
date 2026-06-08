# Pitfalls Research

**Domain:** Mobile trivia game for in-person social play (game conductor model)
**Researched:** 2026-06-08
**Confidence:** HIGH (multiple industry sources, case studies, and academic research)

## Critical Pitfalls

### Pitfall 1: Screen Attention Destroys Social Interaction

**What goes wrong:**
Players spend more time looking at the device screen than at each other. The "social" game becomes antisocial as attention focuses on the phone rather than human interaction. Players disengage between their turns, checking their own phones or losing interest.

**Why it happens:**
Mobile interfaces are designed for single-user engagement. Standard trivia app patterns (read question, tap answer, see score) naturally draw eyes to screens. Designers default to "more information = better" and create information-dense UIs that require constant attention.

**How to avoid:**
- Design for the **game conductor model** explicitly — only one person (the conductor) needs to see the screen at critical moments
- Minimize on-screen information during active gameplay — question text is for the conductor to READ ALOUD, not for players to read themselves
- Create "eyes up" moments — after die roll, the focus should be on the board/table, not the screen
- Use audio cues for state changes so players don't need to watch the screen
- Design the phone as a **prop** that enhances conversation, not a consumption device

**Warning signs:**
- Playtesters looking at their own phones during others' turns
- "Wait, what happened?" questions — indicates players weren't engaged
- Silence during gameplay instead of conversation
- Conductors reading questions silently instead of aloud

**Phase to address:**
Phase 1 (Core Game Loop) — this is foundational to the product concept and must be designed in from the start

---

### Pitfall 2: Perceived Unfairness in Digital Die Rolls

**What goes wrong:**
Players believe the digital die is "rigged" or biased against them, even when it's mathematically fair. This perception destroys trust and creates conflict. Users may leave negative reviews claiming the game cheats, or players in social settings may become genuinely upset.

**Why it happens:**
Humans are terrible at perceiving randomness. We see patterns that don't exist, remember losses more than wins, and expect randomness to feel "even" over short periods. A fair die produces streaks that feel suspicious. Without transparency or verification, players project their frustration onto the game.

**How to avoid:**
- Implement **provably fair RNG** with a commit-reveal system — generate and publish a hash before each roll, reveal after
- Add a **"roll history"** feature players can review to see actual distribution
- Consider **animated die roll** that takes time (builds suspense, feels less instant/algorithmic)
- Never "fudge" rolls in AI's favor — if there's any AI opponent, it must play fair
- Consider **transparency panel** showing that the game uses system RNG without modification

**Warning signs:**
- Playtesters joking that "the game hates me" repeatedly
- Questions about whether rolls are "really random"
- Users trying to "game" the die by tapping at specific times

**Phase to address:**
Phase 1 (Core Game Loop) — die rolling is a core mechanic and trust is essential

---

### Pitfall 3: Direct Board Game Translation Without UX Adaptation

**What goes wrong:**
The digital version feels like a poor imitation of the physical game. Players miss the tactile satisfaction of moving pieces, the natural flow of conversation, and the shared attention on a central board. The app adds friction without adding value.

**Why it happens:**
Developers attempt a 1:1 translation of physical mechanics to digital screens. But a phone screen cannot replicate a 20-inch board that everyone can see simultaneously. Touch interactions don't match the satisfaction of physical components. The "convenience" of digital removes the ritual elements that make board games enjoyable.

**How to avoid:**
- Identify **what the digital version adds** — automated scoring, question shuffling, no setup/teardown, rule enforcement
- Design **complementary experiences** rather than replacements — the phone handles bookkeeping, humans handle social play
- Keep the **physical board element** if possible — Trivial World's conductor model allows keeping physical boards/pieces
- Focus on **removing friction** (no die hunting, no score tracking arguments) rather than replicating physical experiences
- Test for "would this be better just playing the physical game?" — if yes, rethink the value proposition

**Warning signs:**
- Playtesters asking "can't we just use a real die?"
- Comments like "it's basically just a question reader"
- Skipped features that are "too hard to digitize"

**Phase to address:**
Phase 1 (Core Game Loop) — the fundamental question of "why does this exist as an app?" must be answered before building

---

### Pitfall 4: Over-Engineering for Scale That Never Arrives

**What goes wrong:**
Significant development time spent on multiplayer networking, backend infrastructure, account systems, and scalability features that aren't needed for v1. The MVP ships late, over-complicated, and the core experience suffers.

**Why it happens:**
Developers default to patterns from online multiplayer games. "Every game needs accounts" or "we'll need real-time sync" feels like standard practice. But Trivial World is explicitly **in-person, single-device** for v1. Over-engineering feels like "doing it right" but delays validation.

**How to avoid:**
- Embrace the **out-of-scope list** — no online multiplayer, no user accounts for v1
- Design for **offline-first** — the core game should work entirely locally
- Defer networking decisions — if multiplayer is needed later, it's a phase 2+ problem
- Use **simple state management** — Zustand with local persistence is sufficient for single-device
- Focus on **core loop validation** first — can people play a complete game and enjoy it?

**Warning signs:**
- Discussions about "what if we add X" for features not in MVP
- Time spent on backend setup before core game works
- Complex state synchronization code for a single-device app

**Phase to address:**
Phase 0 (Planning) and Phase 1 (Core Game Loop) — strict scope discipline

---

### Pitfall 5: Question Quality Erodes Trust Quickly

**What goes wrong:**
A small percentage of incorrect questions destroys credibility. Players who catch one error become suspicious of all answers. "This game doesn't even know the right answer" becomes a lasting negative impression. Question quality problems compound as players share bad questions with friends.

**Why it happens:**
Manual curation feels slow, so developers rush to build question volume. User-generated content introduces errors. AI-generated questions may contain hallucinations. Fact-checking is tedious and feels like "overkill" for a game. But in trivia, **accuracy is the core product**.

**How to avoid:**
- Implement **quality tiering** from the start — "verified" vs. "community" vs. "needs review"
- Create **attribution tracking** — know where each question came from and when it was last verified
- Build **reporting flow** early — make it easy for users to flag problems
- Consider **AI-assisted fact-checking** — cross-model validation (Gemini + GPT-4 agreement)
- Start with **smaller, high-quality pool** rather than large, questionable pool
- Plan for **question lifecycle** — creation, review, publication, feedback, revision, retirement

**Warning signs:**
- "I think this answer is wrong" during playtesting
- No clear process for how questions get added or verified
- Questions pulled from unreliable sources without review

**Phase to address:**
Phase 2 (Question System) — this is the primary content system and trust foundation

---

### Pitfall 6: Pacing Problems from Slow Turns and Waiting

**What goes wrong:**
One player takes too long deciding, other players get bored. The game conductor fumbles through menus. Between-turn transitions are slow. Momentum dies between questions. The social energy dissipates during mechanical app interactions.

**Why it happens:**
Turn-based games naturally create downtime. Digital interfaces add friction (tapping through screens vs. just saying "next"). Designers add "helpful" features that slow flow. Analysis paralysis isn't addressed.

**How to avoid:**
- Design **conductor efficiency** — minimize taps to get from question to question
- Use **diegetic pacing** — integrate timing into the game world (e.g., "others can see the category but not the question while conductor reads")
- Create **meaningful waiting** — other players can plan strategy during conductor's turn
- Consider **soft time limits** — visual cues that suggest pacing without harsh timers
- Test for **talkability** — can players still converse during transitions, or does everyone need to pay attention?
- Implement **quick restart** — getting back into the game after scoring should be instant

**Warning signs:**
- Playtesters reaching for phones between turns
- "Whose turn is it?" confusion
- Silence during app interactions instead of conversation
- Conductor frustration with interface speed

**Phase to address:**
Phase 1 (Core Game Loop) and ongoing during Phase 3 (Polish)

---

### Pitfall 7: Category Balance and Question Difficulty Mismatch

**What goes wrong:**
Some categories are consistently too easy or too hard. Players develop favorite categories that feel "fair" and dread others. Game sessions become lopsided based on die rolls. Perceived unfairness increases when certain categories feel biased.

**Why it happens:**
Categories based on general knowledge assumptions may not match actual player knowledge. "Pop Culture" might skew toward certain demographics. Question writers' expertise levels vary. No difficulty calibration system exists.

**How to avoid:**
- Implement **difficulty rating** for questions — calibrated difficulty, not just author opinion
- Track **completion rates** per category — which categories are actually balanced?
- Consider **adaptive difficulty** hints — not for v1, but plan data collection
- Use **distractor quality** as a signal — good wrong answers matter as much as right answers
- Test **category balance** across diverse player groups — age, background, interests
- Plan for **category-specific calibration** — different categories may need different difficulty distributions

**Warning signs:**
- Playtesters groaning when certain categories come up
- Categories with very high or very low correct answer rates
- Questions that everyone gets right or no one gets right

**Phase to address:**
Phase 2 (Question System) with ongoing refinement in Phase 3+

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store questions in JSON file | No backend needed | Hard to update, no analytics | MVP only, replace in Phase 2 |
| Skip question verification workflow | Faster to ship | Accumulating errors erode trust | Never — question quality is core product |
| Single question difficulty rating | Simpler data model | Can't balance across categories | v1 acceptable, improve before Phase 2 |
| No offline persistence | Simpler state management | Lost games when app closes | Never — offline is core use case |
| Copy-paste similar components | Faster initial dev | Inconsistent behavior, harder updates | Never — creates UX debt |
| Skip accessibility (color contrast, voiceover) | Faster initial dev | Excludes users, App Store may require | Not for v1 — accessibility is baseline |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firebase Realtime Database | Arrays silently become objects with numeric keys | Use Firestore, or always normalize on read |
| Local storage (AsyncStorage) | Storing entire game state without compression | Compress large state, use MMKV for performance |
| Question APIs (if used) | Assuming API accuracy | Always verify externally-sourced questions before inclusion |
| Device orientation | Locking to portrait only | Allow landscape for tablet/table play scenarios |
| Audio cues | No fallback when device is muted | Visual cues as primary, audio as enhancement |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Storing all questions in memory | Fast initial load, works with 100 questions | App crashes/out of memory with 10K+ questions | ~5000 questions loaded at once |
| No question caching | Network request per question | Cache questions locally, sync in background | Any offline play scenario |
| Synchronous game state saves | Works locally | Frame drops during saves | Any real-time animation needs |
| Unindexed question queries | Fast with small dataset | Slow category filtering | ~1000+ questions if filtering |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-side die rolls | Players can cheat by modifying local state | Die roll logic should be verifiable or server-generated (even if local-only, make tampering harder) |
| No question report abuse vector | Malicious users could report-spam legitimate questions | Rate limit reports, require reason text, queue for manual review |
| Exposing answer in question data | Tech-savvy users could see answers before guessing | Send answers separately or hash them; don't include in question payload |
| Storing scores locally only | Easy to manipulate high scores | If scores matter socially, they need server validation; if not, accept local-only |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Tiny tap targets for answer options | Frustration on small screens, wrong taps | Minimum 44px tap targets, generous spacing |
| Reading questions silently on screen | Breaks social conductor model | Design for conductor to read ALOUD — large, clear text, held at arm's length readable |
| No progress indicator | "How many questions left?" uncertainty | Show category progress, game phase, approximate time remaining |
| Forcing account creation before play | Friction, lost users before seeing value | Allow immediate guest play; accounts only for features that require persistence |
| Abstract turn timers (e.g., "30 seconds!") | Feels artificial, breaks social atmosphere | Diegetic timers (visual progress) or no timer — let social pressure manage pacing |
| Buried "new game" button | Can't easily restart after game ends | Prominent end-game flow with clear "play again" action |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Die rolling animation:** Often missing fairness perception layer — verify animation doesn't mask predetermined result, make timing feel natural
- [ ] **Question categories:** Often missing balanced distribution — verify each category has sufficient question count and similar difficulty distribution
- [ ] **Game end condition:** Often missing clear win detection — verify the game correctly detects and announces winner
- [ ] **Score display:** Often missing during-game visibility — verify players can check scores without breaking flow
- [ ] **Error states:** Often missing graceful handling — verify what happens when die roll fails, question load fails, app backgrounds mid-turn
- [ ] **Accessibility:** Often missing entirely — verify screen reader compatibility, color contrast, text scaling
- [ ] **Low battery/screen timeout:** Often missing handling — verify game state persists if screen times out or app backgrounds

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Question quality problems | MEDIUM | Implement verification workflow, add reporting, review flagged questions, publish corrections |
| Perceived unfairness in die | MEDIUM | Add roll history feature, implement transparency panel, consider provably fair system if needed |
| Pacing too slow | LOW | Profile interaction bottlenecks, add shortcuts, test conductor flow with stopwatch |
| Screen attention problem | HIGH | May require significant UX redesign; test whether reducing on-screen info helps |
| Category imbalance | MEDIUM | Track completion rates, adjust question pools, add difficulty tags to enable filtering |
| Performance issues | MEDIUM | Implement lazy loading, add caching, profile memory usage |
| Game state corruption | LOW-HIGH | Depends on frequency; implement auto-save, add state recovery on app launch |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Screen attention destroys social interaction | Phase 1 (Core Game Loop) | Playtest observation: do players look at each other or the screen? |
| Perceived unfairness in digital die | Phase 1 (Core Game Loop) | Playtest questions: "does the die feel fair?" + roll distribution logging |
| Direct board game translation | Phase 1 (Core Game Loop) | Value proposition test: "is this better than just using the board game?" |
| Over-engineering for scale | Phase 0 (Planning) | Scope check: every feature maps to an active requirement? |
| Question quality erodes trust | Phase 2 (Question System) | Verification workflow exists, quality tiering implemented |
| Pacing problems | Phase 1 (Core Game Loop) | Time playtest sessions, measure "dead time" vs "play time" |
| Category balance | Phase 2 (Question System) | Analytics on category completion rates, user feedback |

## Sources

- [Game Developer: Challenges in Designing Mucho Party (Local Multiplayer)](https://www.gamedeveloper.com/business/challenges-in-designing-mucho-party-a-local-multiplayer-party-game-for-touch-screens-) — Touch screen limitations, social design challenges
- [Trail of Bits: Monopoly GO RNG Assessment](https://resources.trailofbits.com/hubfs/Case%20studies/trailofbits-20250605-monopolygo-casestudy.pdf) — Provably fair RNG, third-party verification
- [Chesstris: Features for Digital Board Game Conversion](http://chesstris.com/2021/04/10/features-and-considerations-for-digital-board-game-conversion/) — UI/UX pitfalls, must-have features
- [Estha: Common Quiz Design Mistakes](https://estha.ai/blog/common-quiz-design-mistakes-and-how-to-avoid-them/) — Question design, UX problems
- [Game Developer: Translating Tabletop for Digital](https://www.gamedeveloper.com/business/translating-tabletop-for-digital---best-practices-for-best-of-show) — Avoiding 1:1 translation, complementary experiences
- [Entro Games: 7 Ways to Reduce Downtime](https://entrogames.substack.com/p/7-ways-to-reduce-downtime-in-your) — Pacing, player engagement between turns
- [Tools Gambling: Provably Fair RNG Explained](https://toolsgambling.com/blog/provably-fair-rng-explained) — Commit-reveal protocols, verification
- [Travel Vient: Building Smoke or Fire (React Native)](https://travelvient.com/blog/building-smoke-or-fire/) — State management patterns, Firebase array issues
- [Mudrava: PocketBase Quiz App Case Study](https://mudrava.com/en/projects/score-1000-points-cross-platform-multiplayer-quiz/) — Server-authoritative state, session management
- [Game Developer: A Different Take on Turn Timers](https://www.gamedeveloper.com/design/a-different-take-on-turn-timers) — Diegetic timing vs. abstract timers
- [The Ringer: HQ Trivia Post-Mortem](https://www.theringer.com/2020/05/20/pop-culture/hq-trivia-rise-fall-viral-sensation-episode-1) — Viral success without sustainable fundamentals
- [Stonemaier Games: Digital Board Game State 2024](https://stonemaiergames.com/the-current-state-of-digital-versions-of-tabletop-games-2024/) — Publisher perspective on digital adaptations
- [Medium: What HQ Trivia Can Teach Us About UX](https://medium.com/usabilitygeek/what-hq-trivia-can-teach-us-about-ux-fdbefb60782e) — Live game UX lessons
- [QuizBase: Multilingual Trivia API](https://quizbase.runriva.com/docs/api/questions) — Quality filtering, difficulty calibration patterns

---
*Pitfalls research for: Mobile trivia game (in-person social, game conductor model)*
*Researched: 2026-06-08*