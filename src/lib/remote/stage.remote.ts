import { error } from "@sveltejs/kit";
import { eq, and, sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { command, form, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import { battle, stage, submission, star } from "$lib/server/db/schema";
import { createStagePlaylist } from "$lib/server/spotify";
import {
  submitSchema,
  voteSchema,
  castVotesSchema,
  createPlaylistSchema,
} from "$lib/schemas/stage";

export const submitTrack = form(submitSchema, async (data, invalid) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, data.stageId),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

  // Battle must be active
  if (currentStage.battle.status !== "active") {
    invalid("Battle is not active");
    return;
  }

  // Stage must be current stage
  if (currentStage.battle.currentStageId !== currentStage.id) {
    invalid("This stage is not active");
    return;
  }

  // Must be in submission phase (now < submissionDeadline)
  const now = new Date();
  if (now >= currentStage.submissionDeadline) {
    invalid("Submission deadline has passed");
    return;
  }

  // Check doubleSubmissions limit
  const existingSubmissions = await db.query.submission.findMany({
    where: and(
      eq(submission.stageId, data.stageId),
      eq(submission.userId, locals.user.id),
    ),
  });

  const maxSubmissions = currentStage.battle.doubleSubmissions ? 2 : 1;
  if (existingSubmissions.length >= maxSubmissions) {
    invalid(`Maximum ${maxSubmissions} submission(s) allowed`);
    return;
  }

  await db.insert(submission).values({
    id: nanoid(8),
    stageId: data.stageId,
    userId: locals.user.id,
    spotifyUrl: data.spotifyUrl,
    submissionOrder: existingSubmissions.length + 1,
    submittedAt: Math.floor(Date.now() / 1000),
    note: data.note || null,
  });

  return { success: true };
});

export const castVote = form(voteSchema, async (data, invalid) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, data.stageId),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

  // Battle must be active
  if (currentStage.battle.status !== "active") {
    invalid("Battle is not active");
    return;
  }

  // Stage must be current stage
  if (currentStage.battle.currentStageId !== currentStage.id) {
    invalid("This stage is not active");
    return;
  }

  // Must be in voting phase: submissionDeadline <= now < votingDeadline
  const now = new Date();
  if (now < currentStage.submissionDeadline) {
    invalid("Voting has not started yet");
    return;
  }
  if (now >= currentStage.votingDeadline) {
    invalid("Voting deadline has passed");
    return;
  }

  // Fetch the submission to verify it exists and check ownership
  const targetSubmission = await db.query.submission.findFirst({
    where: eq(submission.id, data.submissionId),
  });

  if (!targetSubmission) error(404, "Submission not found");

  // Can't vote for own submission
  if (targetSubmission.userId === locals.user.id) {
    invalid("Cannot vote for your own submission");
    return;
  }

  // Can only vote once per stage
  const existingVote = await db.query.star.findFirst({
    where: and(
      eq(star.stageId, data.stageId),
      eq(star.voterId, locals.user.id),
    ),
  });

  if (existingVote) {
    invalid("You have already voted in this stage");
    return;
  }

  await db.insert(star).values({
    id: nanoid(8),
    stageId: data.stageId,
    voterId: locals.user.id,
    submissionId: data.submissionId,
    votedAt: Math.floor(Date.now() / 1000),
  });

  return { success: true };
});

export const castVotes = command(castVotesSchema, async (data) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, data.stageId),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

  if (currentStage.battle.status !== "active") {
    error(400, "Battle is not active");
  }

  if (currentStage.battle.currentStageId !== currentStage.id) {
    error(400, "This stage is not active");
  }

  const now = new Date();
  if (now < currentStage.submissionDeadline) {
    error(400, "Voting has not started yet");
  }
  if (now >= currentStage.votingDeadline) {
    error(400, "Voting deadline has passed");
  }

  // Check minimum submissions (4 required)
  const allSubmissions = await db.query.submission.findMany({
    where: eq(submission.stageId, data.stageId),
  });

  if (allSubmissions.length < 4) {
    error(400, "Not enough submissions for voting");
  }

  // Verify all submissions exist and none are user's own
  const targetSubmissions = allSubmissions.filter((s) =>
    data.submissionIds.includes(s.id),
  );

  if (targetSubmissions.length !== 3) {
    error(400, "One or more submissions not found");
  }

  const ownSubmission = targetSubmissions.find(
    (s) => s.userId === locals.user!.id,
  );
  if (ownSubmission) {
    error(400, "Cannot vote for your own submission");
  }

  // Check if already voted
  const existingVotes = await db.query.star.findFirst({
    where: and(
      eq(star.stageId, data.stageId),
      eq(star.voterId, locals.user.id),
    ),
  });

  if (existingVotes) {
    error(400, "You have already voted in this stage");
  }

  // Insert all 3 votes atomically
  const votedAt = Math.floor(Date.now() / 1000);
  await db.transaction(async (tx) => {
    for (const submissionId of data.submissionIds) {
      await tx.insert(star).values({
        id: nanoid(8),
        stageId: data.stageId,
        voterId: locals.user!.id,
        submissionId,
        votedAt,
      });

      await tx
        .update(submission)
        .set({
          starsReceived: sql`COALESCE(${submission.starsReceived}, 0) + 1`,
        })
        .where(eq(submission.id, submissionId));
    }
  });

  return { success: true };
});

export const createPlaylist = command(createPlaylistSchema, async (data) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, data.stageId),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

  // Only battle creator can manually create playlist
  if (currentStage.battle.creatorId !== locals.user.id) {
    error(403, "Only battle creator can create playlist");
  }

  // Battle must be active
  if (currentStage.battle.status !== "active") {
    error(400, "Battle is not active");
  }

  // Only allow during submission phase (before automatic creation)
  if (currentStage.phase !== "submission") {
    error(400, "Playlist can only be created during submission phase");
  }

  const result = await createStagePlaylist(data.stageId);

  if (!result) {
    error(400, "No submissions to create playlist from");
  }

  return { playlistUrl: result.playlistUrl };
});
