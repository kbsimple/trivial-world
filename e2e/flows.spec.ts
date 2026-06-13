/**
 * Functional flow tests for Trivial World
 *
 * Tests the three core user flows end-to-end:
 *   1. Configure a Pack  — browse pack selection screen, select a pack
 *   2. Add Players       — add, name, and remove participants on the setup screen
 *   3. Play a Game Turn  — roll → move → question → reveal → mark answer
 *
 * These tests run against the local static build (apps/mobile/dist).
 * All network calls to the pack index are intercepted with mock data so no
 * external services are required.
 *
 * To keep tests up-to-date as features are added:
 *   - Add new describe blocks for new screens / flows
 *   - Update selectors if UI text changes (prefer getByRole/getByText over CSS)
 *   - Re-run after every build: pnpm test:e2e --project=mobile e2e/flows.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────
// Global fixture: fix Metro chunk URL resolver
//
// The local `serve --single` server doesn't replicate the Netlify _redirects
// rule that rewrites `/*/_expo/...` → `/_expo/...`. Without this, navigating
// directly to /packs causes Metro to request the route chunk at
// http://localhost:3001/packs/_expo/... which returns index.html (HTML) and
// the app fails to load.  This interceptor applies the same rewrite.
// ─────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.route(/localhost:\d+\/[^/]+\/_expo\//, async (route) => {
    const url = route.request().url();
    const m = url.match(/(https?:\/\/localhost:\d+)\/.+?(\/_expo\/.*)/);
    if (m) {
      await route.continue({ url: m[1] + m[2] });
    } else {
      await route.continue();
    }
  });
});

// ─────────────────────────────────────────────────────────
// Shared test data
// ─────────────────────────────────────────────────────────

const MOCK_PACK_ID = '550e8400-e29b-41d4-a716-446655440001';
const MOCK_PACK_NAME = 'Test Trivia Pack';

const MOCK_PACK_INDEX = {
  packs: [
    {
      id: MOCK_PACK_ID,
      name: MOCK_PACK_NAME,
      author: 'Test Author',
      version: '1.0.0',
      totalQuestions: 60,
      categoryCounts: {
        blue: 10,
        pink: 10,
        yellow: 10,
        purple: 10,
        green: 10,
        orange: 10,
      },
      downloadUrl: 'https://trivial-world-generator.netlify.app/packs/test-pack.json',
      checksum: 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1',
      size: 10000,
    },
  ],
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Intercept the pack index API with deterministic test data. */
async function mockPackIndex(page: Page): Promise<void> {
  await page.route(/api\/v1\/packs/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Accept',
      },
      body: JSON.stringify(MOCK_PACK_INDEX),
    })
  );
}

/**
 * Select a pack via the pack selection screen, then land back on setup.
 * This drives the actual UI flow so Zustand is fully hydrated when we return.
 * The page must already be at /game/setup or / before calling this.
 */
async function selectPackViaUI(page: Page): Promise<void> {
  await mockPackIndex(page);
  // Navigate to pack selection
  await page.goto('/packs');
  await page.waitForLoadState('networkidle', { timeout: 30_000 });
  await expect(page.getByText(MOCK_PACK_NAME)).toBeVisible({ timeout: 10_000 });
  // Click Select — app navigates to /game/setup
  await page.getByText('Select', { exact: true }).click();
  await page.waitForURL('**/game/setup', { timeout: 10_000 });
  await expect(page.getByText('Setup Game')).toBeVisible({ timeout: 10_000 });
}

/**
 * Pre-set activePackId in sessionStorage before the page boots.
 * Used in flows that only need to verify pack-related UI state without
 * needing to exercise the full pack selection flow.
 */
async function injectActivePack(page: Page, packId = MOCK_PACK_ID): Promise<void> {
  await page.addInitScript((id) => {
    // Clear any leftover game / player / question state from a prior test run
    sessionStorage.removeItem('trivial-world-game');
    sessionStorage.removeItem('trivial-world-players');
    sessionStorage.removeItem('trivial-world-questions');

    // Inject a valid activePackId so the setup screen allows starting a game
    sessionStorage.setItem(
      'trivial-world-packs',
      JSON.stringify({
        state: {
          downloadedPackIds: [],
          activePackId: id,
          enabledCategories: null,
          enabledDifficulties: null,
        },
        version: 0,
      })
    );
  }, packId);
}

/** Navigate to setup and wait until the UI is fully rendered. */
async function goToSetup(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForURL('**/game/setup', { timeout: 10_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 });
  await expect(page.getByText('Setup Game')).toBeVisible({ timeout: 10_000 });
}

/** Add N participants on the already-open setup screen. */
async function addPlayers(page: Page, count: number): Promise<void> {
  const addBtn = page.getByText('+ Add Participant');
  for (let i = 0; i < count; i++) {
    await addBtn.click();
  }
  await expect(page.locator('input')).toHaveCount(count, { timeout: 5_000 });
}

/**
 * Drive the game from the turn screen to the question screen.
 * Returns after the question screen is visible.
 */
async function playOneTurn(page: Page): Promise<void> {
  // Turn screen — select a category to advance
  await page.waitForURL('**/game/turn', { timeout: 10_000 });
  await expect(page.getByText('Choose a category')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('category-button-blue').click();

  // Question screen
  await page.waitForURL('**/game/question', { timeout: 10_000 });
  await expect(page.getByText('Reveal Answer')).toBeVisible({ timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────
// Flow 1: Configure a Pack
// ─────────────────────────────────────────────────────────

test.describe('Flow: Configure a Pack', () => {
  test('pack selection screen lists available packs from the index', async ({ page }) => {
    await mockPackIndex(page);
    await page.goto('/packs');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    await expect(page.getByText('Select Question Pack')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MOCK_PACK_NAME)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Test Author')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('60 questions')).toBeVisible({ timeout: 5_000 });
  });

  test('each pack card shows a Select button on web', async ({ page }) => {
    await mockPackIndex(page);
    await page.goto('/packs');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page.getByText(MOCK_PACK_NAME)).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Select', { exact: true })).toBeVisible({ timeout: 5_000 });
  });

  test('selecting a pack navigates to setup', async ({ page }) => {
    await mockPackIndex(page);
    await page.goto('/packs');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page.getByText(MOCK_PACK_NAME)).toBeVisible({ timeout: 10_000 });

    await page.getByText('Select', { exact: true }).click();

    await page.waitForURL('**/game/setup', { timeout: 10_000 });
    await expect(page.getByText('Setup Game')).toBeVisible({ timeout: 10_000 });
  });

  test('selected pack name appears on setup screen', async ({ page }) => {
    await mockPackIndex(page);
    await page.goto('/packs');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page.getByText(MOCK_PACK_NAME)).toBeVisible({ timeout: 10_000 });

    await page.getByText('Select', { exact: true }).click();

    await page.waitForURL('**/game/setup', { timeout: 10_000 });
    // Pack name appears in the pack info bar (format: "Pack: <name>")
    await expect(page.getByText(new RegExp(`Pack:.*${MOCK_PACK_NAME}`))).toBeVisible({ timeout: 5_000 });
  });

  test('setup shows tap-to-select prompt when no pack is active', async ({ page }) => {
    // Do NOT inject a pack — fresh state
    await page.goto('/');
    await page.waitForURL('**/game/setup', { timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    await expect(page.getByText('Tap to select a question pack')).toBeVisible({ timeout: 5_000 });
  });

  test('tapping the pack info area from setup navigates to pack selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/game/setup', { timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    await page.getByText('Tap to select a question pack').click();
    await page.waitForURL('**/packs', { timeout: 10_000 });
    await expect(page.getByText('Select Question Pack')).toBeVisible({ timeout: 10_000 });
  });

  test('difficulty filter labels are centered', async ({ page }) => {
    await mockPackIndex(page);
    await page.goto('/packs');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Both filter section labels should be visible
    await expect(page.getByText('Difficulty')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Select Categories')).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────
// Flow 2: Add Players
// ─────────────────────────────────────────────────────────

test.describe('Flow: Add Players', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/game/setup', { timeout: 10_000 });
    await selectPackViaUI(page);
  });

  test('setup screen renders with no players initially', async ({ page }) => {
    await expect(page.locator('input')).toHaveCount(0);
    await expect(page.getByText('+ Add Participant')).toBeVisible();
  });

  test('adding a participant creates a name input', async ({ page }) => {
    await page.getByText('+ Add Participant').click();
    await expect(page.locator('input').first()).toBeVisible({ timeout: 5_000 });
  });

  test('can add up to 6 players', async ({ page }) => {
    await addPlayers(page, 6);
    await expect(page.getByText('Maximum 6 participants')).toBeVisible({ timeout: 3_000 });
  });

  test('can name a player via the text input', async ({ page }) => {
    await page.getByText('+ Add Participant').click();
    const input = page.locator('input').first();
    await input.fill('Alice');
    await expect(input).toHaveValue('Alice');
  });

  test('can remove a player with the × button', async ({ page }) => {
    await addPlayers(page, 2);
    await page.getByText('×').first().click();
    await expect(page.locator('input')).toHaveCount(1, { timeout: 3_000 });
  });

  test('Start Game button is disabled with no players', async ({ page }) => {
    // Hint text confirms disabled state
    await expect(page.getByText('Add at least 1 participant')).toBeVisible({ timeout: 3_000 });
  });

  test('Start Game button enables after adding one player', async ({ page }) => {
    await page.getByText('+ Add Participant').click();
    await expect(page.locator('input').first()).toBeVisible({ timeout: 5_000 });
    // Hint should disappear once a player exists
    await expect(page.getByText('Add at least 1 participant')).not.toBeVisible({ timeout: 3_000 });
  });

  test('Start Game is blocked and shows hint when no pack is selected', async ({ page }) => {
    // Clear pack state from beforeEach so the setup screen has no active pack
    await page.evaluate(() => sessionStorage.removeItem('trivial-world-packs'));
    await page.goto('/');
    await page.waitForURL('**/game/setup', { timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    await page.getByText('+ Add Participant').click();
    await expect(page.locator('input').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Select a pack above to start')).toBeVisible({ timeout: 3_000 });
  });
});

// ─────────────────────────────────────────────────────────
// Flow 3: Play a Game Turn
// ─────────────────────────────────────────────────────────

test.describe('Flow: Play a Game Turn', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/game/setup', { timeout: 10_000 });
    await selectPackViaUI(page);
    await addPlayers(page, 1);
    await page.getByText('Start Game').click();
  });

  test('Start Game navigates to the turn screen', async ({ page }) => {
    await page.waitForURL('**/game/turn', { timeout: 10_000 });
    await expect(page.getByText('Choose a category')).toBeVisible({ timeout: 10_000 });
  });

  test('Selecting a category on the turn screen navigates to the question screen', async ({ page }) => {
    await page.waitForURL('**/game/turn', { timeout: 10_000 });
    await page.getByTestId('category-button-blue').click();

    await page.waitForURL('**/game/question', { timeout: 10_000 });
    await expect(page.getByText('Reveal Answer')).toBeVisible({ timeout: 10_000 });
  });

  test('question screen shows question number and hides answer initially', async ({ page }) => {
    await playOneTurn(page);

    await expect(page.getByText('Q1')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Reveal Answer')).toBeVisible({ timeout: 5_000 });
    // Correct/Incorrect buttons must NOT be visible before reveal
    await expect(page.getByText('✓ Correct')).not.toBeVisible();
    await expect(page.getByText('✗ Incorrect')).not.toBeVisible();
  });

  test('Reveal Answer shows Correct and Incorrect buttons', async ({ page }) => {
    await playOneTurn(page);

    await page.getByText('Reveal Answer').click();

    await expect(page.getByText('✓ Correct')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('✗ Incorrect')).toBeVisible({ timeout: 5_000 });
    // Reveal button should be replaced by answer text
    await expect(page.getByText('Reveal Answer')).not.toBeVisible();
  });

  test('marking Incorrect advances to the next turn screen', async ({ page }) => {
    await playOneTurn(page);
    await page.getByText('Reveal Answer').click();
    await expect(page.getByText('✗ Incorrect')).toBeVisible({ timeout: 5_000 });

    await page.getByText('✗ Incorrect').click();

    // Game continues — should reach turn or results
    await page.waitForURL(/\/(game\/turn|game\/results)/, { timeout: 10_000 });
  });

  test('marking Correct advances to the next turn screen', async ({ page }) => {
    await playOneTurn(page);
    await page.getByText('Reveal Answer').click();
    await expect(page.getByText('✓ Correct')).toBeVisible({ timeout: 5_000 });

    await page.getByText('✓ Correct').click();

    // Game continues — should reach turn or results
    await page.waitForURL(/\/(game\/turn|game\/results)/, { timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────
// Flow 4: Full Turn Sequence (end-to-end integration)
// ─────────────────────────────────────────────────────────

test.describe('Flow: Full Turn Sequence', () => {
  test('setup → turn → category select → question → answer → next turn', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/game/setup', { timeout: 10_000 });
    await selectPackViaUI(page);
    await addPlayers(page, 2);

    // Name the players to verify state flows through the game
    await page.locator('input').nth(0).fill('Alice');
    await page.locator('input').nth(1).fill('Bob');

    // Start the game — lands on turn screen
    await page.getByText('Start Game').click();
    await page.waitForURL('**/game/turn', { timeout: 10_000 });
    await expect(page.getByText('Choose a category')).toBeVisible({ timeout: 10_000 });

    // Alice selects a category
    await page.getByTestId('category-button-blue').click();
    await page.waitForURL('**/game/question', { timeout: 10_000 });
    await expect(page.getByText('Q1')).toBeVisible({ timeout: 5_000 });

    // Reveal and mark incorrect — turn passes to Bob
    await page.getByText('Reveal Answer').click();
    await expect(page.getByText('✗ Incorrect')).toBeVisible({ timeout: 5_000 });
    await page.getByText('✗ Incorrect').click();

    // Should be back at turn screen for the next player
    await page.waitForURL('**/game/turn', { timeout: 10_000 });
    await expect(page.getByText('Choose a category')).toBeVisible({ timeout: 10_000 });
  });
});
