/**
 * Web stub for models
 *
 * Web uses bundled questions from services/questionProvider.ts
 * This stub prevents WatermelonDB models from being bundled on web.
 */

import { QuestionPackModel } from './QuestionPack.web';
import { QuestionModel } from './Question.web';

export const modelClasses = [QuestionPackModel, QuestionModel];

export { QuestionPackModel, QuestionModel };