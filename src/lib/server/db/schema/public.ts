import {
  bigint,
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  createSelectSchema,
  createUpdateSchema,
  createInsertSchema,
} from "drizzle-valibot";
import * as v from "valibot";

import { user } from "./auth";

/** Reference to a scheduled QStash job for cancel/reschedule on edits */
export type QStashJobRef = { action: string; messageId: string };

export const battle = pgTable("battle", {
  id: text("id").primaryKey(),
  name: text().notNull(),
  creatorId: text().notNull(),
  status: text({ enum: ["draft", "active", "completed", "cancelled"] })
    .default("draft")
    .notNull(),
  visibility: text({ enum: ["public", "private"] })
    .default("private")
    .notNull(),
  maxPlayers: integer().default(8).notNull(),
  doubleSubmissions: boolean().default(false).notNull(),
  inviteCode: text(),
  currentStageId: text(),
  createdAt: timestamp().defaultNow().notNull(),
  authoritativeTimezone: text().notNull(),
  stagesCount: integer().default(0).notNull(),
});
export const battleSelectSchema = createSelectSchema(battle);
export const battleUpdateSchema = createUpdateSchema(battle);
export const battleInsertSchema = createInsertSchema(battle, {
  name: (schema) => v.pipe(schema, v.minLength(1, "Name is required")),
  maxPlayers: (schema) => v.pipe(schema, v.minValue(2), v.maxValue(32)),
});

export const player = pgTable("player", {
  id: text("id").primaryKey(),
  battleId: text().notNull(),
  userId: text().notNull(),
  joinedAt: bigint({ mode: "number" }),
  totalStarsEarned: integer(),
  stagesWon: integer(),
});

export const stage = pgTable(
  "stage",
  {
    id: text("id").primaryKey(),
    battleId: text().notNull(),
    stageNumber: integer().notNull(),
    vibe: text().notNull(),
    description: text(),
    submissionDeadline: timestamp().notNull(),
    votingDeadline: timestamp().notNull(),
    phase: text({ enum: ["upcoming", "submission", "voting", "closed"] })
      .default("upcoming")
      .notNull(),
    playlistUrl: text(),
    spotifyPlaylistId: text(),
    jobIds: json("job_ids").$type<QStashJobRef[]>(),
  },
  (t) => ({
    unq: unique().on(t.battleId, t.stageNumber),
  }),
);

export const submission = pgTable("submission", {
  id: text("id").primaryKey(),
  stageId: text().notNull(),
  userId: text().notNull(),
  spotifyUrl: text(),
  submissionOrder: integer(),
  submittedAt: bigint({ mode: "number" }),
  starsReceived: integer(),
  note: text(),
});

export const star = pgTable(
  "star",
  {
    id: text("id").primaryKey(),
    stageId: text().notNull(),
    voterId: text().notNull(),
    submissionId: text().notNull(),
    votedAt: bigint({ mode: "number" }),
  },
  (t) => ({
    uniqueVote: unique().on(t.stageId, t.voterId, t.submissionId),
  }),
);

export const spotifyCredentials = pgTable("spotify_credentials", {
  id: text("id").primaryKey().default("service"),
  accessToken: text().notNull(),
  refreshToken: text().notNull(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});

export const userStats = pgTable("user_stats", {
  id: text("id").primaryKey(),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  lifetimeStarsEarned: integer().default(0).notNull(),
  lifetimeStagesWon: integer().default(0).notNull(),
  battlesCompleted: integer().default(0).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
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

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(user, {
    fields: [userStats.userId],
    references: [user.id],
  }),
}));
