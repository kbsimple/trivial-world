# Phase 8: Game Configuration - Research

**Researched:** 2026-06-08
**Domain:** Pack selection, game settings, and pack management UI in mobile app
**Confidence:** HIGH

## Summary

This phase implements the game configuration UI that enables conductors to select question packs, filter categories and difficulty levels, and manage downloaded packs. The implementation builds on Phase 6's WatermelonDB models and integrates with the established navigation, store, and UI patterns.

The core implementation involves: (1) a new pack selection screen before game setup, (2) a pack details modal overlay, (3) a pack download service with checksum verification, (4) a new packStore for pack state management, and (5) modifications to questionStore to query WatermelonDB instead of hardcoded imports. The built-in default pack containing the existing 120 questions must be bundled and seeded on first launch.

**Primary recommendation:** Create a clear navigation flow Home -> Pack Selection -> Setup -> Game, with pack state managed by a new Zustand packStore, downloads handled by a new packDownloader service, and WatermelonDB queries replacing the current hardcoded question imports.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Pack Selection Flow

- **D-01:** Pack selection screen BEFORE setup screen. Flow: Home → Pack Selection → Setup → Game. Clean separation where user picks content before adding participants.
- **D-02:** Built-in default pack included with app. The 120 existing questions are bundled as a default pack so new users can play immediately without downloading. This pack is immutable and always present.
- **D-03:** Hardcoded generator URL for pack index. The app fetches available packs from a known endpoint (configured in code). Users cannot change this URL in v2.0.

### Game Settings

- **D-04:** No time limits per question. The conductor controls pacing — no countdown timers, no auto-skip. Keeps the social, eyes-up experience.
- **D-05:** Category filtering before game start. On the pack selection screen, conductor can toggle which categories (blue, pink, yellow, purple, green, orange) are included. This is the existing `setEnabledCategories` pattern from questionStore, now surfaced in UI.
- **D-06:** Difficulty filtering as optional pre-game setting. Conductor can filter by easy/medium/hard or include all difficulties. Implemented alongside category filtering on the same UI.
- **D-07:** No game variants for v2.0. Category filtering and difficulty filtering are sufficient configurability. Win condition remains "collect all 6 wedges + center question."

### Pack Details UI

- **D-08:** Modal overlay for pack details. Tapping a pack in the list opens a modal overlay (not a separate screen or inline expansion). Quick to dismiss, stays in selection context.
- **D-09:** Pack details modal shows: (1) Category distribution visual (bar chart or pie), (2) Question counts per category and total, (3) Difficulty breakdown (easy/medium/hard counts or visual), (4) Pack metadata (version, author, download date, checksum status).

### Download Experience

- **D-10:** Progress bar during pack download. User sees download progress with percentage/bytes. No background download — user waits for completion before continuing.
- **D-11:** Alert with retry on download failure. If download fails, show an alert explaining the error with a "Retry" button. Clear feedback, immediate recovery path.
- **D-12:** Checksum verification is silent on success. If checksum matches, proceed normally. If mismatch, show error alert with "Retry download" option.

### Update Notifications

- **D-13:** Badge on pack for available updates. When a newer version of a downloaded pack is detected, show "Update available" badge on that pack in the list. Non-intrusive — user can update when ready.
- **D-14:** Version comparison uses semver. Pack version in metadata compared against downloaded version. Major version bumps may indicate breaking changes.

### Pack Storage

- **D-15:** Only one active pack at a time (per D-04 from Phase 6). Selecting a new pack deactivates the previous. Asked questions are tracked per-pack via `askedAt` timestamp.
- **D-16:** Downloaded packs persist in WatermelonDB. Pack metadata stored in `question_packs` table, questions in `questions` table with foreign key to pack.

### Claude's Discretion

- Exact visual design of category distribution chart (bar vs pie vs colored dots)
- Animation for download progress bar
- Exact wording for download error messages
- Badge styling for "Update available"
- How to handle major version mismatches (blocking vs warning)

### Deferred Ideas (OUT OF SCOPE)

- Time Limits Per Question — countdown timer with configurable duration
- Game Variants — short game, point-based scoring, custom win conditions
- Configurable Generator URL — settings screen for power users
- Pack Storage Management — delete downloaded packs UI, storage usage display
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-01 | Pack selection UI in game setup showing available packs with metadata | New `app/packs/index.tsx` screen, PackIndexEntry type from types package, WatermelonDB query for downloaded packs, hardcoded pack index URL |
| CONF-02 | Game settings including time limits per question, difficulty levels, and game variants | D-04 locks no time limits. D-06 locks difficulty filtering. D-07 locks no variants. Implementation: category/difficulty toggles on pack selection screen |
| CONF-03 | Category filtering allowing conductors to enable/disable specific categories within a pack | questionStore.setEnabledCategories pattern exists. UI: 6 toggles with CATEGORY_COLORS visual indicators. Store: enabledCategories persists via Zustand |
| CONF-04 | Pack details view showing category distribution, question count, and difficulty breakdown | D-08: modal overlay. D-09: category distribution visual, per-category counts, difficulty breakdown, metadata. QuestionPackModel.getCategoryCounts() method exists |
| CLOUD-02 | Build pack download service with checksum verification for integrity | New `services/packDownloader.ts`. Use expo-file-system or fetch API. SHA-256 verification via checksum field. Zod validation via QuestionPackSchema |
| CLOUD-03 | Track pack versions for update notifications and migration handling | D-13: badge on pack for updates. D-14: semver comparison. WatermelonDB stores version field. PackIndexEntry includes version for comparison |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Pack list display | Browser/Mobile UI | — | Pack selection happens on mobile device, no server tier for v2.0 |
| Pack download | Mobile Service Layer | — | Download happens directly from CDN to mobile, no server proxy |
| Pack validation | Mobile Service Layer | — | Zod schema validation runs client-side after download |
| Pack storage | Database (WatermelonDB) | — | Offline-first local SQLite storage |
| Category filtering | State (Zustand) | Database | questionStore manages enabledCategories, WatermelonDB queries filter by category |
| Difficulty filtering | State (Zustand) | Database | New setting in gameStore or packStore, queries filter by difficulty |
| Checksum verification | Mobile Service Layer | — | SHA-256 computed locally after download |
| Version comparison | Mobile Service Layer | — | Semver comparison between local and remote pack metadata |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-file-system | ~18.0.0 | File download and storage | [VERIFIED: npm registry] Standard Expo API for file operations, required for pack downloads |
| zustand | ^5.0.14 | State management | [CITED: apps/mobile/package.json] Already used for gameStore, playerStore, questionStore |
| @nozbe/watermelondb | ^0.28.0 | Offline database | [CITED: apps/mobile/package.json] Already used for pack/question storage |
| @trivial-world/types | workspace:* | Shared Zod schemas | [CITED: apps/mobile/package.json] Pack validation schemas from Phase 6 |
| expo-router | ~4.0.19 | Navigation | [CITED: apps/mobile/package.json] File-based routing for pack screens |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | ~3.17.4 | Progress bar animations | Download progress bar per D-10 |
| @react-native-async-storage/async-storage | ^2.1.0 | Zustand persistence | Already used for store persistence |
| tamagui | ^2.1.0 | UI components | Modal overlays, progress bars, badges |

**Installation:**
```bash
# No new dependencies required - all core libraries already installed
# expo-file-system may need to be added if not already present
npx expo install expo-file-system
```

**Version verification:**
```bash
npm view expo-file-system version
# Expected: 18.x.x for Expo SDK 56
npm view zustand version
# Expected: 5.0.x
npm view @nozbe/watermelondb version
# Expected: 0.28.x
```

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                          NAVIGATION (Expo Router)                       ││
│  │  app/index.tsx → app/packs/index.tsx → app/game/setup.tsx → game       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                       │
│  ┌──────────────────────┐    ┌───────────────────────┐                       │
│  │   Pack Selection     │    │    Pack Details       │                       │
│  │   Screen             │───▶│    Modal (Overlay)    │                       │
│  │   app/packs/index.tsx│    │    D-08: modal overlay│                       │
│  └──────────────────────┘    └───────────────────────┘                       │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────────┐    ┌───────────────────────┐                       │
│  │   Pack Store         │    │   Pack Downloader     │                       │
│  │   (Zustand)          │───▶│   Service             │                       │
│  │   - availablePacks   │    │   - fetch pack index  │                       │
│  │   - downloadedPacks  │    │   - download pack     │                       │
│  │   - activePackId     │    │   - validate (Zod)     │                       │
│  │   - enabledCategories│    │   - checksum verify    │                       │
│  │   - difficultyFilter │    │   - save to DB         │                       │
│  └──────────────────────┘    └───────────────────────┘                       │
│           │                           │                                       │
│           ▼                           ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        WATERMELONDB (SQLite)                            ││
│  │  question_packs: [packId, name, version, checksum, isActive, ...]      ││
│  │  questions: [questionPackId, questionId, category, askedAt, ...]      ││
│  │                                                                         ││
│  │  QuestionPackModel.getAvailableQuestions(category)                    ││
│  │  QuestionPackModel.getCategoryCounts()                                 ││
│  │  QuestionModel.markAsAsked()                                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                       │
│                                      ▼                                       │
│  ┌──────────────────────┐    ┌───────────────────────┐                       │
│  │   Question Store     │◀───│   Game Store          │                       │
│  │   (existing)         │    │   (existing)          │                       │
│  │   - selectQuestion() │    │   - activePackId      │                       │
│  │   - query from DB    │    │   (new field)         │                       │
│  └──────────────────────┘    └───────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUD STORAGE (Netlify)                             │
│  pack-index.json ← Hardcoded URL per D-03                                   │
│  pack-{id}-v{version}.json.gz ← Pack files                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
apps/mobile/
├── app/
│   ├── packs/                    # NEW: Pack selection screens
│   │   ├── index.tsx             # Pack browser screen
│   │   └── _layout.tsx           # Pack stack navigation
│   ├── game/
│   │   └── setup.tsx             # Modified: receives selected pack
│   └── index.tsx                 # Modified: adds "Select Pack" button
├── components/
│   ├── PackDetailsModal.tsx      # NEW: Pack details overlay (D-08)
│   ├── PackCard.tsx              # NEW: Pack list item with badge
│   ├── DownloadProgress.tsx      # NEW: Progress bar (D-10)
│   └── CategoryFilter.tsx        # NEW: Category toggles (D-05)
├── stores/
│   ├── packStore.ts              # NEW: Pack state management
│   ├── questionStore.ts          # Modified: query WatermelonDB
│   └── gameStore.ts              # Modified: track activePackId
├── services/
│   ├── packDownloader.ts         # NEW: Download + validation
│   └── packIndex.ts              # NEW: Fetch available packs
├── database/
│   ├── models/
│   │   ├── QuestionPack.ts       # Existing: getAvailableQuestions()
│   │   └── Question.ts           # Existing: markAsAsked()
│   └── migrations/
│       └── 003_seed_default_pack.ts  # NEW: Seed built-in pack (D-02)
└── constants/
    └── packConfig.ts             # NEW: Hardcoded URL, default pack ID
```

### Pattern 1: Zustand Store with Persist Middleware

**What:** Pack state managed by Zustand with AsyncStorage persistence, matching existing pattern in questionStore.

**When to use:** All state that survives app restarts (downloaded packs, active pack selection, category filters).

**Example:**
```typescript
// stores/packStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PackMetadata, Category, Difficulty } from '@trivial-world/types';

interface PackState {
  // Available packs from index
  availablePacks: PackMetadata[];
  // IDs of downloaded packs (in WatermelonDB)
  downloadedPackIds: string[];
  // Currently active pack for gameplay (D-15: only one active)
  activePackId: string | null;
  // Category filter (D-05: before game start)
  enabledCategories: Category[] | null; // null = all enabled
  // Difficulty filter (D-06: optional pre-game setting)
  enabledDifficulties: Difficulty[] | null; // null = all enabled
  // Loading states
  isLoading: boolean;
  downloadProgress: number; // 0-100

  // Actions
  setAvailablePacks: (packs: PackMetadata[]) => void;
  setDownloadedPackIds: (ids: string[]) => void;
  setActivePack: (packId: string | null) => void;
  setEnabledCategories: (categories: Category[] | null) => void;
  setEnabledDifficulties: (difficulties: Difficulty[] | null) => void;
  setDownloadProgress: (progress: number) => void;
}

export const usePackStore = create<PackState>()(
  persist(
    (set) => ({
      availablePacks: [],
      downloadedPackIds: [],
      activePackId: null,
      enabledCategories: null,
      enabledDifficulties: null,
      isLoading: false,
      downloadProgress: 0,

      setAvailablePacks: (packs) => set({ availablePacks: packs }),
      setDownloadedPackIds: (ids) => set({ downloadedPackIds: ids }),
      setActivePack: (packId) => set({ activePackId: packId }),
      setEnabledCategories: (categories) => set({ enabledCategories: categories }),
      setEnabledDifficulties: (difficulties) => set({ enabledDifficulties: difficulties }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),
    }),
    {
      name: 'trivial-world-packs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        downloadedPackIds: state.downloadedPackIds,
        activePackId: state.activePackId,
        enabledCategories: state.enabledCategories,
        enabledDifficulties: state.enabledDifficulties,
      }),
    }
  )
);
```

### Pattern 2: Pack Download Service with Validation

**What:** Service downloads pack JSON, validates with Zod, verifies checksum, stores in WatermelonDB.

**When to use:** When user initiates pack download from pack selection screen.

**Example:**
```typescript
// services/packDownloader.ts
import * as FileSystem from 'expo-file-system';
import { QuestionPackSchema, QuestionPack } from '@trivial-world/types';
import { database } from '../database';
import { QuestionPackModel } from '../database/models/QuestionPack';
import { QuestionModel } from '../database/models/Question';
import { computeSha256 } from './checksum';

export async function downloadPack(
  packId: string,
  downloadUrl: string,
  expectedChecksum: string,
  onProgress?: (progress: number) => void
): Promise<QuestionPack> {
  // D-10: Download with progress
  const downloadPath = `${FileSystem.documentDirectory}pack-${packId}.json`;

  const downloadResult = await FileSystem.downloadAsync(
    downloadUrl,
    downloadPath,
    {
      progressCallback: (progress) => {
        const percent = Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100);
        onProgress?.(percent);
      },
    }
  );

  // Read and parse JSON
  const content = await FileSystem.readAsStringAsync(downloadResult.uri);
  const json = JSON.parse(content);

  // D-12: Checksum verification
  const computedChecksum = await computeSha256(content);
  if (computedChecksum !== expectedChecksum) {
    await FileSystem.deleteAsync(downloadPath);
    throw new Error('Checksum mismatch - pack may be corrupted');
  }

  // Zod validation
  const result = QuestionPackSchema.safeParse(json);
  if (!result.success) {
    await FileSystem.deleteAsync(downloadPath);
    throw new Error(`Pack validation failed: ${result.error.message}`);
  }

  const pack = result.data;

  // D-16: Store in WatermelonDB
  await database.write(async () => {
    const packRecord = await database.get('question_packs').create((p: QuestionPackModel) => {
      p.packId = pack.metadata.id;
      p.name = pack.metadata.name;
      p.version = pack.metadata.version;
      p.author = pack.metadata.author;
      p.downloadedAt = Date.now();
      p.checksum = expectedChecksum;
      p.isActive = false;
      p.categoryCounts = JSON.stringify(pack.metadata.categoryCounts);
      p.totalQuestions = pack.metadata.totalQuestions;
      p.schemaVersion = pack.metadata.schemaVersion;
    });

    // Bulk insert questions
    for (const q of pack.questions) {
      await database.get('questions').create((question: QuestionModel) => {
        question.questionPackId = packRecord.id;
        question.questionId = q.id;
        question.category = q.category;
        question.questionText = q.questionText;
        question.answerText = q.answerText;
        question.difficulty = q.difficulty || 'medium';
        question.choices = q.choices ? JSON.stringify(q.choices) : null;
        question.correctChoiceIndex = q.correctChoiceIndex || null;
        question.askedAt = null; // Not asked yet
      });
    }
  });

  // Cleanup temp file
  await FileSystem.deleteAsync(downloadPath);

  return pack;
}
```

### Pattern 3: WatermelonDB Query for Questions

**What:** Replace hardcoded question imports with WatermelonDB queries, filtering by category and difficulty.

**When to use:** questionStore.selectQuestion() needs to query from active pack.

**Example:**
```typescript
// stores/questionStore.ts (modified)
// Per CONTEXT.md code_context: query WatermelonDB instead of getQuestionsByCategory()

selectQuestion: async (category: PlayerColor) => {
  const { enabledCategories, enabledDifficulties } = usePackStore.getState();
  const activePackId = usePackStore.getState().activePackId;

  // D-05: Check if category is enabled
  if (enabledCategories && !enabledCategories.includes(category)) {
    console.warn(`Category ${category} is disabled`);
    return null;
  }

  // Get active pack
  const pack = await database.get('question_packs')
    .query(Q.where('pack_id', activePackId))
    .fetchOne();

  if (!pack) {
    console.error('No active pack found');
    return null;
  }

  // D-06: Build query with difficulty filter
  let query = pack.questions.extend(Q.where('category', category));

  if (enabledDifficulties && enabledDifficulties.length > 0) {
    query = query.extend(Q.where('difficulty', Q.oneOf(enabledDifficulties)));
  }

  // QSTN-03: Filter out asked questions
  const available = await query.extend(Q.where('asked_at', null)).fetch();

  if (available.length === 0) {
    console.warn(`All questions exhausted for category ${category}`);
    // Reset pool - mark all as not asked
    // ... (reset logic)
  }

  // Random selection
  const selected = available[Math.floor(Math.random() * available.length)];
  return selected.toQuestion();
},
```

### Pattern 4: Modal Overlay for Pack Details

**What:** React Native Modal component overlays pack details without navigating away from pack list.

**When to use:** D-08: User taps a pack in the list to see details.

**Example:**
```typescript
// components/PackDetailsModal.tsx
import { Modal, View, Text, Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { CATEGORY_COLORS, CATEGORY_NAMES } from '../constants/categories';
import type { Category, PackMetadata } from '@trivial-world/types';

interface Props {
  visible: boolean;
  pack: PackMetadata | null;
  onClose: () => void;
  onDownload?: () => void;
}

export function PackDetailsModal({ visible, pack, onClose, onDownload }: Props) {
  const theme = useTheme();

  if (!pack) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.background?.val as string }]}>
          <Text style={styles.title}>{pack.name}</Text>
          <Text style={styles.author}>by {pack.author}</Text>

          {/* D-09: Category distribution visual */}
          <View style={styles.categoryRow}>
            {Object.entries(pack.categoryCounts).map(([category, count]) => (
              <View key={category} style={styles.categoryItem}>
                <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[category as Category] }]} />
                <Text style={styles.categoryLabel}>{CATEGORY_NAMES[category as Category]}</Text>
                <Text style={styles.categoryCount}>{count}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.totalQuestions}>{pack.totalQuestions} questions</Text>
          <Text style={styles.version}>Version {pack.version}</Text>

          {onDownload && (
            <Pressable style={styles.downloadButton} onPress={onDownload}>
              <Text style={styles.downloadText}>Download</Text>
            </Pressable>
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
```

### Anti-Patterns to Avoid

- **Storing questions in AsyncStorage:** Use WatermelonDB for structured queries. AsyncStorage is key-value only, no filtering by category/difficulty.
- **Loading all questions at app start:** Use WatermelonDB lazy loading. Query `getAvailableQuestions(category)` to load only what's needed.
- **Blocking UI during download:** Show progress bar with cancel option. Don't freeze the app.
- **Skipping checksum verification:** Always verify SHA-256 after download. Corrupted packs cause crashes.
- **Global asked questions across packs:** Track `askedAt` per question, reset per-pack. Don't use a single global set.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pack file download | Custom fetch with progress | expo-file-system downloadAsync | Handles progress, cancellation, mobile storage paths |
| JSON validation | Manual type checking | Zod QuestionPackSchema | Runtime validation, type inference, error messages |
| Checksum computation | Custom SHA-256 | expo-crypto or rn-fetch-blob | Standard crypto implementation, mobile-optimized |
| State persistence | Custom AsyncStorage wrapper | Zustand persist middleware | Already used in gameStore, playerStore, questionStore |
| Database queries | Raw SQL | WatermelonDB Query API | Type-safe, lazy loading, relations |
| Semver comparison | String comparison | semver npm package | Handles major/minor/patch, prerelease tags |
| Modal overlays | Custom View positioning | React Native Modal component | Platform-specific animations, accessibility |

**Key insight:** Pack download and validation is the most complex part — don't shortcut checksum verification or Zod validation. Corrupted packs break gameplay.

## Runtime State Inventory

> This is a feature-add phase, not a rename/refactor. No runtime state migration required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Default pack questions in `data/questions/` | Migration to WatermelonDB (seed on first launch) |
| WatermelonDB | New `question_packs` and `questions` tables (Phase 6) | Query instead of hardcoded imports |
| Zustand stores | New `packStore` for pack state | Create new store |
| AsyncStorage | questionStore.enabledCategories persists | Reuse pattern in packStore |

## Common Pitfalls

### Pitfall 1: Forgetting to Seed Default Pack

**What goes wrong:** First-time users see empty pack list, can't play.

**Why it happens:** D-02 requires built-in default pack, but WatermelonDB starts empty.

**How to avoid:** Create migration that seeds default pack from `data/questions/` on first launch. Check `downloadedPackIds.length === 0` and trigger seed.

**Warning signs:** Pack list shows "No packs available" on fresh install; game setup crashes on "Select question from null pack".

### Pitfall 2: Blocking Main Thread During Download

**What goes wrong:** UI freezes during pack download, progress bar doesn't update.

**Why it happens:** `fetch()` or synchronous file operations block JS thread.

**How to avoid:** Use `FileSystem.downloadAsync()` with `progressCallback`. Download runs in native thread, JS thread remains responsive.

**Warning signs:** Progress bar stuck at 0% then jumps to 100%; app ANR (Application Not Responding) on Android.

### Pitfall 3: Checksum Mismatch Due to Encoding

**What goes wrong:** Valid pack fails checksum verification.

**Why it happens:** SHA-256 computed on different encoding (gzip vs raw, UTF-8 vs binary).

**How to avoid:** Use exact same bytes for download and checksum. If pack is gzip-compressed (`contentEncoding: 'gzip'`), compute checksum on decompressed content OR store compressed checksum separately.

**Warning signs:** "Checksum mismatch" error for valid pack; works locally but fails in production.

### Pitfall 4: Category Filter Not Applied to Gameplay

**What goes wrong:** User disables "pink" category in settings, but game still asks pink questions.

**Why it happens:** `enabledCategories` stored but not passed to `selectQuestion()`.

**How to avoid:** Modify `questionStore.selectQuestion()` to read `packStore.enabledCategories`. Verify with test: disable category, play game, confirm category never appears.

**Warning signs:** Category filter shows in UI but gameplay ignores it; questions from "disabled" categories appear.

### Pitfall 5: Asked Questions Persist After Pack Switch

**What goes wrong:** User switches from Pack A to Pack B, questions from Pack A marked as asked.

**Why it happens:** `askedQuestions` Set not reset when active pack changes.

**How to avoid:** Track `askedAt` per question in WatermelonDB (already implemented in QuestionModel). Query `asked_at IS NULL` for available questions. Reset asked timestamps only for specific pack when starting new game.

**Warning signs:** "All questions exhausted" error after switching packs; repeated questions after starting new game with different pack.

## Code Examples

### Pack Selection Screen Entry Point

```typescript
// app/packs/index.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePackStore } from '../../stores/packStore';
import { fetchPackIndex } from '../../services/packIndex';
import { PackCard } from '../../components/PackCard';
import { PackDetailsModal } from '../../components/PackDetailsModal';
import type { PackIndexEntry } from '@trivial-world/types';

export default function PackSelectionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { availablePacks, downloadedPackIds, setAvailablePacks, setActivePack } = usePackStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<PackIndexEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // D-03: Fetch pack index from hardcoded URL
    fetchPackIndex()
      .then(packs => setAvailablePacks(packs))
      .catch(err => console.error('Failed to fetch pack index:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSelectPack = (packId: string) => {
    // D-15: Only one active pack at a time
    setActivePack(packId);
    router.push('/game/setup');
  };

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      <Text style={styles.title}>Select Question Pack</Text>

      <FlatList
        data={availablePacks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PackCard
            pack={item}
            isDownloaded={downloadedPackIds.includes(item.id)}
            onPress={() => {
              setSelectedPack(item);
              setModalVisible(true);
            }}
            onSelect={() => handleSelectPack(item.id)}
          />
        )}
      />

      <PackDetailsModal
        visible={modalVisible}
        pack={selectedPack}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}
```

### Category Filter Component

```typescript
// components/CategoryFilter.tsx
import { View, Text, Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { usePackStore } from '../stores/packStore';
import { CATEGORY_COLORS, CATEGORY_NAMES, PLAYER_COLORS } from '../constants/categories';
import type { Category } from '@trivial-world/types';

interface Props {
  onToggle: (category: Category) => void;
}

export function CategoryFilter({ onToggle }: Props) {
  const theme = useTheme();
  const { enabledCategories } = usePackStore();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Categories</Text>
      <View style={styles.row}>
        {PLAYER_COLORS.map((color) => {
          const isEnabled = !enabledCategories || enabledCategories.includes(color);
          return (
            <Pressable
              key={color}
              style={[
                styles.categoryButton,
                { backgroundColor: isEnabled ? CATEGORY_COLORS[color] : '#666' }
              ]}
              onPress={() => onToggle(color)}
            >
              <Text style={styles.categoryText}>{CATEGORY_NAMES[color]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded questions in `data/questions/` | WatermelonDB with pack seeding | Phase 6 | Packs are database entities, can be downloaded/updated |
| Global `askedQuestions` Set | `askedAt` timestamp per question | Phase 6 | Asked state tracked per-pack, not global |
| `getQuestionsByCategory()` from imports | WatermelonDB query with filters | Phase 8 (this) | Category and difficulty filters applied at query level |
| No pack selection | Pack selection screen before setup | Phase 8 (this) | Users choose content before adding participants |

**Deprecated/outdated:**
- `data/questions/index.ts` getQuestionsByCategory(): Replaced by WatermelonDB queries
- questionStore using hardcoded questions: Modified to query WatermelonDB

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | expo-file-system supports download progress callbacks | Pattern 2 | Need alternative download library if progress tracking not supported |
| A2 | expo-crypto provides SHA-256 for checksum | Don't Hand-Roll | Need to verify expo-crypto API for SHA-256 hashing |
| A3 | Default pack bundled with app bundle, not downloaded | Standard Stack | If seeded on first launch, need migration logic; if bundled, need asset handling |

**Verification needed:**
1. Check expo-file-system `downloadAsync` progress callback API
2. Check expo-crypto SHA-256 availability
3. Verify WatermelonDB seeding pattern for default pack

## Open Questions

1. **Default Pack Seeding Strategy**
   - What we know: D-02 requires built-in default pack with 120 questions.
   - What's unclear: Should default pack be seeded from bundled JSON on first launch, or pre-populated in WatermelonDB migration?
   - Recommendation: Seed from bundled JSON on first launch check (cleaner migration, same code path as downloaded packs).

2. **Generator URL Configuration**
   - What we know: D-03 says hardcoded URL.
   - What's unclear: Where should URL be stored? Environment variable? Constant file?
   - Recommendation: `constants/packConfig.ts` with `GENERATOR_PACK_INDEX_URL` constant. Easy to change between dev/prod.

3. **Download Cancellation**
   - What we know: D-10 says user waits for download.
   - What's unclear: Should user be able to cancel mid-download?
   - Recommendation: Add cancel button to progress modal. Cleanup temp file on cancel.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| expo-file-system | Pack download | Needs verification | — | Use fetch() with progress polyfill |
| expo-crypto | Checksum | Needs verification | — | Use rn-fetch-blob |
| @nozbe/watermelondb | Pack storage | ✓ | 0.28.0 | — |
| zustand | State management | ✓ | 5.0.14 | — |
| @trivial-world/types | Pack validation | ✓ | workspace | — |
| expo-router | Navigation | ✓ | 4.0.19 | — |
| tamagui | UI components | ✓ | 2.1.0 | — |

**Missing dependencies with no fallback:**
- Need to verify expo-file-system and expo-crypto are installed or add them

**Missing dependencies with fallback:**
- expo-crypto SHA-256 → can use rn-fetch-blob hashing if expo-crypto not available

## Validation Architecture

> Note: `workflow.nyquist_validation` is `false` in config.json, so this section is informational only.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0 |
| Config file | `apps/generator/vitest.config.ts` (generator app) |
| Mobile app config | None detected (need to create `apps/mobile/vitest.config.ts`) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-01 | Pack selection UI shows available packs | integration | `vitest run apps/mobile/app/packs/__tests__/` | ❌ Wave 0 |
| CONF-02 | Category/difficulty filtering | unit | `vitest run apps/mobile/stores/__tests__/packStore.test.ts` | ❌ Wave 0 |
| CONF-03 | Category toggles enable/disable categories | unit | `vitest run apps/mobile/stores/__tests__/packStore.test.ts` | ❌ Wave 0 |
| CONF-04 | Pack details modal shows category distribution | integration | `vitest run apps/mobile/components/__tests__/PackDetailsModal.test.tsx` | ❌ Wave 0 |
| CLOUD-02 | Pack download with checksum verification | unit | `vitest run apps/mobile/services/__tests__/packDownloader.test.ts` | ❌ Wave 0 |
| CLOUD-03 | Pack version comparison for updates | unit | `vitest run apps/mobile/services/__tests__/packVersion.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `apps/mobile/vitest.config.ts` — Vitest configuration for mobile app
- [ ] `apps/mobile/app/packs/__tests__/index.test.tsx` — Pack selection screen tests
- [ ] `apps/mobile/stores/__tests__/packStore.test.ts` — Pack store unit tests
- [ ] `apps/mobile/services/__tests__/packDownloader.test.ts` — Download service tests
- [ ] `apps/mobile/components/__tests__/PackDetailsModal.test.tsx` — Modal component tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No user accounts (D-02 from Phase 1) |
| V3 Session Management | no | No sessions, offline-first |
| V4 Access Control | no | No multi-user access control |
| V5 Input Validation | yes | Zod validation on all downloaded pack content (QuestionPackSchema) |
| V6 Cryptography | yes | SHA-256 checksum verification on downloaded packs (CLOUD-02) |

### Known Threat Patterns for React Native / Expo

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious pack injection | Tampering | Zod schema validation rejects malformed packs |
| Checksum bypass | Tampering | Enforce checksum verification before storage (D-12) |
| Man-in-the-middle download | Tampering, Information Disclosure | HTTPS-only URLs (enforced by App Transport Security on iOS) |
| Path traversal in filename | Elevation of Privilege | Use UUID-based filenames, validate pack IDs against schema |

**Key insight:** The biggest security risk is downloading and executing untrusted content. All packs must pass Zod validation AND checksum verification before storage. Never skip validation for "trusted" sources.

## Sources

### Primary (HIGH confidence)
- apps/mobile/stores/questionStore.ts — Existing category filtering pattern (setEnabledCategories)
- apps/mobile/database/models/QuestionPack.ts — WatermelonDB model with getAvailableQuestions()
- apps/mobile/database/models/Question.ts — markAsAsked() method
- packages/types/src/question-pack.ts — Zod schemas for pack validation
- apps/mobile/database/schema.ts — WatermelonDB schema version 2
- .planning/phases/06-question-pack-structure/06-CONTEXT.md — Pack structure decisions
- .planning/phases/07-question-generator-web-app/07-CONTEXT.md — Generator decisions

### Secondary (MEDIUM confidence)
- .planning/research/ARCHITECTURE.md — Pack download flow, presigned URLs, offline-first caching
- apps/mobile/app/index.tsx — Home screen navigation pattern
- apps/mobile/app/game/setup.tsx — Setup screen structure (participants only, pack reference needed)
- apps/mobile/constants/categories.ts — CATEGORY_COLORS, CATEGORY_NAMES constants

### Tertiary (LOW confidence)
- expo-file-system documentation — Assumed download progress support (needs verification)
- expo-crypto documentation — Assumed SHA-256 support (needs verification)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All core libraries already installed in project
- Architecture: HIGH — WatermelonDB models exist, store patterns established
- Pitfalls: MEDIUM — Download progress and checksum need verification
- Validation architecture: MEDIUM — No mobile test config yet, need Wave 0 setup

**Research date:** 2026-06-08
**Valid until:** 30 days (stable stack, low churn expected)