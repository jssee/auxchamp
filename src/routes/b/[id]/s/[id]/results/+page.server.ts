import { error, redirect } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";

import { db } from "$lib/server/db";
import { stage, submission, player, star } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/signin");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, params.id),
    with: { battle: { with: { stages: true } } },
  });

  if (!currentStage) error(404, "Stage not found");

  const isCreator = currentStage.battle.creatorId === locals.user.id;
  const isPlayer = isCreator
    ? true
    : await db.query.player
        .findFirst({
          where: and(
            eq(player.battleId, currentStage.battleId),
            eq(player.userId, locals.user.id),
          ),
        })
        .then((p) => !!p);

  if (!isPlayer) error(403, "Not a participant in this battle");

  // Check if user can view results
  const userVoted = await db.query.star.findFirst({
    where: and(eq(star.stageId, params.id), eq(star.voterId, locals.user.id)),
  });

  const canViewResults = !!userVoted || currentStage.phase === "closed";

  if (!canViewResults) {
    redirect(302, `/b/${currentStage.battleId}/s/${params.id}`);
  }

  // Get all submissions with user info
  const submissions = await db.query.submission.findMany({
    where: eq(submission.stageId, params.id),
    with: { user: true },
  });

  // Get all stars with voter info
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

  const ranked = submissions
    .map((sub) => ({
      submission: sub,
      starsReceived: sub.starsReceived || 0,
      voters: (starsBySubmission.get(sub.id) || []).map((s) => ({
        id: s.voter.id,
        name: s.voter.name,
      })),
    }))
    .sort((a, b) => b.starsReceived - a.starsReceived);

  let currentRank = 1;
  let previousStars = -1;
  const results = ranked.map((item, index) => {
    if (item.starsReceived !== previousStars) {
      currentRank = index + 1;
      previousStars = item.starsReceived;
    }
    return { ...item, rank: currentRank };
  });

  // Navigation
  const sortedStages = currentStage.battle.stages.sort(
    (a, b) => a.stageNumber - b.stageNumber,
  );
  const currentIndex = sortedStages.findIndex((s) => s.id === params.id);
  const prevStage = currentIndex > 0 ? sortedStages[currentIndex - 1] : null;
  const nextStage =
    currentIndex < sortedStages.length - 1
      ? sortedStages[currentIndex + 1]
      : null;

  return {
    stage: currentStage,
    battle: currentStage.battle,
    results,
    prevStage,
    nextStage,
  };
};
