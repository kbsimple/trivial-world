import { Model, Q } from '@nozbe/watermelondb';
import { field, children, action } from '@nozbe/watermelondb/decorators';
import { Category, PackMetadata } from '@trivial-world/types';

/**
 * QuestionPack model
 * Per RESEARCH.md Pattern 2: Offline-First Pack Caching
 */
export class QuestionPackModel extends Model {
  static table = 'question_packs';
  static associations = {
    questions: { type: 'has_many', foreignKey: 'question_pack_id' },
  } as const;

  @field('pack_id') packId!: string;
  @field('name') name!: string;
  @field('description') description?: string;
  @field('version') version!: string;
  @field('author') author!: string;
  @field('downloaded_at') downloadedAt!: number;
  @field('checksum') checksum!: string;
  @field('is_active') isActive!: boolean;
  @field('category_counts') categoryCounts!: string; // JSON string
  @field('total_questions') totalQuestions!: number;
  @field('schema_version') schemaVersion!: string;

  @children('questions') questions!: any; // Query<QuestionModel>

  /**
   * Get category counts as object
   */
  getCategoryCounts(): Record<Category, number> {
    try {
      return JSON.parse(this.categoryCounts);
    } catch {
      console.error(`Invalid category_counts JSON for pack ${this.packId}:`, this.categoryCounts);
      // Return empty counts for all categories as fallback
      return {
        blue: 0,
        pink: 0,
        yellow: 0,
        purple: 0,
        green: 0,
        orange: 0,
      };
    }
  }

  /**
   * Get questions by category (lazy loading)
   * Per RESEARCH.md: Never load > 50 questions at once
   */
  @action getQuestionsByCategory(category: Category) {
    return this.questions.extend(Q.where('category', category));
  }

  /**
   * Get available (not asked) questions by category
   */
  @action getAvailableQuestions(category: Category) {
    return this.questions.extend(
      Q.where('category', category),
      Q.where('asked_at', null)
    );
  }

  /**
   * Convert to PackMetadata type
   */
  toPackMetadata(): PackMetadata {
    if (this.schemaVersion !== '1.0.0') {
      throw new Error(`Unsupported pack schema version: ${this.schemaVersion}`);
    }
    // Note: createdAt/updatedAt set to downloadedAt since original timestamps aren't stored in DB
    // Consider adding original_created_at/updated_at columns if needed
    return {
      id: this.packId,
      name: this.name,
      description: this.description,
      version: this.version,
      author: this.author,
      createdAt: new Date(this.downloadedAt).toISOString(),
      updatedAt: new Date(this.downloadedAt).toISOString(),
      categoryCounts: this.getCategoryCounts(),
      totalQuestions: this.totalQuestions,
      checksum: this.checksum,
      schemaVersion: this.schemaVersion,
      contentEncoding: 'identity',
      // Estimate size: ~200 bytes per question on average
      // TODO: Add size column to schema for accurate tracking
      size: this.totalQuestions * 200,
    };
  }
}