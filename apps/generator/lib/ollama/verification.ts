import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import type { Question } from '@trivial-world/types';
import { getOllamaClient } from './client';

/**
 * Default model for verification
 * Per RESEARCH.md: llama3.2 is recommended for fast generation
 */
export const DEFAULT_MODEL = 'llama3.2';

/**
 * Verification prompt variations
 * Per D-07: Multi-pass verification with different phrasings to catch hallucinations
 */
export const VERIFICATION_PROMPTS = {
  /**
   * Pass 1: Direct factual accuracy check
   * Asks LLM to verify the question/answer pair is factually correct
   */
  factualAccuracy: (questionText: string, answerText: string): string =>
    `Verify this trivia question is factually correct.

Question: "${questionText}"
Answer: "${answerText}"

Answer only "correct" or "incorrect" with a brief explanation.`,

  /**
   * Pass 2: Alternate phrasing check
   * Rephrases the verification as a true/false statement
   */
  alternatePhrasing: (questionText: string, answerText: string): string =>
    `Is the following statement true or false?

${questionText.replace('?', '')} The answer is ${answerText}.

Provide your reasoning.`,

  /**
   * Pass 3: Reverse verification
   * Verifies the claim from the answer's perspective
   */
  reverseVerification: (questionText: string, answerText: string): string =>
    `If someone told you "${answerText}" is the answer to "${questionText}", would they be correct?

Verify this claim independently. Answer yes/no with reasoning.`,
};

/**
 * Result from a single verification pass
 */
export interface VerificationResult {
  /** Pass number (1, 2, or 3) */
  pass: number;
  /** Name of the verification prompt used */
  prompt: string;
  /** Raw LLM response */
  response: string;
  /** Whether the pass indicates correctness */
  passed: boolean;
}

/**
 * Confidence score from 3-pass verification
 * Per D-08: Confidence scoring based on pass agreement
 */
export interface ConfidenceScore {
  /** Score percentage (0-100) */
  score: number;
  /** Number of passes that passed (0-3) */
  passes: number;
  /** Total verification results */
  results: VerificationResult[];
  /** Whether the question needs human review */
  needsReview: boolean;
}

/**
 * Evaluate verification pass result
 * Determines if a verification response indicates the question is correct
 * Per D-07: Look for clear affirmative indicators
 *
 * @param response - The LLM's verification response
 * @returns True if the response indicates correctness
 */
export function evaluatePassResult(response: string): boolean {
  const lowerResponse = response.toLowerCase();
  // Look for clear affirmative indicators
  // Per D-07: 'correct', 'true', 'yes', or 'accurate' (without 'not')
  return (
    lowerResponse.includes('correct') ||
    lowerResponse.includes('true') ||
    lowerResponse.includes('yes') ||
    (lowerResponse.includes('accurate') && !lowerResponse.includes('not accurate'))
  );
}

/**
 * Verify a question with 3-pass verification
 * Per D-07: Multi-pass verification with different phrasings
 * Per D-08: Confidence scoring based on pass agreement (3/3=100%, 2/3=67%, 1/3 or 0/3=flagged)
 * Per D-10: Questions marked 'needs review' when passes disagree
 *
 * @param question - The question to verify
 * @param model - Model to use (default: llama3.2)
 * @param ollamaUrl - Optional Ollama endpoint override
 * @returns Confidence score with verification results
 */
export async function verifyQuestion(
  question: Question,
  model: string = DEFAULT_MODEL,
  ollamaUrl?: string
): Promise<ConfidenceScore> {
  const ollama = getOllamaClient(ollamaUrl);
  const results: VerificationResult[] = [];

  // Sequential verification passes (D-14: fast batch processing)
  const prompts = [
    { name: 'factualAccuracy', prompt: VERIFICATION_PROMPTS.factualAccuracy },
    { name: 'alternatePhrasing', prompt: VERIFICATION_PROMPTS.alternatePhrasing },
    { name: 'reverseVerification', prompt: VERIFICATION_PROMPTS.reverseVerification },
  ];

  for (const [index, { name, prompt: promptBuilder }] of prompts.entries()) {
    const prompt = promptBuilder(question.questionText, question.answerText);

    const result = await generateText({
      model: ollama(model),
      prompt,
    });

    results.push({
      pass: index + 1,
      prompt: name,
      response: result.text,
      passed: evaluatePassResult(result.text),
    });
  }

  const passes = results.filter((r) => r.passed).length;
  const score = Math.round((passes / 3) * 100);

  return {
    score,
    passes,
    results,
    // D-10: Questions marked "needs review" when passes disagree
    needsReview: passes < 3,
  };
}