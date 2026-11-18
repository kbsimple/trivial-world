// Spike-only schema; replaced in 25-05.
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const spikeProbeTable = pgTable('spike_probe', {
  id: uuid('id').primaryKey().defaultRandom(),
  note: text('note').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
