import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { ballot } from "./ballot";
import { submission } from "./submission";

export const star = pgTable(
  "star",
  {
    id: text("id").primaryKey(),
    ballotId: text("ballot_id")
      .notNull()
      .references(() => ballot.id, { onDelete: "cascade" }),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submission.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("star_ballot_id_idx").on(table.ballotId),
    index("star_submission_id_idx").on(table.submissionId),
    unique("star_ballot_id_submission_id_unique").on(
      table.ballotId,
      table.submissionId,
    ),
  ],
);

export const starRelations = relations(star, ({ one }) => ({
  ballot: one(ballot, {
    fields: [star.ballotId],
    references: [ballot.id],
  }),
  submission: one(submission, {
    fields: [star.submissionId],
    references: [submission.id],
  }),
}));
