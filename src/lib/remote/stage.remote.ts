import { error } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";

import { form, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import { battle, stage, submission, star } from "$lib/server/db/schema";

const submitSchema = v.object({
  stageId: v.string(),
  spotifyUrl: v.pipe(v.string(), v.url()),
});

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
  });

  return { success: true };
});

const voteSchema = v.object({
  stageId: v.string(),
  submissionId: v.string(),
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
