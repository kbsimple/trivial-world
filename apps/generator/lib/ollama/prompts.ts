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
 * Build verification prompt variations
 * Per D-07: Multi-pass verification with different phrasings
 */

export const VERIFICATION_PROMPTS = {
  /**
   * Pass 1: Direct factual accuracy check
   */
  factualAccuracy: (questionText: string, answerText: string): string =>
    `Verify this trivia question is factually correct.

Question: "${questionText}"
Answer: "${answerText}"

Answer only "correct" or "incorrect" with a brief explanation.`,

  /**
   * Pass 2: Alternate phrasing check
   */
  alternatePhrasing: (questionText: string, answerText: string): string =>
    `Is the following statement true or false?

${questionText.replace('?', '')} The answer is ${answerText}.

Provide your reasoning.`,

  /**
   * Pass 3: Reverse verification
   */
  reverseVerification: (questionText: string, answerText: string): string =>
    `If someone told you "${answerText}" is the answer to "${questionText}", would they be correct?

Verify this claim independently. Answer yes/no with reasoning.`,
};

/**
 * Evaluate verification pass result
 * Determines if a verification response indicates the question is correct
 *
 * @param response - The LLM's verification response
 * @returns True if the response indicates correctness
 */
export function evaluatePassResult(response: string): boolean {
  const lowerResponse = response.toLowerCase();
  // Look for clear affirmative indicators
  return (
    lowerResponse.includes('correct') ||
    lowerResponse.includes('true') ||
    lowerResponse.includes('yes') ||
    (lowerResponse.includes('accurate') && !lowerResponse.includes('not accurate'))
  );
}