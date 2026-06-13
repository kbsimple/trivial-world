---
name: tw-add-pack
description: "Add a new question pack to the Trivial World game — generate questions here in chat, review them, build the pack, and deploy"
argument-hint: "[path/to/pack.json]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

<objective>
Walk through the full question pack workflow for the Trivial World game entirely within this chat session.

Two entry points:
- **With a file path argument:** skip straight to install (Step 4).
- **Without an argument:** Claude generates questions interactively here, then installs and deploys.

The working directory is the trivial-world monorepo root.
</objective>

<process>

## Step 1 — Determine starting point

If $ARGUMENTS is a readable `.json` file path → skip to **Step 4** (validate & install).

Otherwise → proceed to **Step 2** (generate).

## Step 2 — Gather pack parameters

Ask the user (collect all at once in a single message):

1. **Topic / theme** — what should this pack be about? (e.g. "90s video games", "Marvel cinematic universe", "Ancient Rome")
2. **Pack name** — a short title (e.g. "90s Gaming Nostalgia")
3. **Author** — who should be credited?
4. **Which categories to include** — default is all six. Categories and their colors:
   - blue: The World Outside (geography, game maps, anime settings)
   - pink: Pop Culture & Streaming (streamers, memes, Marvel, YouTubers)
   - yellow: Milestones & Myths (tech history, ancient warriors, battles)
   - purple: Animation and Artwork (comics, graphic novels, artists)
   - green: Tech, Space & Logic (AI, astronomy, apex predators)
   - orange: Sports & Gaming (pro sports, college sports, esports)
5. **Questions per category** — default is 10. Minimum 5, maximum 20.

## Step 3 — Generate and review questions

Generate all questions directly without calling any external service. For each enabled category, produce the requested number of questions, each with:

```json
{
  "id": "<category>-<zero-padded-3-digit-number>",
  "category": "<color>",
  "difficulty": "easy" | "medium" | "hard",
  "questionText": "...",
  "answerText": "..."
}
```

Guidelines:
- Mix difficulty: roughly 30% easy, 50% medium, 20% hard.
- Each question must be unambiguously answerable with the given answer.
- Lean into the topic theme across all categories (e.g. a Marvel pack's "green: Tech" questions should cover Marvel technology like Iron Man suits or Pym Particles).
- Answers should be concise — a word, a name, a number. Not a sentence.
- No duplicate questions within the pack.

**Present questions to the user for review**, grouped by category. Show: question number, difficulty tag, question text, and answer. Then ask:

> Review the questions above. Reply with any corrections (e.g. "blue-003: change answer to X", "replace pink-007") or type **approve** to proceed.

Handle corrections and re-display only the affected questions. Repeat until the user approves.

## Step 4 — Validate pack JSON (file path entry point only)

Read the file. Confirm it has the required shape:
- `metadata.id` (UUID)
- `metadata.name` (string)
- `metadata.author` (string)
- `metadata.version` (semver string)
- `metadata.totalQuestions` (number > 0)
- `metadata.categoryCounts` (object with at least one category key)
- `metadata.checksum` (string)
- `questions` array (length matches totalQuestions)

If validation fails, tell the user what's missing and stop.

## Step 5 — Build the pack JSON (generated packs only)

Assemble the full pack JSON object. Generate a UUID:
```bash
python3 -c "import uuid; print(uuid.uuid4())"
```

Serialize the questions array to a compact JSON string and compute the checksum:
```bash
echo -n '<questions array JSON>' | shasum -a 256 | awk '{print $1}'
```

Pack structure:
```json
{
  "metadata": {
    "id": "<uuid>",
    "name": "<pack name>",
    "description": "<one-sentence description>",
    "version": "1.0.0",
    "author": "<author>",
    "createdAt": "<ISO timestamp>",
    "updatedAt": "<ISO timestamp>",
    "categoryCounts": { "<color>": <count>, ... },
    "totalQuestions": <total>,
    "checksum": "<sha256>",
    "schemaVersion": "1.0.0",
    "contentEncoding": "identity",
    "size": 0
  },
  "questions": [ ... ]
}
```

Write the pack JSON to `/tmp/<slug>.json`.

## Step 6 — Determine the destination filename

```
{slug}-{short-id}.json
```

- `slug` = name lowercased, spaces → hyphens, non-alphanumeric stripped
- `short-id` = first 8 characters of the UUID (hyphens removed)

Example: name "90s Gaming Nostalgia", id "a1b2c3d4-..." → `90s-gaming-nostalgia-a1b2c3d4.json`

Check if a file with that name already exists in `apps/mobile/public/packs/`.
- Same version → ask the user whether to overwrite.
- Newer version → proceed.

## Step 7 — Copy the pack file and fix size

```bash
cp <source-path> apps/mobile/public/packs/<filename>
```

Get the actual file size and write it back into the `metadata.size` field:
```bash
wc -c < apps/mobile/public/packs/<filename> | tr -d ' '
```

## Step 8 — Update the pack index

Read `apps/mobile/public/api/v1/packs.json`.

Build the index entry:
```json
{
  "id": "<metadata.id>",
  "name": "<metadata.name>",
  "author": "<metadata.author>",
  "version": "<metadata.version>",
  "totalQuestions": <metadata.totalQuestions>,
  "categoryCounts": <metadata.categoryCounts>,
  "downloadUrl": "https://trivial-world.netlify.app/packs/<filename>",
  "checksum": "<metadata.checksum>",
  "size": <size in bytes>
}
```

- If an entry with the same `id` exists → replace it.
- Otherwise → append to the `packs` array.

Write the updated `packs.json`.

## Step 9 — Build and test

```bash
pnpm build
```

```bash
cd apps/mobile && pnpm test run
```

If either fails, show the error and stop. Do not commit broken state.

## Step 10 — Commit and push

```bash
git add apps/mobile/public/packs/<filename> apps/mobile/public/api/v1/packs.json
```

```
feat(packs): add "<pack name>" v<version>

<totalQuestions> questions across <N> categories.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

```bash
git push
```

## Step 11 — Confirm

Tell the user:
- Pack installed: `apps/mobile/public/packs/<filename>`
- Pack index updated: `apps/mobile/public/api/v1/packs.json`
- Pushed to main — Netlify will deploy in ~1 minute
- Pack will be available in the game at: `https://trivial-world.netlify.app`

</process>

<notes>
- Claude generates questions directly — no Ollama, no browser, no generator web app needed during a chat session.
- If the user provides a pre-made pack JSON as $ARGUMENTS, skip straight to validation and install.
- The generator web app (apps/generator) remains available as a standalone tool for offline/batch generation outside of Claude sessions, where it uses Ollama.
- Pack files are served as static JSON by the game site. No server-side work required.
- `packs.json` is the index the mobile app fetches on the Select Pack screen. Every installed pack must appear here.
</notes>
