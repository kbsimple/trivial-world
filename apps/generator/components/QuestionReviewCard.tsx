/**
 * QuestionReviewCard component
 * Single-question review UI with full edit capability
 * Per D-11: Single-question focus review UI
 * Per D-12: Full edit capability for question text, answer, difficulty
 * Per D-13: Three actions - Approve, Edit, Reject
 */

'use client';

import { useState } from 'react';
import type { Question, Category, Difficulty } from '@trivial-world/types';
import { CATEGORY_NAMES } from '@trivial-world/types';
import type { ConfidenceScore } from '@/lib/ollama/verification';
import { ConfidenceBadge } from './ConfidenceBadge';
import { VerificationPasses } from './VerificationPasses';

/**
 * Category colors matching mobile app
 * Per CLAUDE.md: Six categories with distinct colors
 */
const CATEGORY_COLORS: Record<Category, string> = {
  blue: '#0066cc',
  pink: '#ff69b4',
  yellow: '#ffd700',
  purple: '#9932cc',
  green: '#228b22',
  orange: '#ff8c00',
};

interface QuestionReviewCardProps {
  /** Question with verification metadata */
  questionWithVerification: {
    question: Question;
    verification: ConfidenceScore;
    status: 'pending' | 'approved' | 'rejected' | 'needs-edit';
    editedQuestion?: Question;
  };
  /** Callback when user approves the question */
  onApprove: (id: string) => void;
  /** Callback when user rejects the question */
  onReject: (id: string) => void;
  /** Callback when user saves an edit */
  onEdit: (id: string, edited: Question) => void;
  /** Callback to navigate to next question */
  onNext: () => void;
  /** Callback to navigate to previous question */
  onPrev: () => void;
  /** Current question index (0-based) */
  currentIndex: number;
  /** Total questions in queue */
  totalCount: number;
}

/**
 * Difficulty options for dropdown
 */
const DIFFICULTY_OPTIONS: (Difficulty | undefined)[] = ['easy', 'medium', 'hard', undefined];

/**
 * QuestionReviewCard component
 * Displays a single question with verification context and edit capability
 */
export function QuestionReviewCard({
  questionWithVerification,
  onApprove,
  onReject,
  onEdit,
  onNext,
  onPrev,
  currentIndex,
  totalCount,
}: QuestionReviewCardProps) {
  const { question, verification, editedQuestion } = questionWithVerification;

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editQuestionText, setEditQuestionText] = useState(question.questionText);
  const [editAnswerText, setEditAnswerText] = useState(question.answerText);
  const [editDifficulty, setEditDifficulty] = useState<Difficulty | undefined>(question.difficulty);

  // Validation state
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);

  // Form validation per T-07-09
  const validateForm = (): boolean => {
    let isValid = true;

    // Validate question text: min 10 chars, max 500 chars
    if (editQuestionText.length < 10) {
      setQuestionError('Question text must be at least 10 characters');
      isValid = false;
    } else if (editQuestionText.length > 500) {
      setQuestionError('Question text must be at most 500 characters');
      isValid = false;
    } else {
      setQuestionError(null);
    }

    // Validate answer text: min 1 char, max 200 chars
    if (editAnswerText.length < 1) {
      setAnswerError('Answer text is required');
      isValid = false;
    } else if (editAnswerText.length > 200) {
      setAnswerError('Answer text must be at most 200 characters');
      isValid = false;
    } else {
      setAnswerError(null);
    }

    return isValid;
  };

  // Handle edit mode
  const handleEditClick = () => {
    setIsEditing(true);
    // Reset form to current question state
    setEditQuestionText(editedQuestion?.questionText ?? question.questionText);
    setEditAnswerText(editedQuestion?.answerText ?? question.answerText);
    setEditDifficulty(editedQuestion?.difficulty ?? question.difficulty);
    setQuestionError(null);
    setAnswerError(null);
  };

  // Handle save changes
  const handleSaveChanges = () => {
    if (!validateForm()) {
      return;
    }

    const edited: Question = {
      ...question,
      questionText: editQuestionText,
      answerText: editAnswerText,
      difficulty: editDifficulty,
      updatedAt: new Date().toISOString(),
    };

    onEdit(question.id, edited);
    setIsEditing(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditQuestionText(editedQuestion?.questionText ?? question.questionText);
    setEditAnswerText(editedQuestion?.answerText ?? question.answerText);
    setEditDifficulty(editedQuestion?.difficulty ?? question.difficulty);
    setQuestionError(null);
    setAnswerError(null);
  };

  // Handle approve with optional edit
  const handleApprove = () => {
    onApprove(question.id);
  };

  // Current display values (edited or original)
  const displayQuestion = editedQuestion ?? question;
  const categoryColor = CATEGORY_COLORS[displayQuestion.category];
  const categoryName = CATEGORY_NAMES[displayQuestion.category];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        backgroundColor: '#1e1e2e',
        borderRadius: '12px',
        minWidth: '400px',
        maxWidth: '800px',
      }}
    >
      {/* Header: Category badge + Question number */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Category badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              backgroundColor: categoryColor,
              padding: '6px 12px',
              borderRadius: '16px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {categoryName}
          </div>
          {displayQuestion.difficulty && (
            <span
              style={{
                color: '#9ca3af',
                fontSize: '12px',
              }}
            >
              ({displayQuestion.difficulty})
            </span>
          )}
        </div>

        {/* Question number badge */}
        <div
          style={{
            backgroundColor: '#374151',
            padding: '6px 12px',
            borderRadius: '16px',
            color: '#e5e7eb',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Q{currentIndex + 1}/{totalCount}
        </div>
      </div>

      {/* Question text */}
      <div>
        <label
          style={{
            display: 'block',
            color: '#9ca3af',
            fontSize: '12px',
            marginBottom: '4px',
          }}
        >
          Question
        </label>
        {isEditing ? (
          <div>
            <textarea
              value={editQuestionText}
              onChange={(e) => setEditQuestionText(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0a0a0f',
                border: questionError ? '2px solid #ef4444' : '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '16px',
                resize: 'vertical',
                minHeight: '80px',
              }}
            />
            {questionError && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: 0 }}>
                {questionError}
              </p>
            )}
          </div>
        ) : (
          <p
            style={{
              color: '#ffffff',
              fontSize: '16px',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {displayQuestion.questionText}
          </p>
        )}
      </div>

      {/* Answer text */}
      <div>
        <label
          style={{
            display: 'block',
            color: '#9ca3af',
            fontSize: '12px',
            marginBottom: '4px',
          }}
        >
          Answer
        </label>
        {isEditing ? (
          <div>
            <input
              type="text"
              value={editAnswerText}
              onChange={(e) => setEditAnswerText(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0a0a0f',
                border: answerError ? '2px solid #ef4444' : '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '16px',
              }}
            />
            {answerError && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: 0 }}>
                {answerError}
              </p>
            )}
          </div>
        ) : (
          <p
            style={{
              color: '#22c55e',
              fontSize: '16px',
              fontWeight: 500,
              margin: 0,
            }}
          >
            {displayQuestion.answerText}
          </p>
        )}
      </div>

      {/* Difficulty (editable) */}
      <div>
        <label
          style={{
            display: 'block',
            color: '#9ca3af',
            fontSize: '12px',
            marginBottom: '4px',
          }}
        >
          Difficulty
        </label>
        {isEditing ? (
          <select
            value={editDifficulty ?? ''}
            onChange={(e) => setEditDifficulty(e.target.value as Difficulty || undefined)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#0a0a0f',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
            }}
          >
            <option value="">Not specified</option>
            {DIFFICULTY_OPTIONS.filter((d): d is Difficulty => d !== undefined).map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ color: '#e5e7eb', fontSize: '14px' }}>
            {displayQuestion.difficulty
              ? displayQuestion.difficulty.charAt(0).toUpperCase() + displayQuestion.difficulty.slice(1)
              : 'Not specified'}
          </span>
        )}
      </div>

      {/* Confidence badge */}
      <ConfidenceBadge score={verification.score} passes={verification.passes} />

      {/* Verification passes */}
      <VerificationPasses results={verification.results} />

      {/* Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}
      >
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: currentIndex === 0 ? '#374151' : '#4b5563',
            color: currentIndex === 0 ? '#6b7280' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          ← Prev
        </button>

        <span style={{ color: '#9ca3af', fontSize: '14px' }}>
          {currentIndex + 1} of {totalCount}
        </span>

        <button
          onClick={onNext}
          disabled={currentIndex === totalCount - 1}
          style={{
            padding: '8px 16px',
            backgroundColor: currentIndex === totalCount - 1 ? '#374151' : '#4b5563',
            color: currentIndex === totalCount - 1 ? '#6b7280' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: currentIndex === totalCount - 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Next →
        </button>
      </div>

      {/* Action buttons */}
      {isEditing ? (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          <button
            onClick={handleSaveChanges}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#22c55e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            Save Changes
          </button>
          <button
            onClick={handleCancelEdit}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#6b7280',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          {/* Approve button - primary blue */}
          <button
            onClick={handleApprove}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            Approve
          </button>

          {/* Edit button - secondary gray */}
          <button
            onClick={handleEditClick}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#6b7280',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Edit
          </button>

          {/* Reject button - destructive red */}
          <button
            onClick={() => onReject(question.id)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}