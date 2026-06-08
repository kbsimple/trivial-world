/**
 * DownloadPackButton component
 * Validates pack requirements and triggers JSON download
 * Per D-18: Manual JSON download for approved packs
 * Per UI-SPEC: Download Pack button with full width
 */

'use client';

import { useState } from 'react';
import { exportPack, downloadPack } from '@/lib/pack/export';

interface DownloadPackButtonProps {
  /** Pack name */
  name: string;
  /** Pack description */
  description: string | undefined;
  /** Pack author */
  author: string;
  /** Whether form is valid */
  isValid: boolean;
  /** Callback when export succeeds */
  onExportSuccess?: () => void;
  /** Callback when export fails */
  onExportError?: (error: string) => void;
}

/**
 * DownloadPackButton component
 * Validates pack requirements (minimum 20 questions, valid metadata)
 * and triggers browser download on success
 */
export function DownloadPackButton({
  name,
  description,
  author,
  isValid,
  onExportSuccess,
  onExportError,
}: DownloadPackButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    // Clear previous error
    setError(null);

    // Validate form
    if (!isValid) {
      const errorMsg = 'Please fill in all required fields.';
      setError(errorMsg);
      onExportError?.(errorMsg);
      return;
    }

    // Validate pack name
    if (!name.trim()) {
      const errorMsg = 'Pack name is required.';
      setError(errorMsg);
      onExportError?.(errorMsg);
      return;
    }

    // Validate author
    if (!author.trim()) {
      const errorMsg = 'Author name is required.';
      setError(errorMsg);
      onExportError?.(errorMsg);
      return;
    }

    // Start export
    setIsExporting(true);

    try {
      const { blob, filename } = await exportPack(name.trim(), description?.trim() || undefined, author.trim());

      // Trigger download
      downloadPack(blob, filename);

      // Notify parent
      onExportSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to export pack.';
      setError(errorMsg);
      onExportError?.(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={!isValid || isExporting}
        style={{
          width: '100%',
          padding: '14px 24px',
          backgroundColor: !isValid || isExporting ? '#374151' : '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          cursor: !isValid || isExporting ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 600,
          opacity: !isValid ? 0.7 : 1,
          transition: 'background-color 0.2s ease',
        }}
      >
        {isExporting ? 'Exporting...' : 'Download Pack'}
      </button>

      {/* Help text */}
      {!isValid && (
        <p
          style={{
            color: '#6b7280',
            fontSize: '12px',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Fill in pack name and author to enable download
        </p>
      )}
    </div>
  );
}