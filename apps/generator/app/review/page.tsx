'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGenerator } from '@/hooks/useGenerator';
import { QuestionReviewCard } from '@/components/QuestionReviewCard';
import { saveApprovedQuestion, getApprovedQuestions } from '@/lib/storage/local';
import type { Question } from '@trivial-world/types';

/**
 * Review page - Human review workflow for generated questions
 * Per D-11: Single-question focus review UI
 * Per D-09: All 3 verification pass results visible
 * Per UI-SPEC: Review Page layout with navigation and question number badge
 */
export default function ReviewPage() {
  const router = useRouter();
  const {
    queue,
    currentQuestion,
    currentIndex,
    approve,
    reject,
    edit,
    next,
    prev,
    loadQueue,
  } = useGenerator();

  const [isLoading, setIsLoading] = useState(true);
  const [approvedCount, setApprovedCount] = useState(0);

  // Load queue from localStorage on mount
  useEffect(() => {
    loadQueue();
    setApprovedCount(getApprovedQuestions().length);
    setIsLoading(false);
  }, [loadQueue]);

  // Note: Empty queue state is handled in render below
  // No redirect needed - the UI shows appropriate empty state

  // Handle approve action
  const handleApprove = (id: string) => {
    const questionToApprove = queue.find((q) => q.question.id === id);
    if (questionToApprove) {
      // Save to LocalStorage
      saveApprovedQuestion(questionToApprove.editedQuestion ?? questionToApprove.question);
      // Update approved count
      setApprovedCount(getApprovedQuestions().length);
    }
    // Remove from queue and advance
    approve(id);
    // Auto-advance to next question
    if (currentIndex < queue.length - 1) {
      next();
    }
  };

  // Handle reject action
  const handleReject = (id: string) => {
    reject(id);
    // Auto-advance to next question
    if (currentIndex < queue.length - 1) {
      next();
    }
  };

  // Handle edit action
  const handleEdit = (id: string, edited: Question) => {
    edit(id, edited);
    // Stay on same question after edit - user can now approve
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted">Loading questions...</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (queue.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold">Review Questions</h2>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-muted">
            No questions to review. Generate some questions first!
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Generator
          </button>
        </div>
      </div>
    );
  }

  // No current question (shouldn't happen but handle gracefully)
  if (!currentQuestion) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold">Review Questions</h2>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-muted">
            All questions have been reviewed!
          </p>
          <div className="text-sm text-muted">
            Approved: {approvedCount} questions
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Generator
          </button>
        </div>
      </div>
    );
  }

  // Get pending questions count
  const pendingCount = queue.filter((q) => q.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Review Questions</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted">
            <span className="text-green-500 font-semibold">{approvedCount}</span> approved
          </div>
          <div className="text-sm text-muted">
            <span className="text-yellow-500 font-semibold">{pendingCount}</span> pending
          </div>
        </div>
      </div>

      {/* Question review card */}
      <div className="flex justify-center">
        <QuestionReviewCard
          questionWithVerification={currentQuestion}
          onApprove={handleApprove}
          onReject={handleReject}
          onEdit={handleEdit}
          onNext={next}
          onPrev={prev}
          currentIndex={currentIndex}
          totalCount={queue.length}
        />
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center">
        <div className="text-sm text-muted">
          {queue.length > 0 && (
            <span>
              Reviewing question {currentIndex + 1} of {queue.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}