import type { GameRecord, Feedback } from '@trivial-world/types';

/** Result of an idempotent insert. `receivedAt` is the ISO string stored by the DB. */
export interface InsertResult {
  id: string;
  receivedAt: string;
  created: boolean;
}

/**
 * Persistence port implemented by the DB repository and by test fakes.
 * Handlers depend on this interface only (D-12).
 */
export interface IngestRepository {
  /**
   * One transaction: game + seats + outcomes. ON CONFLICT (id) DO NOTHING;
   * a replay returns the stored receivedAt with created=false (D-06). The
   * server sets received_at; it is never taken from the request (D-10).
   */
  insertGameRecord(record: GameRecord): Promise<InsertResult>;

  /**
   * ON CONFLICT DO NOTHING on id or on (install_id, pack_id, question_id,
   * reason); a conflict returns the existing row's id/receivedAt with
   * created=false.
   */
  insertFeedback(feedback: Feedback): Promise<InsertResult>;

  /** Resolves if the DB answers SELECT 1; rejects otherwise. */
  ping(): Promise<void>;
}
