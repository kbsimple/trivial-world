import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import { Question, Category, Difficulty } from '@trivial-world/types';
import { QuestionPackModel } from './QuestionPack.js';

/**
 * Question model
 * Individual questions with relation to pack
 */
export class QuestionModel extends Model {
  static table = 'questions';
  static associations = {
    question_packs: { type: 'belongs_to', key: 'question_pack_id' },
  } as const;

  @field('question_pack_id') questionPackId!: string;
  @field('question_id') questionId!: string;
  @field('category') category!: Category;
  @field('question_text') questionText!: string;
  @field('answer_text') answerText!: string;
  @field('difficulty') difficulty?: Difficulty;
  @field('choices') choices?: string; // JSON array
  @field('correct_choice_index') correctChoiceIndex?: number;
  @field('asked_at') askedAt?: number; // Unix timestamp or null

  @relation('question_packs', 'question_pack_id') pack!: QuestionPackModel;

  /**
   * Get choices as array
   */
  getChoices(): string[] | undefined {
    if (!this.choices) return undefined;
    try {
      return JSON.parse(this.choices);
    } catch {
      console.error(`Invalid choices JSON for question ${this.questionId}:`, this.choices);
      return undefined;
    }
  }

  /**
   * Convert to Question type
   */
  toQuestion(): Question {
    return {
      id: this.questionId,
      category: this.category,
      questionText: this.questionText,
      answerText: this.answerText,
      difficulty: this.difficulty,
      choices: this.getChoices(),
      correctChoiceIndex: this.correctChoiceIndex,
    };
  }

  /**
   * Mark as asked
   */
  async markAsAsked() {
    await this.update(question => {
      question.askedAt = Date.now();
    });
  }
}