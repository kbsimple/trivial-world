'use client';

import { useState } from 'react';
import type { Category } from '@trivial-world/types';
import { CATEGORY_NAMES } from '@trivial-world/types';
import type { ProgressState } from '@/hooks/useGenerator';

/**
 * Generator form props
 */
interface GeneratorFormProps {
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Progress information during generation */
  progress: ProgressState | null;
  /** Callback when generate is clicked */
  onGenerate: (topic: string, category: Category, guidance?: string, sourceMaterial?: string) => void;
}

/**
 * Category options for the dropdown
 */
const CATEGORY_OPTIONS = Object.entries(CATEGORY_NAMES).map(([value, label]) => ({
  value: value as Category,
  label: `${label} (${value})`,
}));

/**
 * Generator form with topic input, category selection, and source material
 * Per UI-SPEC: Topic input, category selector, guidance textarea, source material textarea
 * Per AI-02: Source material textarea for context-aware question generation
 */
export function GeneratorForm({ isGenerating, progress, onGenerate }: GeneratorFormProps) {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [guidance, setGuidance] = useState('');
  const [sourceMaterial, setSourceMaterial] = useState('');

  const handleGenerate = () => {
    if (!topic.trim() || !category) return;
    onGenerate(topic.trim(), category, guidance.trim() || undefined, sourceMaterial.trim() || undefined);
  };

  const isFormValid = topic.trim().length >= 3 && category;

  return (
    <div className="space-y-6">
      {/* Topic input */}
      <div>
        <label htmlFor="topic" className="block text-sm font-medium mb-2">
          Topic
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, 100))}
          placeholder="Enter a topic (e.g., 'Marvel Cinematic Universe')"
          disabled={isGenerating}
          maxLength={100}
          className="w-full px-3 py-2 bg-background border border-card rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted"
        />
        <p className="text-xs text-muted mt-1">
          {topic.length}/100 characters
        </p>
      </div>

      {/* Category selector */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-2">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | '')}
          disabled={isGenerating}
          className="w-full px-3 py-2 bg-background border border-card rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        >
          <option value="">Select a category</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Source material textarea - Per AI-02 */}
      <div>
        <label htmlFor="source-material" className="block text-sm font-medium mb-2">
          Source Material <span className="text-muted">(Optional)</span>
        </label>
        <textarea
          id="source-material"
          value={sourceMaterial}
          onChange={(e) => setSourceMaterial(e.target.value.slice(0, 2000))}
          placeholder="Paste source material (movie plot, book summary, TV episode...) for context-aware questions (AI-02)"
          disabled={isGenerating}
          maxLength={2000}
          rows={4}
          className="w-full px-3 py-2 bg-background border border-card rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted resize-none"
        />
        <p className="text-xs text-muted mt-1">
          {sourceMaterial.length}/2000 characters
        </p>
      </div>

      {/* Guidance textarea */}
      <div>
        <label htmlFor="guidance" className="block text-sm font-medium mb-2">
          Additional Guidance <span className="text-muted">(Optional)</span>
        </label>
        <textarea
          id="guidance"
          value={guidance}
          onChange={(e) => setGuidance(e.target.value.slice(0, 500))}
          placeholder="E.g., 'Focus on Phase 1 movies'"
          disabled={isGenerating}
          maxLength={500}
          rows={2}
          className="w-full px-3 py-2 bg-background border border-card rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted resize-none"
        />
        <p className="text-xs text-muted mt-1">
          {guidance.length}/500 characters
        </p>
      </div>

      {/* Progress indicator */}
      {progress && (
        <div className="p-4 bg-card rounded-lg">
          <p className="text-sm">
            {progress.status === 'generating' && `Generating question ${progress.currentQuestion}/${progress.totalQuestions}...`}
            {progress.status === 'verifying' && `Question ${progress.currentQuestion}/${progress.totalQuestions} — Verifying (${progress.currentPass}/3)`}
            {progress.status === 'complete' && 'Complete'}
          </p>
          <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${progress.status === 'complete'
                  ? 100
                  : ((progress.currentQuestion - 1) / progress.totalQuestions) * 100 +
                    (progress.currentPass / 3 / progress.totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!isFormValid || isGenerating}
        className={`w-full py-3 px-6 rounded-md font-semibold transition-colors ${
          isFormValid && !isGenerating
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-secondary text-muted cursor-not-allowed'
        }`}
      >
        {isGenerating ? 'Generating...' : 'Generate Questions'}
      </button>

      {/* Help text */}
      {!isFormValid && (
        <p className="text-xs text-muted text-center">
          Enter a topic (min 3 characters) and select a category to generate questions
        </p>
      )}
    </div>
  );
}