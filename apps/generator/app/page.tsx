'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@trivial-world/types';
import { useGenerator } from '@/hooks/useGenerator';
import { GeneratorForm } from '@/components/GeneratorForm';
import { SettingsPanel } from '@/components/SettingsPanel';
import { DEFAULT_MODEL } from '@/lib/ollama/client';

/**
 * Generator page - Main question generation interface
 * Per D-05: Settings integrated into Generator page
 * Per AI-02: Source material input for context-aware question generation
 * Per UI-SPEC: Topic input, category selector, guidance, source material, settings
 */
export default function GeneratorPage() {
  const router = useRouter();
  const {
    queue,
    isGenerating,
    progress,
    error,
    generateBatch,
    loadQueue,
  } = useGenerator();

  // Settings state
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [model, setModel] = useState(DEFAULT_MODEL);

  // Load queue from localStorage on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Navigate to review page after generation completes
  useEffect(() => {
    if (!isGenerating && queue.length > 0) {
      // Check if we just finished generating by looking at pending questions
      const pendingCount = queue.filter((q) => q.status === 'pending').length;
      if (pendingCount > 0) {
        // Navigate to review page
        router.push('/review');
      }
    }
  }, [isGenerating, queue, router]);

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('trivial-world-ollama-url');
      const savedModel = localStorage.getItem('trivial-world-model');
      if (savedUrl) setOllamaUrl(savedUrl);
      if (savedModel) setModel(savedModel);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trivial-world-ollama-url', ollamaUrl);
      localStorage.setItem('trivial-world-model', model);
    }
  }, [ollamaUrl, model]);

  const handleGenerate = (
    topic: string,
    category: Category,
    guidance?: string,
    sourceMaterial?: string
  ) => {
    generateBatch(topic, category, 10, guidance, sourceMaterial, model, ollamaUrl);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Question Generator</h2>
        <p className="text-muted mt-1">
          Generate trivia questions from topics or source material
        </p>
      </div>

      {/* Generator form */}
      <div className="bg-card border border-card rounded-lg p-6">
        <GeneratorForm
          isGenerating={isGenerating}
          progress={progress}
          onGenerate={handleGenerate}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive font-medium">Error</p>
          <p className="text-sm text-destructive/80">{error}</p>
        </div>
      )}

      {/* Settings panel - Per D-05 */}
      <SettingsPanel
        ollamaUrl={ollamaUrl}
        onUrlChange={setOllamaUrl}
        model={model}
        onModelChange={setModel}
      />

      {/* Queue status */}
      {queue.length > 0 && (
        <div className="p-4 bg-card border border-card rounded-lg">
          <p className="text-sm text-muted">
            {queue.filter((q) => q.status === 'approved').length} approved,
            {queue.filter((q) => q.status === 'pending').length} pending,
            {queue.filter((q) => q.status === 'rejected').length} rejected
          </p>
        </div>
      )}
    </div>
  );
}