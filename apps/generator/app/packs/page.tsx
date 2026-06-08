/**
 * Packs page - Pack management and export
 * Per D-17: Static export for Netlify deployment
 * Per D-18: Manual JSON download for approved packs
 * Per UI-SPEC: Pack metadata editor, category distribution, download button
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Category } from '@trivial-world/types';
import { getApprovedCountByCategory } from '@/lib/storage/local';
import { CategoryDistribution } from '@/components/CategoryDistribution';
import { PackMetadataForm } from '@/components/PackMetadataForm';
import { DownloadPackButton } from '@/components/DownloadPackButton';

/**
 * Category order for consistent display
 */
const CATEGORY_ORDER: Category[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];

export default function PacksPage() {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Category counts
  const [categoryCounts, setCategoryCounts] = useState<Record<Category, number>>({
    blue: 0,
    pink: 0,
    yellow: 0,
    purple: 0,
    green: 0,
    orange: 0,
  });
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Load approved questions on mount
  useEffect(() => {
    const counts = getApprovedCountByCategory();
    setCategoryCounts(counts);
    setTotalQuestions(Object.values(counts).reduce((sum, n) => sum + n, 0));
  }, []);

  // Handle successful export
  const handleExportSuccess = () => {
    // Optionally: Show success message or clear approved questions
    console.log('Pack exported successfully');
  };

  // Handle export error
  const handleExportError = (error: string) => {
    console.error('Export error:', error);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Question Packs</h2>
          <p className="text-muted mt-1">
            Review approved questions and export your pack
          </p>
        </div>
        <Link
          href="/"
          className="text-base font-semibold hover:text-primary transition-colors"
        >
          Generator
        </Link>
      </div>

      {/* Empty state */}
      {totalQuestions === 0 && (
        <div className="p-6 bg-card border border-card rounded-lg text-center">
          <p className="text-lg font-medium mb-2">No questions to review</p>
          <p className="text-muted mb-4">
            Generate some questions first before creating a pack
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Generator
          </Link>
        </div>
      )}

      {/* Pack content */}
      {totalQuestions > 0 && (
        <>
          {/* Pack metadata editor */}
          <div className="bg-card border border-card rounded-lg p-6">
            <PackMetadataForm
              name={name}
              onNameChange={setName}
              description={description}
              onDescriptionChange={setDescription}
              author={author}
              onAuthorChange={setAuthor}
              isValid={isValid}
              onValidityChange={setIsValid}
            />
          </div>

          {/* Category distribution */}
          <div className="bg-card border border-card rounded-lg p-6">
            <CategoryDistribution categoryCounts={categoryCounts} />
          </div>

          {/* Minimum questions warning */}
          {totalQuestions < 20 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
              <p className="text-yellow-500 font-medium">
                Need at least 20 questions to create a pack ({totalQuestions}/20)
              </p>
              <p className="text-sm text-muted mt-1">
                Approve more questions in the Review page
              </p>
            </div>
          )}

          {/* Download button */}
          <div className="bg-card border border-card rounded-lg p-6">
            <DownloadPackButton
              name={name}
              description={description}
              author={author}
              isValid={isValid && totalQuestions >= 20}
              onExportSuccess={handleExportSuccess}
              onExportError={handleExportError}
            />
          </div>
        </>
      )}

      {/* Pack history section - future enhancement */}
      <div className="border-t border-card pt-6">
        <h3 className="text-lg font-semibold mb-4">Pack History</h3>
        <p className="text-muted text-sm">
          No previous packs
        </p>
      </div>
    </div>
  );
}