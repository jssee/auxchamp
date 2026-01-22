import { error, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";

import { db } from "$lib/server/db";
import { stage, star, submission } from "$lib/server/db/schema";
import { isParticipant } from "$lib/server/access";
import { assignRanks } from "$lib/utils/format";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/signin");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, params.id),
    with: { battle: { with: { stages: true } } },
  });

  if (!currentStage) error(404, "Stage not found");

  const participant = await isParticipant(
    locals.user.id,
    currentStage.battleId,
    currentStage.battle.creatorId,
  );

  if (!participant) error(403, "Not a participant in this battle");

  const userVoted = await db.query.star.findFirst({
    where: and(eq(star.stageId, params.id), eq(star.voterId, locals.user.id)),
  });

  if (!userVoted && currentStage.phase !== "closed") {
    redirect(302, `/b/${currentStage.battleId}/s/${params.id}`);
  }

  const [submissions, allStars] = await Promise.all([
    db.query.submission.findMany({
      where: eq(submission.stageId, params.id),
      with: { user: true },
    }),
    db.query.star.findMany({
      where: eq(star.stageId, params.id),
      with: { voter: true },
    }),
  ]);

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

  const results = assignRanks(withScores, (item) => item.starsReceived);

  const sortedStages = currentStage.battle.stages.toSorted(
    (a, b) => a.stageNumber - b.stageNumber,
  );
  const currentIndex = sortedStages.findIndex((s) => s.id === params.id);
  const prevStage = sortedStages[currentIndex - 1] ?? null;
  const nextStage = sortedStages[currentIndex + 1] ?? null;

  return {
    stage: currentStage,
    battle: currentStage.battle,
    results,
    prevStage,
    nextStage,
  };
};
