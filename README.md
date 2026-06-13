# Trivial World

**Play Now: [trivial-world.netlify.app →](https://trivial-world.netlify.app)**

A mobile trivia game for in-person social play, with a web-based question generator for creating custom question packs.

## Overview

Trivial World enables in-person social trivia gameplay where one person acts as the **game conductor**, reading questions aloud from the app while participants play together. The app handles die rolls, move choices, question management, and scoring — players engage in a shared physical space around the mobile device.

### Features

- **Game Conductor Model**: One person reads questions, everyone plays together
- **6 Trivia Categories**: Adapted from Trivial Pursuit for modern interests
- **Custom Question Packs**: AI-powered question generation via web app
- **Offline-First**: No network required for core gameplay
- **Built-in Default Pack**: 120 questions included, ready to play

## Prerequisites

- **Node.js** 18+
- **pnpm** 9.0+ (`npm install -g pnpm`)
- **Expo CLI** (installed automatically)
- **Ollama** (optional, for AI question generation)

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd trivial-world

# Install dependencies
pnpm install
```

## Running the Apps

### Mobile App (iOS/Android)

```bash
# Navigate to mobile app
cd apps/mobile

# Start Expo development server
pnpm start

# Or run on specific platform:
pnpm ios      # iOS Simulator
pnpm android  # Android Emulator
pnpm web      # Web browser (limited features)
```

The mobile app will start at `http://localhost:8081` (Expo default).

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
   - The built-in "Default Pack" contains 120 questions across all categories
   - Download additional packs from the generator web app
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

### Prerequisites

- **Ollama** installed and running (`ollama serve`)
- **Language model** pulled (`ollama pull llama3.2` or similar)

### Steps

1. **Start the generator app** (`cd apps/generator && pnpm dev`)
2. **Open** `http://localhost:3000` in your browser
3. **Enter pack metadata**:
   - Pack name, description, author
   - Select categories to include
   - Set difficulty levels
4. **Generate questions**:
   - Enter a topic or question prompt
   - Click "Generate" — the AI creates questions
   - Review each question for accuracy
   - Edit or approve as needed
5. **Export the pack**:
   - Minimum 20 approved questions required
   - Click "Download Pack" to get a JSON file
6. **Load into mobile app**:
   - Host the JSON file on a web server
   - Enter the pack URL in the mobile app's pack selection screen

### Question Pack Format

Question packs are JSON files following this structure:

```json
{
  "id": "pack-uuid",
  "name": "My Custom Pack",
  "version": "1.0.0",
  "questions": [
    {
      "id": "q1",
      "category": "blue",
      "questionText": "What is the capital of France?",
      "answerText": "Paris",
      "difficulty": "easy"
    }
  ]
}
```

## Project Structure

```
trivial-world/
├── apps/
│   ├── mobile/           # Expo React Native app
│   │   ├── app/          # Screens (Expo Router)
│   │   ├── components/   # Reusable UI components
│   │   ├── stores/       # Zustand state management
│   │   ├── database/     # WatermelonDB models & migrations
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

- **Mobile**: Expo SDK 56, React Native 0.85, React 19
- **Web**: Next.js 16, React 19, Tailwind CSS
- **State**: Zustand 5 with persist middleware
- **Database**: WatermelonDB (offline-first)
- **UI**: Tamagui 2.x (mobile), Tailwind (web)
- **Animations**: react-native-reanimated 3.x
- **AI**: Ollama with Vercel AI SDK
- **Validation**: Zod 4 schemas
- **Monorepo**: Turborepo 2, pnpm workspaces

## License

MIT