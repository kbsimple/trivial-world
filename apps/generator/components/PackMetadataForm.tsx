/**
 * PackMetadataForm component
 * Captures pack name, description, and author with Zod validation
 * Per UI-SPEC: Pack metadata editor layout and copy
 * Per D-02: Schema validation ensures metadata matches PackMetadataSchema
 */

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Form validation schema
 * Per PackMetadataSchema: name 1-100 chars, description max 500, author 1-100 chars
 */
const formSchema = z.object({
  name: z.string().min(1, 'Pack name is required').max(100, 'Pack name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  author: z.string().min(1, 'Author name is required').max(100, 'Author name must be at most 100 characters'),
});

type FormData = z.infer<typeof formSchema>;

interface PackMetadataFormProps {
  /** Current pack name */
  name: string;
  /** Callback when name changes */
  onNameChange: (name: string) => void;
  /** Current description */
  description: string;
  /** Callback when description changes */
  onDescriptionChange: (description: string) => void;
  /** Current author */
  author: string;
  /** Callback when author changes */
  onAuthorChange: (author: string) => void;
  /** Whether form is valid */
  isValid: boolean;
  /** Callback when form validity changes */
  onValidityChange: (isValid: boolean) => void;
}

/**
 * PackMetadataForm component
 * Per D-02: Schema validation ensures metadata matches PackMetadataSchema
 */
export function PackMetadataForm({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  author,
  onAuthorChange,
  isValid,
  onValidityChange,
}: PackMetadataFormProps) {
  const {
    register,
    formState: { errors, isValid: formIsValid },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name,
      description,
      author,
    },
    mode: 'onChange',
  });

  // Watch form values and sync with parent
  const formValues = watch();

  useEffect(() => {
    // Sync form values to parent
    if (formValues.name !== name) {
      onNameChange(formValues.name ?? '');
    }
    if (formValues.description !== description) {
      onDescriptionChange(formValues.description ?? '');
    }
    if (formValues.author !== author) {
      onAuthorChange(formValues.author ?? '');
    }
    // Notify parent of validity changes
    if (formIsValid !== isValid) {
      onValidityChange(formIsValid);
    }
  }, [formValues.name, formValues.description, formValues.author, formIsValid]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Section header */}
      <div
        style={{
          borderBottom: '1px solid #374151',
          paddingBottom: '16px',
        }}
      >
        <h3
          style={{
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Pack Metadata Editor
        </h3>
      </div>

      {/* Pack name */}
      <div>
        <label
          style={{
            display: 'block',
            color: '#9ca3af',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          Name
        </label>
        <input
          {...register('name')}
          type="text"
          placeholder="Enter pack name"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#0a0a0f',
            border: errors.name ? '2px solid #ef4444' : '1px solid #374151',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '16px',
          }}
        />
        {errors.name && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: 0 }}>
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          style={{
            display: 'block',
            color: '#9ca3af',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          Description (optional)
        </label>
        <textarea
          {...register('description')}
          placeholder="Describe your question pack"
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#0a0a0f',
            border: errors.description ? '2px solid #ef4444' : '1px solid #374151',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '16px',
            resize: 'vertical',
          }}
        />
        {errors.description && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: 0 }}>
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Author */}
      <div>
        <label
          style={{
            display: 'block',
            color: '#9ca3af',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          Author
        </label>
        <input
          {...register('author')}
          type="text"
          placeholder="Your name"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#0a0a0f',
            border: errors.author ? '2px solid #ef4444' : '1px solid #374151',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '16px',
          }}
        />
        {errors.author && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: 0 }}>
            {errors.author.message}
          </p>
        )}
      </div>
    </div>
  );
}