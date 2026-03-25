import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { ballot } from "./ballot";
import { game } from "./game";
import { submission } from "./submission";

export const roundPhase = pgEnum("round_phase", ["pending", "submitting", "voting", "scored"]);

export const round = pgTable(
  "round",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    theme: text("theme").notNull(),
    description: text("description"),
    phase: roundPhase("phase").default("pending").notNull(),
    submissionOpensAt: timestamp("submission_opens_at"),
    submissionClosesAt: timestamp("submission_closes_at"),
    votingOpensAt: timestamp("voting_opens_at"),
    votingClosesAt: timestamp("voting_closes_at"),
    spotifyPlaylistId: text("spotify_playlist_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check("round_number_positive", sql`${table.number} > 0`),
    index("round_game_id_idx").on(table.gameId),
    unique("round_game_id_number_unique").on(table.gameId, table.number),
  ],
);

export const roundRelations = relations(round, ({ many, one }) => ({
  game: one(game, {
    fields: [round.gameId],
    references: [game.id],
  }),
  submissions: many(submission),
  ballots: many(ballot),
}));
