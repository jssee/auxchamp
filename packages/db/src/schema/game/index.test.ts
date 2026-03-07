import { expect, test } from "bun:test";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

import * as rootSchema from "@auxchamp/db/schema";
import * as gameSchema from "@auxchamp/db/schema/game";

test("game schema is exported from the public db barrels", () => {
  expect(rootSchema.game).toBe(gameSchema.game);
  expect(rootSchema.player).toBe(gameSchema.player);
  expect(rootSchema.round).toBe(gameSchema.round);
  expect(rootSchema.submission).toBe(gameSchema.submission);
});

test("milestone 1 game tables expose the expected shape and structural constraints", () => {
  expect(getTableConfig(gameSchema.game).name).toBe("game");
  expect(Object.keys(getTableColumns(gameSchema.game))).toEqual([
    "id",
    "name",
    "description",
    "state",
    "submissionWindowDays",
    "votingWindowDays",
    "startedAt",
    "completedAt",
    "createdAt",
    "updatedAt",
  ]);
  expect(getTableConfig(gameSchema.game).checks.map((constraint) => constraint.name)).toEqual([
    "game_submission_window_days_positive",
    "game_voting_window_days_positive",
  ]);

  expect(getTableConfig(gameSchema.player).name).toBe("player");
  expect(
    getTableConfig(gameSchema.player).uniqueConstraints.map((constraint) => constraint.getName()),
  ).toEqual(["player_game_id_user_id_unique"]);

  expect(getTableConfig(gameSchema.round).name).toBe("round");
  expect(getTableConfig(gameSchema.round).checks.map((constraint) => constraint.name)).toEqual([
    "round_number_positive",
  ]);
  expect(
    getTableConfig(gameSchema.round).uniqueConstraints.map((constraint) => constraint.getName()),
  ).toEqual(["round_game_id_number_unique"]);

  expect(getTableConfig(gameSchema.submission).name).toBe("submission");
  expect(
    getTableConfig(gameSchema.submission).uniqueConstraints.map((constraint) =>
      constraint.getName(),
    ),
  ).toEqual(["submission_round_id_player_id_unique"]);
});
