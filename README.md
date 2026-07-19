# Trivial World

**Play Now: [trivial-world.netlify.app →](https://trivial-world.netlify.app)**

A web/PWA trivia game for in-person social play, with a web-based question generator for creating custom question packs.

## Overview

Trivial World enables in-person social trivia gameplay where one person acts as the **game conductor**, reading questions aloud from the app while participants play together. The app handles die rolls, move choices, question management, and scoring — players engage in a shared physical space around the mobile device.

### Features

- **Game Conductor Model**: One person reads questions, everyone plays together
- **6 Trivia Categories**: Adapted from Trivial Pursuit for modern interests
- **Custom Question Packs**: Generate packs in Claude chat with `/tw-add-pack` — no Ollama needed
- **Offline-First PWA**: No network required for core gameplay after first load
- **Growing Pack Library**: 20+ packs available at [trivial-world.netlify.app](https://trivial-world.netlify.app)

## Prerequisites

- **Node.js** 18+
- **pnpm** 9.0+ (`npm install -g pnpm`)
- **Expo CLI** (installed automatically)
- **Claude Code** (optional, for generating question packs via `/tw-add-pack`)
- **Ollama** (optional, for the standalone generator web app only)

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd trivial-world

# Install dependencies
pnpm install
```

## Running the Apps

### Mobile App (Web/PWA)

```bash
# Navigate to mobile app
cd apps/mobile

# Start Expo web dev server
pnpm start
```

The app runs at http://localhost:8081 (Expo web). Production build: `pnpm build:web`.

### Deploying to Netlify

The mobile app is a static, installable PWA that Netlify can host for free. The included `apps/mobile/netlify.toml` already configures the build command (`pnpm install && pnpm build`), the publish directory (`dist`), and Node 20 — so you don't need to set those yourself. The build also copies `_redirects` (SPA routing) and `manifest.webmanifest` (PWA) into `dist/`, and Netlify reads `_redirects` automatically. No prior Netlify experience is assumed.

1. **Create a Netlify account** at https://app.netlify.com/signup (free — sign in with email, GitHub, GitLab, or Bitbucket).
2. **Push this project to a Git repo** on GitHub, GitLab, or Bitbucket if you haven't already.
3. In the Netlify dashboard, click **Add a new site** → **Import an existing project** → choose your Git provider → select your repo.
4. In the deploy settings, set **Base directory** to `apps/mobile`. (Netlify chroots here and reads the `netlify.toml`, so **Build command** and **Publish directory** fill in automatically — leave them as `pnpm install && pnpm build` and `dist`.)
5. Click **Deploy site**. The first build takes a few minutes. When it finishes you get a URL like `https://<random-name>.netlify.app`.
6. Every future push to your default branch rebuilds and deploys automatically. Branch deploys and deploy previews for PRs are on by default.

What you get: SPA routing (every unknown path falls back to `index.html`, so `/game/setup` etc. work on refresh), an offline Service Worker (`sw.js` precaches the app shell; pack bodies cache in IndexedDB), and the option to add a custom domain later under **Site settings → Domain management** (Netlify provisions HTTPS automatically).

### Question Generator Web App

```bash
# Navigate to generator app
cd apps/generator

# Start Next.js development server
pnpm dev
```

The generator app will start at `http://localhost:3000`.

## How to Play

### Starting a Game

1. **Open the app** on your mobile device
2. **Select a question pack** from the pack selection screen
   - 20+ packs are available — the Starter Pack is included by default
   - Add more packs at any time with `/tw-add-pack` in Claude Code
3. **Add participants** — Enter names for each player (minimum 1 player)
4. **Tap "Start Game"** to begin

### Game Flow

The game follows a turn-based structure:

1. **Roll the die** — The current player taps to roll
2. **Choose a move** — Select from available board positions based on the roll
3. **Answer a question** — The conductor reads the question aloud from the selected category
4. **Mark correct/incorrect** — The conductor marks the player's answer
5. **Score wedges** — Correct answers in center positions earn category wedges
6. **Next turn** — Play passes to the next player

### Categories

| Color | Category | Topics |
|-------|----------|--------|
| 🔵 Blue | The World Outside | Game maps, landmarks, anime settings |
| 🩷 Pink | Pop Culture & Streaming | Streamers, memes, Marvel, YouTubers |
| 🟡 Yellow | Milestones & Myths | Tech history, ancient warriors, battles |
| 🟣 Purple | Animation and Artwork | Comics, graphic novels, artists |
| 🟢 Green | Tech, Space & Logic | AI, astronomy, apex predators |
| 🟠 Orange | Sports & Gaming | Pro sports, college sports, esports |

### Winning

Collect all 6 category wedges to win! Wedges are earned by answering questions correctly in center positions on the board.

## Creating Custom Question Packs

The fastest way to add a pack is with the `tw-add-pack` Claude skill — no external tools or Ollama required. Claude generates questions directly in chat, you review and approve them, and the skill installs and deploys the pack automatically.

### Using the `tw-add-pack` skill (recommended)

In a Claude Code session at the repo root:

```
/tw-add-pack
```

Claude will ask for a topic, pack name, author, which categories to include, and how many questions per category. It then:

1. Generates all questions in chat for your review
2. Applies any corrections you request
3. Builds the pack JSON with a proper UUID, checksum, and metadata
4. Installs it to `apps/mobile/public/packs/`
5. Updates the pack index at `apps/mobile/public/api/v1/packs.json`
6. Commits and pushes — Netlify deploys in ~1 minute

**To install a pre-made pack JSON file:**

```
/tw-add-pack path/to/mypack.json
```

The skill validates the file and runs the install/deploy steps.

### Question pack format

Pack files follow this structure:

```json
{
  "metadata": {
    "id": "<RFC-4122 UUID>",
    "name": "My Custom Pack",
    "description": "One-sentence description.",
    "version": "1.0.0",
    "author": "Author Name",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "categoryCounts": { "blue": 10, "pink": 10, "yellow": 10, "purple": 10, "green": 10, "orange": 10 },
    "totalQuestions": 60,
    "checksum": "<sha256 of serialized questions array>",
    "schemaVersion": "1.0.0",
    "contentEncoding": "identity",
    "size": 0
  },
  "questions": [
    {
      "id": "blue-001",
      "category": "blue",
      "questionText": "What is the capital of France?",
      "answerText": "Paris",
      "difficulty": "easy"
    }
  ]
}
```

Valid `difficulty` values: `"easy"`, `"medium"`, `"hard"`.

### Generator web app (offline/batch alternative)

A standalone Next.js generator app lives at `apps/generator`. It uses Ollama for AI generation and is useful for batch workflows outside of Claude sessions.

```bash
# Requires Ollama running locally
ollama serve
ollama pull llama3.2

cd apps/generator && pnpm dev
# Open http://localhost:3000
```

## Project Structure

```
trivial-world/
├── apps/
│   ├── mobile/           # Expo web/PWA app (web-only — native build path removed in v12.0)
│   │   ├── app/          # Screens (Expo Router)
│   │   ├── components/   # Reusable UI components
│   │   ├── stores/       # Zustand state management
│   │   └── constants/    # Theme, categories, colors
│   │
│   └── generator/        # Next.js web app for AI question generation
│       ├── app/          # Pages (App Router)
│       ├── components/   # UI components
│       ├── hooks/        # React hooks
│       └── lib/          # Ollama client, storage, export
│
├── packages/
│   └── types/            # Shared TypeScript types & Zod schemas
│
└── .planning/            # Project documentation & phase plans
```

## Development Commands

```bash
# Root level (monorepo)
pnpm build      # Build all packages
pnpm test       # Run all tests
pnpm lint       # Lint all packages
pnpm typecheck  # TypeScript check all packages

# Mobile app only
cd apps/mobile
pnpm start      # Start Expo dev server
pnpm test        # Run mobile tests

# Generator app only
cd apps/generator
pnpm dev          # Start Next.js dev server
pnpm build        # Build for production
pnpm test         # Run generator tests
```

## Tech Stack

- **Mobile (Web/PWA)**: Expo SDK 56, React Native 0.85 (web export), React 19
- **Web**: Next.js 16, React 19, Tailwind CSS
- **State**: Zustand 5 with persist middleware
- **Storage**: IndexedDB (idb-keyval) + sessionStorage (offline-first web)
- **UI**: Tamagui 2.x (mobile), Tailwind (web)
- **Animations**: react-native-reanimated 3.x
- **AI**: Ollama with Vercel AI SDK
- **Validation**: Zod 4 schemas
- **Monorepo**: Turborepo 2, pnpm workspaces

## License

MIT