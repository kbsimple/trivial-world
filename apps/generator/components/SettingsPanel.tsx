'use client';

import { useState } from 'react';
import { DEFAULT_MODEL } from '@/lib/ollama/client';

/**
 * Settings panel props
 * Per D-05: Settings integrated into Generator page
 */
interface SettingsPanelProps {
  /** Current Ollama endpoint URL */
  ollamaUrl: string;
  /** Callback when URL changes */
  onUrlChange: (url: string) => void;
  /** Current model selection */
  model: string;
  /** Callback when model changes */
  onModelChange: (model: string) => void;
}

/**
 * Available Ollama models for question generation
 */
const AVAILABLE_MODELS = [
  { id: 'llama3.2', name: 'Llama 3.2 (Recommended)' },
  { id: 'llama3.1', name: 'Llama 3.1' },
  { id: 'llama3', name: 'Llama 3' },
  { id: 'mistral', name: 'Mistral' },
  { id: 'codellama', name: 'Code Llama' },
];

/**
 * Settings panel for configuring Ollama connection
 * Per D-05: Settings integrated into Generator page (not separate route)
 * Per UI-SPEC: Collapsible section with endpoint and model inputs
 */
export function SettingsPanel({
  ollamaUrl,
  onUrlChange,
  model,
  onModelChange,
}: SettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-card rounded-lg overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-card/80 transition-colors"
      >
        <span className="font-semibold">Settings</span>
        <span className="text-muted">{isExpanded ? '−' : '+'}</span>
      </button>

      {/* Settings content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Ollama endpoint input */}
          <div>
            <label htmlFor="ollama-url" className="block text-sm font-medium mb-2">
              Ollama Endpoint
            </label>
            <input
              id="ollama-url"
              type="url"
              value={ollamaUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full px-3 py-2 bg-background border border-card rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <p className="text-xs text-muted mt-1">
              Per RESEARCH.md Pitfall 1: Set OLLAMA_ORIGINS environment variable for CORS
            </p>
          </div>

          {/* Model selector */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium mb-2">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-card rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">
              Default: {DEFAULT_MODEL}
            </p>
          </div>

          {/* Connection status */}
          <div className="pt-2 border-t border-card">
            <p className="text-xs text-muted">
              Ensure Ollama is running locally or on an accessible server.
              For browser access, set <code className="bg-card px-1 rounded">OLLAMA_ORIGINS</code> environment variable.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}