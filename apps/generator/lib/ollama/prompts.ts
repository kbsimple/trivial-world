import { Category, CATEGORY_NAMES } from '@trivial-world/types';

/**
 * Sanitize user input to prevent prompt injection
 * Per T-07-01, T-07-02, T-07-03: Strip control characters and limit length
 *
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized input
 */
export function sanitizeInput(input: string, maxLength: number = 100): string {
  return input
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Limit length
    .slice(0, maxLength)
    // Trim whitespace
    .trim();
}

/**
 * Build source material prompt section
 * Per AI-02: Source material injection for context-aware question generation
 *
 * @param sourceMaterial - Past source text (movie plot, book summary, etc.)
 * @returns Formatted prompt section
 */
export function buildSourceMaterialPrompt(sourceMaterial: string): string {
  const sanitized = sanitizeInput(sourceMaterial, 2000);
  return `
SOURCE MATERIAL (use this as the factual basis for the question):
---
${sanitized}
---

IMPORTANT: Base your question and answer on the source material above.
The answer must be verifiable from this text.
`;
}

/**
 * Build question generation prompt
 * Per D-07: Ollama integration for question generation
 * Per AI-02: Source material support for context-aware generation
 *
 * @param topic - The topic for the question
 * @param category - The question category
 * @param guidance - Optional additional guidance
 * @param sourceMaterial - Optional source material for context-aware generation
 * @returns Formatted prompt string
 */
export function buildQuestionPrompt(
  topic: string,
  category: Category,
  guidance?: string,
  sourceMaterial?: string
): string {
  const categoryName = CATEGORY_NAMES[category];
  const sanitizedTopic = sanitizeInput(topic, 100);
  const sanitizedGuidance = guidance ? sanitizeInput(guidance, 500) : undefined;

  let prompt = `You are a trivia question creator for a social board game. Generate a single trivia question.

Requirements:
- Topic: ${sanitizedTopic}
- Category: ${categoryName} (${category})
- Factual accuracy: The answer must be verifiable
- Difficulty: Suitable for general knowledge enthusiasts
- Format: Clear question with a single correct answer${sanitizedGuidance ? `\n- Additional guidance: ${sanitizedGuidance}` : ''}

${sourceMaterial ? buildSourceMaterialPrompt(sourceMaterial) : ''}

Respond with valid JSON matching this schema:
{
  "id": "unique-url-safe-id",
  "category": "${category}",
  "questionText": "The question text (10-500 characters)",
  "answerText": "The correct answer (1-200 characters)",
  "difficulty": "easy" | "medium" | "hard"
}

Generate one question now.`;

  return prompt;
}

/**
 * Build question generation prompt for the bulk CLI pipeline.
 * Identical to buildQuestionPrompt but explicitly requests a tidbits field.
 * Does not accept sourceMaterial — CLI bulk generation is topic-driven only.
 *
 * @param topic - The topic for the question
 * @param category - The question category
 * @param guidance - Optional additional guidance
 * @returns Formatted prompt string
 */
export function buildCLIQuestionPrompt(
  topic: string,
  category: Category,
  guidance?: string
): string {
  const categoryName = CATEGORY_NAMES[category];
  const sanitizedTopic = sanitizeInput(topic, 100);
  const sanitizedGuidance = guidance ? sanitizeInput(guidance, 500) : undefined;

  return `You are a trivia question creator for a social board game. Generate a single trivia question.

Requirements:
- Topic: ${sanitizedTopic}
- Category: ${categoryName} (${category})
- Factual accuracy: The answer must be verifiable
- Difficulty: Suitable for general knowledge enthusiasts
- Format: Clear question with a single correct answer${sanitizedGuidance ? `\n- Additional guidance: ${sanitizedGuidance}` : ''}

Question style guidelines:
- MULTIPLE CHOICE for specific numbers: When the answer is a year, distance, duration, count, or other specific numeric value, embed A/B/C/D options in the question text so players have something to work with. Exception: skip multiple choice if the options would make the answer obvious, or if 3-4 plausible wrong answers don't exist. Include the correct letter in answerText (e.g. "1989 (B)").
- LIGHT PUNS ALLOWED: For especially difficult questions, a subtle wordplay hint in the question text is acceptable — the question should still make sense without catching the pun.

Respond with valid JSON matching this schema:
{
  "id": "unique-url-safe-id",
  "category": "${category}",
  "questionText": "The question text (10-500 characters). For numeric answers, include A/B/C/D options unless it would give away the answer.",
  "answerText": "The correct answer (1-200 characters). If multiple choice, include the letter, e.g. '1989 (B)'.",
  "difficulty": "easy" | "medium" | "hard",
  "tidbits": "2-3 sentences of surprising or interesting context about the answer"
}

The "tidbits" field is REQUIRED. It should be an engaging fact or context about the answer that players would find interesting to learn.

Generate one question now.`;
}