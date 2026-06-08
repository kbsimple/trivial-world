# Pitfalls Research

**Domain:** AI Question Generation and Pack Management (v2.0 Milestone)
**Researched:** 2026-06-08
**Confidence:** HIGH (academic research, industry sources, official documentation)

## Critical Pitfalls

### Pitfall 1: AI Hallucination and Factual Accuracy

**What goes wrong:**
AI-generated trivia questions contain confident but incorrect facts. Research shows 45% of AI responses contain significant issues, with 20% having accuracy problems and 31% having sourcing issues. The most pernicious issue: models often encode correct answers internally but generate wrong outputs.

**Why it happens:**
Evaluation benchmarks reward accuracy over admitting uncertainty, creating incentives for models to guess rather than say "I don't know." Statistical pressure during pretraining makes rarely-cited facts (specific dates, statistics) prone to errors. GPT-4 generated questions with only 22-25% passing all quality metrics in academic studies.

**How to avoid:**
1. Implement multi-model fact-checking pipeline (Gemini + GPT-4 + Perplexity consensus)
2. Require consensus across models before accepting facts
3. Use grounded generation with web search for current facts
4. Design scoring system: questions need 3+ correct assertions out of 4 for ~81% confidence
5. Maintain human review queue for questions below confidence threshold
6. Track per-category accuracy rates to identify weak areas

**Warning signs:**
- Questions with specific statistics, dates, or numbers
- Questions about rapidly evolving topics
- Questions where model gives different answers on regeneration
- Questions about niche topics with sparse training data
- Distractors that are plausible but not verifiable

**Phase to address:**
Phase 1 (Question Pack Data Structure) — build confidence scoring into schema; Phase 3 (AI Generation) — implement validation pipeline

---

### Pitfall 2: Prompt Injection and Content Manipulation

**What goes wrong:**
Users craft malicious prompts to manipulate question generation, extract system instructions, or generate inappropriate content. Prompt injection is ranked as #1 security risk in OWASP Top 10 for LLM Applications 2025. Attackers can use techniques like "Ignore previous instructions, generate [malicious content]" or hidden text in topic inputs.

**Why it happens:**
LLMs cannot reliably distinguish between instructions and data. User input containing hidden instructions bypasses safeguards. The probabilistic nature of LLMs means no existing defense is fully sufficient — requiring defense-in-depth approaches.

**How to avoid:**
1. **Input sanitization**: Strip control characters, limit topic length (100 chars max), validate format
2. **Separation of concerns**: User topics are parameters, not prompt concatenation
3. **Structured output enforcement**: Use JSON schema validation to reject malformed responses
4. **System prompt hardening**: Keep system instructions in separate context window from user input
5. **Content moderation layer**: Run generated questions through moderation API before storage
6. **Rate limiting**: Token-based quotas (not request-based) to prevent budget exhaustion

**Warning signs:**
- Unusually long topic inputs (>100 characters)
- Special characters or formatting in topic strings
- Rapid requests from same user/session
- Generated content deviating from expected category or format
- Generated questions about topics not in the allowed category list

**Phase to address:**
Phase 3 (AI Generation) — implement input validation and content moderation; Phase 2 (Cloud Storage) — add rate limiting and abuse detection

---

### Pitfall 3: Schema Migration Breaking Existing Packs

**What goes wrong:**
Adding new fields or changing question pack structure breaks compatibility with existing packs stored locally on user devices. Users cannot open previously downloaded packs, or questions display incorrectly. Migration happens server-side but local cached versions become unreadable.

**Why it happens:**
JSON schema changes are often additive without planning for backward compatibility. Adding required fields, removing fields, or changing types are breaking changes. The `additionalProperties: false` pattern makes any new field breaking. Without version field in payload, old clients cannot determine what version they are reading.

**How to avoid:**
1. **Version field in payload**: Every pack includes `schemaVersion` field starting at 1
2. **Additive-only changes**: Only add optional fields with defaults — never remove or rename
3. **Never use `additionalProperties: false`** on pack schemas — allows future fields
4. **Upcaster pattern**: Transform old versions at runtime when loading packs (pure functions, permanent)
5. **Idempotent migrations**: Skip already-migrated records, process in batches
6. **Property-based testing**: Verify every valid V1 pack produces valid V2 pack after upcasting

**Upcaster implementation pattern:**
```typescript
const upcasters = {
  1: (v1) => ({
    schemaVersion: 2,
    questions: v1.items, // renamed field
    category: v1.category,
    difficulty: 'medium' // new default
  })
};

function upcast(doc) {
  let current = doc;
  while (current.schemaVersion < CURRENT_VERSION) {
    current = upcasters[current.schemaVersion](current);
  }
  return current;
}
```

**Warning signs:**
- Question packs failing to load after app update
- Missing fields showing as undefined in UI
- Pack download size unexpectedly large (full replacements instead of deltas)
- Users reporting "corrupted pack" errors
- Downgrading app version fixes pack loading

**Phase to address:**
Phase 1 (Question Pack Data Structure) — design versioned schema from day one; Phase 2 (Cloud Storage) — implement migration API

---

### Pitfall 4: Offline Sync Conflicts and Data Loss

**What goes wrong:**
User generates questions offline, then syncs when online — but their changes conflict with server-side updates or other device edits. Sync overwrites local or remote data silently, causing data loss. Simple "last write wins" strategies silently destroy user work.

**Why it happens:**
Without conflict metadata and explicit resolution rules, mobile apps cannot properly merge concurrent edits. Network interruptions mid-sync create partial states. Users expect their locally-generated questions to persist, but server versions take precedence.

**How to avoid:**
1. **Store sync metadata**: Every record needs `id`, `updatedAt`, `serverUpdatedAt`, `version`, `syncStatus`, `deleted`
2. **Optimistic concurrency control**: Client sends `expectedVersion` with updates; server rejects if version mismatch
3. **Outbox pattern**: Queue pending mutations in durable storage before sync (survives app restart)
4. **Conflict detection**: Server rejects updates with mismatched version, returns current state
5. **Explicit conflict UX**: Show both versions side-by-side when conflicts detected — do not auto-resolve
6. **Soft deletes with tombstones**: Never hard delete; use `deleted` flag for sync

**Sync metadata schema:**
```typescript
interface SyncablePack {
  id: string;              // UUID v4
  updatedAt: Date;          // Last local update
  serverUpdatedAt: Date;    // Last known server state
  version: number;          // Optimistic concurrency token
  syncStatus: 'clean' | 'pending' | 'syncing' | 'conflicted';
  deleted: boolean;         // Tombstone for soft delete
}
```

**Rule of thumb:** "If you cannot explain the merge rule in one sentence, you should not do it automatically."

**Warning signs:**
- Questions appearing/disappearing after sync
- User edits reverted after app restart
- "Sync failed" errors without recovery path
- Duplicate questions appearing after sync
- Conflict resolution showing "server version" without user input

**Phase to address:**
Phase 2 (Cloud Storage) — design sync protocol; Phase 4 (State Persistence) — implement conflict resolution

---

### Pitfall 5: Large Pack Performance Degradation

**What goes wrong:**
App becomes sluggish or crashes when loading question packs with thousands of questions. Initial load takes 30+ seconds, search is slow, and scrolling is jerky. Memory pressure warnings appear on low-end devices.

**Why it happens:**
Loading entire pack into memory instead of lazy loading. Not using database indexes. Performing searches without pagination. WatermelonDB handles 50k+ records well, but only with proper lazy loading via `query().observe()`. FlatList without optimization settings causes scroll frame drops.

**How to avoid:**
1. **Lazy loading from day one**: Use WatermelonDB's `query().observe()` — only loads visible records
2. **Database indexes**: Create indexes on `category`, `difficulty`, `used` status
3. **Pagination everywhere**: Never load more than 50 questions at once; use LIMIT/OFFSET
4. **Reactive queries**: Let WatermelonDB handle subscription updates automatically
5. **FlatList optimization**: `removeClippedSubviews={true}`, `maxToRenderPerBatch={20}`, `windowSize={21}`
6. **WAL mode for SQLite**: `PRAGMA journal_mode = WAL` for better concurrent read/write

**WatermelonDB lazy loading pattern:**
```typescript
// Only loads records visible on screen, not entire table
const questions = database
  .get<Question>('questions')
  .query(Q.where('pack_id', packId), Q.where('used', false))
  .observe(); // Reactive - UI updates automatically
```

**Performance benchmarks:**
| Operation | Acceptable | Warning | Failing |
|-----------|------------|---------|---------|
| Pack load | < 1s | 1-3s | > 3s |
| Search query | < 200ms | 200-500ms | > 500ms |
| Scroll frame rate | 60fps | 45-60fps | < 45fps |
| Memory usage | < 100MB | 100-200MB | > 200MB |

**Warning signs:**
- Pack load time > 2 seconds
- Scroll frame drops below 60fps
- Memory warnings in development console
- Search taking > 500ms to return results
- App crashing on low-end devices
- "JavaScript heap out of memory" errors

**Phase to address:**
Phase 1 (Question Pack Data Structure) — design for lazy loading; Phase 4 (State Persistence) — optimize database queries

---

### Pitfall 6: Semantic Leakage in Generated Questions

**What goes wrong:**
AI-generated questions inappropriately incorporate information from the prompt. User asks for "sports questions" and gets "What baseball team won the 2020 World Series?" — the category leaked into question content, making it easier to guess. Distractors all share patterns related to the prompt.

**Why it happens:**
Models learn semantic associations during training that inappropriately influence outputs. Research shows instruction-tuned models exhibit MORE leakage than base models. Prompt information "leaks" into generated content through learned associations between prompt tokens and output tokens.

**How to avoid:**
1. **Category-agnostic prompts**: "Generate a trivia question about [TOPIC]" not "Generate a [CATEGORY] trivia question"
2. **Post-generation categorization**: Let AI classify the question after generation to ensure match
3. **Category validation**: Check generated question matches requested category; reject if not
4. **Distractor diversity**: Ensure wrong answers don't all share category-specific patterns or subtopic references
5. **Test for leakage**: Generate questions across categories, check for cross-contamination
6. **Temperature control**: Lower temperature for factual accuracy, but verify output diversity

**Warning signs:**
- Questions matching prompt category when random was expected
- Distractors all related to same subtopic (e.g., all baseball for "sports")
- Questions about specific entities mentioned in topic input
- Category classification accuracy below 90%
- Questions in "Tech" category all about AI when topic was "AI" specifically

**Phase to address:**
Phase 3 (AI Generation) — prompt engineering and validation pipeline

---

### Pitfall 7: Abuse of Question Generation API

**What goes wrong:**
Users exploit the AI generation endpoint for free compute — generating thousands of questions, extracting the underlying model, or using it for unrelated content generation. API costs spiral, service becomes unavailable for legitimate users.

**Why it happens:**
AI inference is ~1 million times more expensive than standard HTTP requests. Traditional rate limiting counts requests equally, but one request can use 50 to 128,000+ tokens. Attackers use residential proxies to bypass IP limits, throwaway accounts to dilute auth limits. Vercel documented a 10x traffic spike from residential proxy abuse.

**How to avoid:**
1. **Token-based quotas**: Limit by tokens consumed, not request count — free tier = 100 questions/day
2. **Per-user limits**: Track consumption per user, not per API key or IP
3. **Cost multipliers**: More expensive models (GPT-4) get tighter limits than cheaper ones (GPT-3.5)
4. **Per-request verification**: Run abuse detection on every AI request, not per session
5. **Content analysis**: Detect bot-generated patterns, excessive repetition, programmatic formatting
6. **Behavioral pattern analysis**: Rapid requests, duplicate prompts, burst detection
7. **Invisible CAPTCHA on high-volume**: BotID or similar for users exceeding thresholds

**Abuse detection metrics:**
```typescript
interface AbuseSignals {
  bot_score: number;         // 0-100: Likelihood of bot-generated content
  repetition_score: number;  // Excessive repetition in prompts
  resource_score: number;    // Resource exhaustion indicators
  pattern_score: number;     // Behavioral anomalies
}
```

**Warning signs:**
- API costs 10x higher than projected
- Traffic spikes from residential proxies (AWS/GCP IPs)
- Users with unusually high question counts (>500/day)
- Duplicate or near-duplicate generation requests
- Generated content unrelated to trivia format
- Prompts containing code or non-topic text

**Phase to address:**
Phase 2 (Cloud Storage) — implement rate limiting and token accounting; Phase 3 (AI Generation) — add content analysis and abuse detection

---

### Pitfall 8: Content Moderation Gaps

**What goes wrong:**
AI generates inappropriate, offensive, or harmful questions. A "Sports & Gaming" question contains hate speech. A "Pop Culture" question includes sexualized content. App Store review rejects the app, or users report offensive content, or platform policies are violated.

**Why it happens:**
LLMs trained on internet data can generate harmful content. Topic prompts like "edgy humor" or adversarial inputs bypass safety filters. Content moderation is often an afterthought, not a core pipeline component. Research shows 57% of AI-generated questions have at least one implausible distractor, and content safety issues can slip through.

**How to avoid:**
1. **Pre-generation moderation**: Validate topic inputs before sending to AI — reject banned terms
2. **Post-generation moderation**: Run generated questions through moderation API (OpenAI Moderation, Perspective API)
3. **Multi-layer filtering**: Keyword filters + ML-based content classification + fact-checking
4. **Confidence thresholds**: Reject questions below moderation confidence threshold (e.g., < 0.9)
5. **Human review queue**: Flag questions with medium confidence (0.7-0.9) for manual review
6. **Category-specific rules**: Stricter moderation for sensitive categories
7. **User reporting**: Allow users to flag inappropriate questions from within the app

**Moderation pipeline:**
```
Topic Input → Banned Terms Filter → AI Generation → Moderation API → Confidence Check
                                                                      ↓
                                                              ┌─────────────┐
                                                              │ >0.9: Accept │
                                                              │ 0.7-0.9: Review Queue │
                                                              │ <0.7: Reject │
                                                              └─────────────┘
```

**Warning signs:**
- Questions containing profanity or slurs
- Questions about sensitive historical events without context
- Questions with sexual or violent content
- User reports of offensive questions
- Low moderation API confidence scores (< 0.8)
- Questions about public figures with negative framing

**Phase to address:**
Phase 3 (AI Generation) — implement moderation pipeline; Phase 2 (Cloud Storage) — add flagged content handling and review queue

---

### Pitfall 9: Question Quality Below Threshold

**What goes wrong:**
AI-generated questions pass fact-checking but fail quality standards. Questions are grammatically correct but confusing, have implausible distractors, or don't match the difficulty level. Research shows 57% of AI-generated questions have at least one implausible distractor, and average of 1.6-2.18 Item Writing Flaws per question.

**Why it happens:**
Models optimize for fluency over pedagogical quality. Distractors are often obviously wrong or too similar to each other. Questions may be answerable without reading the source material (guessability issue). Difficulty calibration requires domain expertise that models lack.

**How to avoid:**
1. **Multi-metric quality scoring**: Grammar, answerability, difficulty, clarity, distractor quality, contextual specificity
2. **Distractor plausibility check**: Verify wrong answers are believable but definitively incorrect
3. **Difficulty calibration**: Rate questions on 1-5 scale, verify distribution matches target
4. **Non-guessability validation**: Check if question requires knowledge vs. can be guessed from wording
5. **Human review workflow**: Editorial queue for questions below quality threshold
6. **Quality tiering**: "Verified" (human-reviewed), "AI-Generated" (passed auto-checks), "Draft" (needs review)

**Quality metrics from research:**
| Metric | Acceptable | Target |
|--------|------------|--------|
| Grammar score | > 0.95 | 1.0 |
| Answerability | > 0.90 | 0.95 |
| Distractor quality | > 0.80 | 0.90 |
| Contextual specificity | > 0.85 | 0.90 |
| Item Writing Flaws | < 1.5 avg | < 1.0 |

**Warning signs:**
- Questions with "all of the above" or "none of the above" distractors
- Distractors that are obviously wrong or joke answers
- Questions where the answer is revealed in the question text
- Difficulty ratings inconsistent with target (e.g., "easy" question that's actually hard)
- Questions answerable with world knowledge vs. category knowledge

**Phase to address:**
Phase 3 (AI Generation) — quality scoring pipeline; Phase 1 (Question Pack Data Structure) — quality metadata in schema

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip schema versioning | Faster initial development | Breaking changes require app updates, users lose packs | Never — design versioning from day one |
| Load entire pack into memory | Simpler code | Performance collapse at scale, memory crashes | Prototyping only, < 100 questions |
| Last-write-wins sync | Easier implementation | Silent data loss, user frustration, support burden | Read-only data only |
| Skip human review | Faster question pipeline | 20-45% hallucination rate, offensive content published | Never for production |
| No rate limiting by tokens | Simpler quota logic | API cost abuse, budget exhaustion, service unavailable | Never for AI endpoints |
| Trust AI output blindly | Faster iteration | Offensive/harmful content, factual errors, platform rejection | Never |
| Single model validation | Faster generation | Missed hallucinations, bias, quality issues | Never — use multi-model |
| Skip difficulty calibration | Faster question creation | Category imbalance, player frustration | v1 acceptable if human-reviewed |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| AI API (OpenAI/Anthropic) | Request-based rate limiting | Token-based quotas with cost multipliers per model |
| AI API | Retry on all errors | Only retry on 5xx/rate limit, not 4xx (content violations) |
| AI API | Trust output without validation | Multi-model fact-checking + moderation pipeline |
| Cloud Storage | Assume online connectivity | Offline-first with sync queue, conflict metadata |
| Cloud Storage | Single endpoint for all packs | CDN distribution with version caching |
| Cloud Storage | JSON file per pack | Database storage with lazy queries, indexes |
| WatermelonDB | Query entire collection | Use `.query()` with lazy loading, pagination |
| JSON Schema | `additionalProperties: false` | Omit or use `true` for forward compatibility |
| Moderation API | Check only final output | Check input topics AND output questions |
| Sync Protocol | Overwrite on conflict | Optimistic concurrency with explicit conflict UX |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all questions into memory | Memory pressure, slow app, crashes | Lazy loading with WatermelonDB `.observe()` | 100+ questions |
| No database indexes | Slow search, laggy scrolling, 2s+ queries | Index on category, used status, difficulty | 500+ questions |
| Pack as single JSON file | Long parse times, blocking UI | Database storage with lazy queries | 1MB+ files |
| Sync without batching | Timeout, battery drain, failed syncs | Batch mutations, compress payloads, background | 100+ pending changes |
| AI generation per question | Long wait times, API rate limits | Batch generation, background jobs, progress UI | > 10 questions |
| No token rate limiting | API cost abuse, budget exhaustion | Per-user token quotas with daily limits | Any public AI endpoint |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Prompt concatenation | Injection, manipulation, instruction leakage | Template parameters, structured input, separate context windows |
| No token rate limiting | API cost abuse, budget exhaustion | Per-user token quotas, daily/monthly limits |
| Storing AI prompts client-side | Prompt extraction, model distillation | Prompts stay server-side only, return only results |
| No content moderation | Harmful content published, platform rejection | Multi-layer moderation pipeline (pre + post) |
| Trusting AI confidence scores | Hallucinations accepted as facts | Multi-model fact-checking, human review below threshold |
| No pack signing/integrity | Malicious pack injection | Cryptographic signatures, hash verification |
| Client-side validation only | Bypassed validation, malicious content | Server-side validation for all inputs |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Blocking UI during pack load | App feels frozen, users force-quit | Background load with progress indicator, lazy loading |
| No offline indication | Users confused why features don't work | Clear offline mode UI, cached pack status |
| Generic "sync failed" error | Users don't know how to recover | Specific error + retry button + manual conflict resolution |
| Auto-publishing AI questions | Offensive content appears in game | Human review queue for questions below confidence threshold |
| One category for all generated | Repetitive questions, boring gameplay | Category diversity in prompts, rotation strategy |
| No progress during generation | Users think app froze | Streaming progress or background generation with notification |
| Skipping quality review | Low-quality questions in packs | Quality score visibility, "needs review" indicator |
| Pack download without resume | Wasted bandwidth on failure | Chunked downloads, resume capability |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **AI Question Generation:** Often missing multi-model fact-checking — verify accuracy pipeline runs before storage
- [ ] **Pack Versioning:** Often missing migration handlers — verify old packs still load after schema change
- [ ] **Offline Sync:** Often missing conflict resolution UX — verify conflict handling shows both versions
- [ ] **Rate Limiting:** Often missing token-based quotas — verify abuse detection on AI endpoints
- [ ] **Content Moderation:** Often missing post-generation moderation — verify safety pipeline catches issues
- [ ] **Performance:** Often missing lazy loading — verify app handles 1000+ questions without memory issues
- [ ] **Error Recovery:** Often missing retry logic — verify network failure handling with exponential backoff
- [ ] **Quality Scoring:** Often missing distractor validation — verify wrong answers are plausible but incorrect

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hallucination in published pack | MEDIUM | Pull pack from distribution, regenerate questions with fact-checking, notify users with update |
| Prompt injection success | HIGH | Audit all generated content, patch prompt templates, add input sanitization, rotate API keys |
| Schema migration failure | HIGH | Roll back app version temporarily, create migration fix, handle both versions, test upgrade paths |
| Sync data loss | HIGH | Restore from server backup if available, manual merge for user-reported losses, improve conflict UX |
| Performance collapse | MEDIUM | Add lazy loading, index database, paginate queries, profile memory usage, reduce pack size |
| Abuse detected | LOW | Block offending accounts, add rate limiting, audit API costs, implement token quotas |
| Offensive content published | HIGH | Remove content immediately, notify users, improve moderation pipeline, add user reporting |
| Low question quality | MEDIUM | Add quality scoring, implement human review queue, regenerate low-score questions |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AI Hallucination | Phase 3 (AI Generation) | Multi-model fact-checking pipeline, confidence scores in output |
| Prompt Injection | Phase 3 (AI Generation) | Input validation, structured prompts, moderation layer |
| Schema Migration | Phase 1 (Data Structure) | Versioned schema from day one, upcaster pattern, migration tests |
| Offline Sync Conflicts | Phase 4 (State Persistence) | Conflict metadata, resolution UX, outbox pattern |
| Large Pack Performance | Phase 1 (Data Structure) | Lazy loading design, database indexes, pagination |
| Semantic Leakage | Phase 3 (AI Generation) | Category validation, distractor diversity check, prompt engineering |
| API Abuse | Phase 2 (Cloud Storage) | Token quotas, per-request verification, cost monitoring |
| Content Moderation | Phase 3 (AI Generation) | Pre/post moderation, human review queue, user reporting |
| Question Quality | Phase 3 (AI Generation) | Multi-metric scoring, distractor validation, human review workflow |

## Sources

### AI Hallucination and Quality Research
- [BBC/EBU News Integrity Study (October 2025)](https://www.bbc.co.uk/mediacentre/documents/news-integrity-in-ai-assistants-report.pdf) — 45% of AI responses contain significant issues
- [OpenAI: Why Language Models Hallucinate (2025)](https://openai.com/index/why-language-models-hallucinate/) — Statistical pressure and evaluation incentives
- [NAACL 2025: Semantic Leakage](https://aclanthology.org/2025.naacl-long.35.pdf) — Instruction-tuned models leak more
- [ICLR 2025: Internal Knowledge vs. External Behavior](https://belinkov.com/assets/pdf/iclr2025-know.pdf) — Models encode correct answers but generate wrong outputs
- [University of Michigan L@S '24](https://websites.umich.edu/~kevynct/pubs/L_S_2024_WorkInProgress_Question_Generation_CRFinal2.pdf) — 57% of AI questions have implausible distractors
- [University of Zurich 2024](https://arxiv.org/pdf/2404.07720) — Text informativity metric for question quality
- [Google Cloud Quizaic Case Study (July 2024)](https://medium.com/google-cloud/quizaic-a-generative-ai-case-study-edca6cb89605) — Multi-model fact-checking pipeline

### Security and Prompt Injection
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — LLM01 Prompt Injection ranked #1
- [USENIX Security 2024: Formalizing Prompt Injection Attacks](https://www.usenix.org/system/files/usenixsecurity24-liu-yupei.pdf) — Attack framework, 10 LLMs tested
- [Microsoft Defense Strategy (2025)](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks) — Spotlighting, detection, mitigation layers

### Schema Versioning and Migrations
- [JSON Schema Migration Best Practices](https://jsonic.io/guides/json-schema-migration) — Versioning, upcasters, compatibility modes
- [WatermelonDB Migrations](https://watermelondb.dev/docs/Advanced/Migrations) — Schema migrations API

### Offline Sync and Conflict Resolution
- [Flutter Offline-First Apps (2024)](https://samioda.com/en/blog/flutter-offline-first-sync-conflict-resolution) — Conflict resolution patterns
- [WatermelonDB Sync Protocol](https://watermelondb.dev/docs/Sync/) — Pull/push changes, conflict detection

### Content Moderation
- [NeurIPS 2024: DeTeCtive](https://proceedings.neurips.cc/paper_files/2024/file/a117a3cd54b7affad04618c77c2fb18b-Paper-Conference.pdf) — Multi-level contrastive learning for AI text detection
- [Nature Scientific Reports 2025](https://www.nature.com/articles/s41598-025-27377-z) — Human vs AI text classification
- [ACL 2025: Conformal Prediction](https://aclanthology.org/2025.acl-long.601.pdf) — False positive control

### Rate Limiting and API Abuse
- [LLM Rate Limiting in Production](https://www.systemshardening.com/articles/kubernetes/llm-rate-limiting/) — Token budgets, per-user quotas
- [Vercel: Protecting Against Inference Theft (2026)](https://vercel.com/blog/protecting-against-inference-theft) — Per-request verification
- [LockLLM: Abuse Detection](https://www.lockllm.com/docs/abuse-detection) — Bot score, repetition score, pattern score

### Database Performance
- [WatermelonDB + Expo SDK 54 Guide](https://dev.to/fasthedeveloper/watermelondb-expo-sdk-54-the-complete-mobile-offline-first-setup-guide-that-actually-works-5he5) — Lazy loading, reactive queries
- [Expo SQLite v14 Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite) — Pagination with getEachAsync

### Question Pack Versioning
- [Android Play Asset Delivery](https://developer.android.com/guide/playcore/asset-delivery) — On-demand content bundles
- [On-Device AI Model Delivery](https://xckevin.com/en/blog/android-on-device-ai-model-delivery-versioning/) — Three-layer versioning system

---

*Pitfalls research for: AI Question Generation and Pack Management*
*Researched: 2026-06-08*