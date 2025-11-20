import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./auth";

export const battle = pgTable("battle", {
  id: text("id").primaryKey(),
  name: text(),
  creatorId: text().notNull(),
  status: text({ enum: ["active", "completed"] }),
  visibility: text({ enum: ["public", "private"] }),
  maxPlayers: integer(),
  doubleSubmissions: boolean(),
  inviteCode: text(),
  currentStageId: text(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const player = pgTable("player", {
  id: text("id").primaryKey(),
  battleId: text().notNull(),
  userId: text().notNull(),
  joinedAt: integer(),
  totalStarsEarned: integer(),
  stagesWon: integer(),
});

export const stage = pgTable("stage", {
  id: text("id").primaryKey(),
  battleId: text().notNull(),
  stageNumber: integer(),
  vibe: text(),
  description: text(),
  submissionDeadline: integer(),
  votingDeadline: integer(),
  phase: text({ enum: ["pending", "submission", "voting", "completed"] }),
  playlistUrl: text(),
  spotifyPlaylistId: text(),
});

export const submission = pgTable("submission", {
  id: text("id").primaryKey(),
  stageId: text().notNull(),
  userId: text().notNull(),
  spotifyUrl: text(),
  submissionOrder: integer(),
  submittedAt: integer(),
  starsReceived: integer(),
});

export const star = pgTable("star", {
  id: text("id").primaryKey(),
  stageId: text().notNull(),
  voterId: text().notNull(),
  submissionId: text().notNull(),
  votedAt: integer(),
});

// Relations
export const battleRelations = relations(battle, ({ one, many }) => ({
  creator: one(user, {
    fields: [battle.creatorId],
    references: [user.id],
  }),
  currentStage: one(stage, {
    fields: [battle.currentStageId],
    references: [stage.id],
  }),
  stages: many(stage),
  players: many(player),
}));

export const stageRelations = relations(stage, ({ one, many }) => ({
  battle: one(battle, {
    fields: [stage.battleId],
    references: [battle.id],
  }),
  submissions: many(submission),
  stars: many(star),
}));

export const submissionRelations = relations(submission, ({ one, many }) => ({
  stage: one(stage, {
    fields: [submission.stageId],
    references: [stage.id],
  }),
  user: one(user, {
    fields: [submission.userId],
    references: [user.id],
  }),
  stars: many(star),
}));

export const starRelations = relations(star, ({ one }) => ({
  stage: one(stage, {
    fields: [star.stageId],
    references: [stage.id],
  }),
  voter: one(user, {
    fields: [star.voterId],
    references: [user.id],
  }),
  submission: one(submission, {
    fields: [star.submissionId],
    references: [submission.id],
  }),
}));

export const playerRelations = relations(player, ({ one }) => ({
  battle: one(battle, {
    fields: [player.battleId],
    references: [battle.id],
  }),
  user: one(user, {
    fields: [player.userId],
    references: [user.id],
  }),
}));
