import { error, redirect } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";

import { db } from "$lib/server/db";
import { stage, submission, star } from "$lib/server/db/schema";
import { isParticipant } from "$lib/server/access";
import {
  computeStageRules,
  shouldShowOtherSubmissions,
} from "$lib/server/rules/stage";
import { assignRanks } from "$lib/utils/format";
import type { PageServerLoad } from "./$types";

type SubmissionWithUser = Awaited<
  ReturnType<typeof db.query.submission.findMany<{ with: { user: true } }>>
>[number];

type Voter = { id: string; name: string | null };

async function getVoteResults(
  shouldFetch: boolean,
  stageId: string,
  submissions: SubmissionWithUser[],
): Promise<
  Array<{
    submission: SubmissionWithUser;
    starsReceived: number;
    voters: Voter[];
    rank: number;
  }>
> {
  if (!shouldFetch) return [];

  const allStars = await db.query.star.findMany({
    where: eq(star.stageId, stageId),
    with: { voter: true },
  });

  const starsBySubmission = Map.groupBy(allStars, (s) => s.submissionId);

  const withScores = submissions
    .map((sub) => ({
      submission: sub,
      starsReceived: sub.starsReceived || 0,
      voters: (starsBySubmission.get(sub.id) || []).map((s) => ({
        id: s.voter.id,
        name: s.voter.name,
      })),
    }))
    .sort((a, b) => b.starsReceived - a.starsReceived);

  return assignRanks(withScores, (item) => item.starsReceived);
}

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/signin");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, params.id),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

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

  const showOtherSubmissions = shouldShowOtherSubmissions(currentStage.phase);

  const otherSubmissions = showOtherSubmissions
    ? (
        await db.query.submission.findMany({
          where: eq(submission.stageId, params.id),
          with: { user: true },
        })
      ).filter((s) => s.user !== null)
    : [];

  const userVotes = await db.query.star.findMany({
    where: and(eq(star.stageId, params.id), eq(star.voterId, locals.user.id)),
  });

  const now = new Date();

  const rules = computeStageRules({
    stage: currentStage,
    user: locals.user,
    now,
    userSubmissions,
    otherSubmissions,
    userVotes,
  });

  const voteResults = await getVoteResults(
    rules.hasVoted || currentStage.phase === "closed",
    params.id,
    otherSubmissions,
  );

  return {
    stage: currentStage,
    battle: currentStage.battle,
    userSubmissions,
    otherSubmissions,
    canSubmit: rules.canSubmit,
    maxSubmissions: rules.maxSubmissions,
    user: locals.user,
    isCreator: rules.isCreator,
    canCreatePlaylist: rules.canCreatePlaylist,
    // Voting data
    hasVoted: rules.hasVoted,
    votedSubmissionIds: rules.votedSubmissionIds,
    canVote: rules.canVote,
    voteResults,
    votableSubmissions: rules.votableSubmissions,
  };
};
