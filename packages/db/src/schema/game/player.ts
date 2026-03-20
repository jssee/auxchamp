import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "../auth";
import { ballot } from "./ballot";
import { game } from "./game";
import { submission } from "./submission";

export const playerRole = pgEnum("player_role", ["creator", "player"]);
export const playerStatus = pgEnum("player_status", ["invited", "active", "left", "removed"]);

export const player = pgTable(
  "player",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: playerRole("role").notNull(),
    status: playerStatus("status").notNull(),
    joinedAt: timestamp("joined_at"),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("player_game_id_idx").on(table.gameId),
    index("player_user_id_idx").on(table.userId),
    unique("player_game_id_user_id_unique").on(table.gameId, table.userId),
  ],
);

export const playerRelations = relations(player, ({ many, one }) => ({
  game: one(game, {
    fields: [player.gameId],
    references: [game.id],
  }),
  user: one(user, {
    fields: [player.userId],
    references: [user.id],
  }),
  submissions: many(submission),
  ballots: many(ballot),
}));
