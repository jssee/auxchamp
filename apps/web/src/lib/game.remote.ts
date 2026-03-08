import { command, getRequestEvent } from "$app/server";
import * as v from "valibot";

import { createApi } from "$lib/server/api";

export const create_game = command(
  v.object({
    name: v.pipe(v.string(), v.minLength(1, "Name is required")),
    description: v.optional(v.nullable(v.string())),
    submissionWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
    votingWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  async (input) => {
    const api = createApi(getRequestEvent().request);
    return api.game.create(input);
  },
);

export const add_round = command(
  v.object({
    gameId: v.string(),
    theme: v.pipe(v.string(), v.minLength(1, "Theme is required")),
    description: v.optional(v.nullable(v.string())),
  }),
  async (input) => {
    const api = createApi(getRequestEvent().request);
    return api.game.addRound(input);
  },
);

export const invite_player = command(
  v.object({
    gameId: v.string(),
    targetUserEmail: v.pipe(v.string(), v.email("Invalid email")),
  }),
  async (input) => {
    const api = createApi(getRequestEvent().request);
    return api.game.invitePlayer(input);
  },
);

export const accept_invite = command(
  v.object({
    gameId: v.string(),
  }),
  async (input) => {
    const api = createApi(getRequestEvent().request);
    return api.game.acceptInvite(input);
  },
);

export const start_game = command(
  v.object({
    gameId: v.string(),
  }),
  async (input) => {
    const api = createApi(getRequestEvent().request);
    return api.game.start(input);
  },
);

export const upsert_submission = command(
  v.object({
    gameId: v.string(),
    spotifyTrackUrl: v.pipe(
      v.string(),
      v.url("Must be a valid URL"),
      v.startsWith("https://open.spotify.com/", "Must be a Spotify URL"),
    ),
    note: v.optional(v.nullable(v.string())),
  }),
  async (input) => {
    const api = createApi(getRequestEvent().request);
    return api.game.upsertSubmission(input);
  },
);
