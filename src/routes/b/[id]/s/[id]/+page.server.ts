import { error, redirect } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";

import { db } from "$lib/server/db";
import { stage, submission, star } from "$lib/server/db/schema";
import { isParticipant } from "$lib/server/access";
import { assignRanks } from "$lib/utils/format";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/signin");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, params.id),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

  const isCreator = currentStage.battle.creatorId === locals.user.id;
  const participant = await isParticipant(
    locals.user.id,
    currentStage.battleId,
    currentStage.battle.creatorId,
  );

  if (!participant) error(403, "Not a participant in this battle");

  const userSubmissions = await db.query.submission.findMany({
    where: and(
      eq(submission.stageId, params.id),
      eq(submission.userId, locals.user.id),
    ),
  });

  const showOtherSubmissions =
    currentStage.phase === "voting" || currentStage.phase === "closed";

  const otherSubmissions = showOtherSubmissions
    ? (
        await db.query.submission.findMany({
          where: eq(submission.stageId, params.id),
          with: { user: true },
        })
      ).filter((s) => s.user !== null)
    : [];

  // Voting eligibility
  const userVotes = await db.query.star.findMany({
    where: and(eq(star.stageId, params.id), eq(star.voterId, locals.user.id)),
  });

  const hasVoted = userVotes.length > 0;
  const votedSubmissionIds = userVotes.map((v) => v.submissionId);

  const submissionCount = otherSubmissions.length;
  const votableSubmissions = otherSubmissions.filter(
    (s) => s.userId !== locals.user!.id,
  );

  const now = new Date();
  const inVotingPhase =
    currentStage.phase === "voting" ||
    (now >= currentStage.submissionDeadline &&
      now < currentStage.votingDeadline);

  const canVote =
    inVotingPhase &&
    !hasVoted &&
    submissionCount >= 4 &&
    votableSubmissions.length >= 3;

  // Vote results (only if user voted or stage closed)
  let voteResults: Array<{
    submission: (typeof otherSubmissions)[0];
    starsReceived: number;
    rank: number;
    voters: Array<{ id: string; name: string | null }>;
  }> = [];

  if (hasVoted || currentStage.phase === "closed") {
    const allStars = await db.query.star.findMany({
      where: eq(star.stageId, params.id),
      with: { voter: true },
    });

    const starsBySubmission = new Map<string, typeof allStars>();
    for (const s of allStars) {
      const existing = starsBySubmission.get(s.submissionId) || [];
      existing.push(s);
      starsBySubmission.set(s.submissionId, existing);
    }

    const withScores = otherSubmissions
      .map((sub) => ({
        submission: sub,
        starsReceived: sub.starsReceived || 0,
        voters: (starsBySubmission.get(sub.id) || []).map((s) => ({
          id: s.voter.id,
          name: s.voter.name,
        })),
      }))
      .sort((a, b) => b.starsReceived - a.starsReceived);

    voteResults = assignRanks(withScores, (item) => item.starsReceived);
  }

  const maxSubmissions = currentStage.battle.doubleSubmissions ? 2 : 1;
  const canSubmit =
    currentStage.phase === "submission" &&
    now < currentStage.submissionDeadline &&
    userSubmissions.length < maxSubmissions;

  const canCreatePlaylist =
    isCreator &&
    currentStage.phase === "submission" &&
    !currentStage.spotifyPlaylistId;

  return {
    stage: currentStage,
    battle: currentStage.battle,
    userSubmissions,
    otherSubmissions,
    canSubmit,
    maxSubmissions,
    user: locals.user,
    isCreator,
    canCreatePlaylist,
    // Voting data
    hasVoted,
    votedSubmissionIds,
    canVote,
    voteResults,
    votableSubmissions,
  };
};
