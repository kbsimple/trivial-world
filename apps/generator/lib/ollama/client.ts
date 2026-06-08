import { createOllama } from 'ollama-ai-provider-v2';
import { generateObject, generateText } from 'ai';
import { QuestionSchema, type Question, type Category } from '@trivial-world/types';
import { buildQuestionPrompt, VERIFICATION_PROMPTS, evaluatePassResult } from './prompts.js';

/**
 * Default model for question generation
 * Per RESEARCH.md: llama3.2 is recommended for fast generation
 */
export const DEFAULT_MODEL = 'llama3.2';

/**
 * Default Ollama endpoint
 * Per D-02: Configurable via environment variable
 */
const DEFAULT_OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';

/**
 * Get Ollama client with configurable endpoint
 * Per D-02: Provider configuration via environment variables
 * Per D-03: Vercel AI SDK for provider abstraction
 *
 * @param baseUrl - Optional override for Ollama endpoint
 * @returns Configured Ollama provider
 */
export function getOllamaClient(baseUrl?: string) {
  return createOllama({
    baseURL: baseUrl || DEFAULT_OLLAMA_URL,
  });
}

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
 */
export interface ConfidenceScore {
  /** Score percentage (0-100) */
  score: number;
  /** Number of passes that passed */
  passes: number;
  /** Total verification results */
  results: VerificationResult[];
  /** Whether the question needs human review */
  needsReview: boolean;
}

/**
 * Generate a single trivia question using Ollama
 * Per AI-01: Generate trivia questions from topic + category + guidance
 * Per AI-02: Source material injection for context-aware generation
 *
 * @param topic - The topic for the question
 * @param category - The question category
 * @param guidance - Optional additional guidance
 * @param sourceMaterial - Optional source material for context-aware generation (AI-02)
 * @param model - Model to use (default: llama3.2)
 * @param ollamaUrl - Optional Ollama endpoint override
 * @returns Generated question object
 */
export async function generateQuestion(
  topic: string,
  category: Category,
  guidance?: string,
  sourceMaterial?: string,
  model: string = DEFAULT_MODEL,
  ollamaUrl?: string
): Promise<Question> {
  const ollama = getOllamaClient(ollamaUrl);
  const prompt = buildQuestionPrompt(topic, category, guidance, sourceMaterial);

  const result = await generateObject({
    model: ollama(model),
    schema: QuestionSchema,
    prompt,
  });

  return result.object;
}

/**
 * Verify a question with 3-pass verification
 * Per D-07: Multi-pass verification with different phrasings
 * Per D-08: Confidence scoring based on pass agreement
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

/**
 * Generate and verify a question in one call
 * Convenience function for the common case of generate + verify
 *
 * @param topic - The topic for the question
 * @param category - The question category
 * @param guidance - Optional additional guidance
 * @param sourceMaterial - Optional source material (AI-02)
 * @param model - Model to use
 * @param ollamaUrl - Optional Ollama endpoint override
 * @returns Generated question with verification results
 */
export async function generateAndVerifyQuestion(
  topic: string,
  category: Category,
  guidance?: string,
  sourceMaterial?: string,
  model?: string,
  ollamaUrl?: string
): Promise<{ question: Question; verification: ConfidenceScore }> {
  const question = await generateQuestion(topic, category, guidance, sourceMaterial, model, ollamaUrl);
  const verification = await verifyQuestion(question, model, ollamaUrl);
  return { question, verification };
}