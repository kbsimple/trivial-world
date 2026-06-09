/**
 * Pack configuration constants
 * Per D-03: Hardcoded generator URL (not user-configurable in v2.0)
 */

/**
 * Generator pack index URL
 * Endpoint for fetching available pack metadata
 */
export const GENERATOR_PACK_INDEX_URL = 'https://trivial-world-generator.netlify.app/api/v1/packs';

/**
 * Default pack ID
 * Per D-02: Built-in default pack with 120 questions bundled in app
 */
export const DEFAULT_PACK_ID = 'default-pack-00000000-0000-0000-0000-000000000001';

/**
 * Pack download settings
 */
export const PACK_DOWNLOAD_TIMEOUT_MS = 60000; // 1 minute timeout
export const PACK_MIN_QUESTIONS = 20; // Minimum questions per pack (per QuestionPackSchema)