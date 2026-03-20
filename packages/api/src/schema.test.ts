import { expect, test } from "bun:test";
import * as v from "valibot";

import {
  addRoundInputSchema,
  createGameInputSchema,
  saveBallotInputSchema,
  saveSubmissionInputSchema,
} from "./schema";

test("createGameInputSchema rejects null description", () => {
  const result = v.safeParse(createGameInputSchema, {
    name: "Friday night mix",
    description: null,
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  expect(result.success).toBeFalse();
});

test("addRoundInputSchema rejects null description", () => {
  const result = v.safeParse(addRoundInputSchema, {
    gameId: "game_123",
    theme: "Opening credits",
    description: null,
  });

  expect(result.success).toBeFalse();
});

test("saveSubmissionInputSchema rejects null note", () => {
  const result = v.safeParse(saveSubmissionInputSchema, {
    gameId: "game_123",
    spotifyTrackUrl: "https://open.spotify.com/track/abc123",
    note: null,
  });

  expect(result.success).toBeFalse();
});

test("saveBallotInputSchema requires exactly 3 submission IDs", () => {
  const valid = v.safeParse(saveBallotInputSchema, {
    gameId: "game_123",
    submissionIds: ["s1", "s2", "s3"],
  });
  expect(valid.success).toBeTrue();

  const tooFew = v.safeParse(saveBallotInputSchema, {
    gameId: "game_123",
    submissionIds: ["s1", "s2"],
  });
  expect(tooFew.success).toBeFalse();

  const tooMany = v.safeParse(saveBallotInputSchema, {
    gameId: "game_123",
    submissionIds: ["s1", "s2", "s3", "s4"],
  });
  expect(tooMany.success).toBeFalse();
});
