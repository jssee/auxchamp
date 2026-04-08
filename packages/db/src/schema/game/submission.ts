import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { player } from "./player";
import { round } from "./round";
import { star } from "./star";

export const submission = pgTable(
  "submission",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => round.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "cascade" }),
    spotifyTrackUrl: text("spotify_track_url").notNull(),
    note: text("note"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("submission_round_id_idx").on(table.roundId),
    index("submission_player_id_idx").on(table.playerId),
    unique("submission_round_id_player_id_unique").on(
      table.roundId,
      table.playerId,
    ),
  ],
);

export const submissionRelations = relations(submission, ({ many, one }) => ({
  round: one(round, {
    fields: [submission.roundId],
    references: [round.id],
  }),
  player: one(player, {
    fields: [submission.playerId],
    references: [player.id],
  }),
  stars: many(star),
}));
