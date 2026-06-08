import { pgTable, serial, integer, text, timestamp, real, unique, jsonb, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { proposalsTable } from "./proposals";

export const votesTable = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    proposalId: integer("proposal_id").notNull().references(() => proposalsTable.id),
    walletAddress: text("wallet_address").notNull(),
    // Basic votes store a single choice (for/against/abstain). Weighted custom
    // votes leave this null and store a per-option percentage map in `allocations`.
    choice: text("choice"),
    allocations: jsonb("allocations").$type<Record<string, number>>(),
    moatPoints: real("moat_points"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("uniq_vote_proposal_wallet").on(t.proposalId, t.walletAddress),
    // A vote is either a basic single choice or a weighted allocation, never
    // both and never neither.
    check(
      "vote_choice_xor_allocations",
      sql`(${t.choice} IS NOT NULL) <> (${t.allocations} IS NOT NULL)`
    ),
  ]
);

export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true, createdAt: true });
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votesTable.$inferSelect;
