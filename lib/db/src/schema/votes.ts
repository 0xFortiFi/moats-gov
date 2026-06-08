import { pgTable, serial, integer, text, timestamp, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { proposalsTable } from "./proposals";

export const votesTable = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    proposalId: integer("proposal_id").notNull().references(() => proposalsTable.id),
    walletAddress: text("wallet_address").notNull(),
    choice: text("choice").notNull(),
    moatPoints: real("moat_points"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("uniq_vote_proposal_wallet").on(t.proposalId, t.walletAddress)]
);

export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true, createdAt: true });
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votesTable.$inferSelect;
