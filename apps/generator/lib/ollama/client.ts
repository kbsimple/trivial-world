import { createOllama } from 'ollama-ai-provider-v2';
import { generateObject } from 'ai';
import { QuestionSchema, type Question, type Category } from '@trivial-world/types';
import { buildQuestionPrompt } from './prompts';
import { verifyQuestion, type ConfidenceScore, type VerificationResult } from './verification';

// Re-export verification types for convenience
export { verifyQuestion, type ConfidenceScore, type VerificationResult } from './verification';

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