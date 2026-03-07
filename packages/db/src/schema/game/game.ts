import { relations, sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { player } from "./player";
import { round } from "./round";

export const gameState = pgEnum("game_state", ["draft", "active", "completed"]);

export const game = pgTable(
  "game",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    state: gameState("state").default("draft").notNull(),
    submissionWindowDays: integer("submission_window_days").notNull(),
    votingWindowDays: integer("voting_window_days").notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check("game_submission_window_days_positive", sql`${table.submissionWindowDays} > 0`),
    check("game_voting_window_days_positive", sql`${table.votingWindowDays} > 0`),
  ],
);

export const gameRelations = relations(game, ({ many }) => ({
  players: many(player),
  rounds: many(round),
}));
