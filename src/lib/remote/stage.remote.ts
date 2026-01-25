import { error } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { command, form, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import { stage, submission, star } from "$lib/server/db/schema";
import { createStagePlaylist } from "$lib/server/spotify";
import { computeStageRules } from "$lib/server/rules/stage";
import {
  submitSchema,
  voteSchema,
  castVotesSchema,
  createPlaylistSchema,
} from "$lib/schemas/stage";

type StageWithBattle = NonNullable<
  Awaited<ReturnType<typeof db.query.stage.findFirst<{ with: { battle: true } }>>>
>;

/** Validates battle is active and stage is current. Returns error message or null. */
function validateStageActive(currentStage: StageWithBattle): string | null {
  if (currentStage.battle.status !== "active") {
    return "Battle is not active";
  }
  if (currentStage.battle.currentStageId !== currentStage.id) {
    return "This stage is not active";
  }
  return null;
}

export const submitTrack = form(submitSchema, async (data, invalid) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, data.stageId),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

  const stageError = validateStageActive(currentStage);
  if (stageError) {
    invalid(stageError);
    return;
  }

  const userSubmissions = await db.query.submission.findMany({
    where: and(
      eq(submission.stageId, data.stageId),
      eq(submission.userId, locals.user.id),
    ),
  });

  const rules = computeStageRules({
    stage: currentStage,
    user: locals.user,
    now: new Date(),
    userSubmissions,
    otherSubmissions: [],
    userVotes: [],
  });

  if (!rules.canSubmit) {
    invalid(`Maximum ${rules.maxSubmissions} submission(s) allowed`);
    return;
  }

  await db.insert(submission).values({
    id: nanoid(8),
    stageId: data.stageId,
    userId: locals.user.id,
    spotifyUrl: data.spotifyUrl,
    submissionOrder: userSubmissions.length + 1,
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

  const stageError = validateStageActive(currentStage);
  if (stageError) {
    invalid(stageError);
    return;
  }

  // Fetch submission to verify it exists and check ownership
  const targetSubmission = await db.query.submission.findFirst({
    where: eq(submission.id, data.submissionId),
  });

  if (!targetSubmission) error(404, "Submission not found");

  if (targetSubmission.userId === locals.user.id) {
    invalid("Cannot vote for your own submission");
    return;
  }

  const userVotes = await db.query.star.findMany({
    where: and(eq(star.stageId, data.stageId), eq(star.voterId, locals.user.id)),
  });

  const rules = computeStageRules({
    stage: currentStage,
    user: locals.user,
    now: new Date(),
    userSubmissions: [],
    otherSubmissions: [targetSubmission],
    userVotes,
  });

  if (!rules.inVotingPhase) {
    invalid("Voting is not open");
    return;
  }

  if (rules.hasVoted) {
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

  const stageError = validateStageActive(currentStage);
  if (stageError) {
    return { error: stageError };
  }

  const allSubmissions = await db.query.submission.findMany({
    where: eq(submission.stageId, data.stageId),
  });

  const userVotes = await db.query.star.findMany({
    where: and(eq(star.stageId, data.stageId), eq(star.voterId, locals.user.id)),
  });

  const rules = computeStageRules({
    stage: currentStage,
    user: locals.user,
    now: new Date(),
    userSubmissions: [],
    otherSubmissions: allSubmissions,
    userVotes,
  });

  if (!rules.inVotingPhase) {
    return { error: "Voting is not open" };
  }

  if (rules.hasVoted) {
    return { error: "You have already voted in this stage" };
  }

  if (!rules.canVote) {
    return { error: "Not enough submissions for voting" };
  }

  // Verify all target submissions exist and none are user's own
  const targetSubmissions = allSubmissions.filter((s) =>
    data.submissionIds.includes(s.id),
  );

  if (targetSubmissions.length !== 3) {
    return { error: "One or more submissions not found" };
  }

  const ownSubmission = targetSubmissions.find(
    (s) => s.userId === locals.user!.id,
  );
  if (ownSubmission) {
    return { error: "Cannot vote for your own submission" };
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

  if (currentStage.battle.status !== "active") {
    error(400, "Battle is not active");
  }

  const rules = computeStageRules({
    stage: currentStage,
    user: locals.user,
    now: new Date(),
    userSubmissions: [],
    otherSubmissions: [],
    userVotes: [],
  });

  if (!rules.isCreator) {
    error(403, "Only battle creator can create playlist");
  }

  if (!rules.canCreatePlaylist) {
    error(400, "Playlist can only be created during submission phase");
  }

  const result = await createStagePlaylist(data.stageId);

  if (!result) {
    error(400, "No submissions to create playlist from");
  }

  return { playlistUrl: result.playlistUrl };
});
