import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { player } from "./player";
import { round } from "./round";
import { star } from "./star";

export const ballot = pgTable(
  "ballot",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => round.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("ballot_round_id_idx").on(table.roundId),
    index("ballot_player_id_idx").on(table.playerId),
    unique("ballot_round_id_player_id_unique").on(
      table.roundId,
      table.playerId,
    ),
  ],
);

export const ballotRelations = relations(ballot, ({ many, one }) => ({
  round: one(round, {
    fields: [ballot.roundId],
    references: [round.id],
  }),
  player: one(player, {
    fields: [ballot.playerId],
    references: [player.id],
  }),
  stars: many(star),
}));
