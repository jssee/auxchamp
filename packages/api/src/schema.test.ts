import { expect, test } from "bun:test";
import * as v from "valibot";

import { addRoundInputSchema, createGameInputSchema, saveSubmissionInputSchema } from "./schema";

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
