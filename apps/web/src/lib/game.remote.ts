import { command, form, getRequestEvent } from "$app/server";
import { redirect } from "@sveltejs/kit";
import * as v from "valibot";

import { isSpotifyTrackUrl } from "@auxchamp/api/util";
import { createApi } from "$lib/server/api";
import { rethrowAsIssue } from "$lib/server/rethrow-as-issue";

export const createGame = form(
  v.object({
    name: v.pipe(v.string(), v.minLength(1, "Name is required")),
    description: v.optional(v.string()),
    submissionWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
    votingWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  async (input, issue) => {
    const api = createApi(getRequestEvent().request);

    try {
      const result = await api.createGame(input);
      redirect(303, `/games/${result.gameId}`);
    } catch (thrown) {
      rethrowAsIssue(thrown, issue.name("Unable to create game."));
    }
  },
);

export const addRound = form(
  v.object({
    gameId: v.string(),
    theme: v.pipe(v.string(), v.minLength(1, "Theme is required")),
    description: v.optional(v.string()),
  }),
  async (input, issue) => {
    const api = createApi(getRequestEvent().request);

    try {
      return await api.addRound(input);
    } catch (thrown) {
      rethrowAsIssue(thrown, issue.theme("Unable to add round."));
    }
  },
);

export const invitePlayer = form(
  v.object({
    gameId: v.string(),
    targetUserEmail: v.pipe(v.string(), v.email("Invalid email")),
  }),
  async (input, issue) => {
    const api = createApi(getRequestEvent().request);

    try {
      return await api.invitePlayer(input);
    } catch (thrown) {
      rethrowAsIssue(thrown, issue.targetUserEmail("Unable to invite player."));
    }
  },
);

export const acceptInvite = command(
  v.object({
    gameId: v.string(),
  }),
  async (input) => {
    const api = createApi(getRequestEvent().request);
    return api.acceptInvite(input);
  },
);

export const startGame = command(
  v.object({
    gameId: v.string(),
  }),
  async (input) => {
    const api = createApi(getRequestEvent().request);
    return api.startGame(input);
  },
);

export const saveSubmission = form(
  v.object({
    gameId: v.string(),
    spotifyTrackUrl: v.pipe(
      v.string(),
      v.url("Must be a valid URL"),
      v.check(isSpotifyTrackUrl, "Must be a Spotify track URL"),
    ),
    note: v.optional(v.string()),
  }),
  async (input, issue) => {
    const api = createApi(getRequestEvent().request);

    try {
      return await api.saveSubmission(input);
    } catch (thrown) {
      rethrowAsIssue(thrown, issue.spotifyTrackUrl("Unable to submit this track right now."));
    }
  },
);
