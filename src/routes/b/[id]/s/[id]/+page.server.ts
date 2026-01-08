import { error, redirect } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";

import { db } from "$lib/server/db";
import { stage, submission, player } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/signin");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, params.id),
    with: { battle: true },
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

  const userSubmissions = await db.query.submission.findMany({
    where: and(
      eq(submission.stageId, params.id),
      eq(submission.userId, locals.user.id),
    ),
  });

  const showOtherSubmissions =
    currentStage.phase === "voting" || currentStage.phase === "closed";

  const otherSubmissions = showOtherSubmissions
    ? await db.query.submission.findMany({
        where: eq(submission.stageId, params.id),
        with: { user: true },
      })
    : [];

  const maxSubmissions = currentStage.battle.doubleSubmissions ? 2 : 1;
  const now = new Date();
  const canSubmit =
    currentStage.phase === "submission" &&
    now < currentStage.submissionDeadline &&
    userSubmissions.length < maxSubmissions;

  return {
    stage: currentStage,
    battle: currentStage.battle,
    userSubmissions,
    otherSubmissions,
    canSubmit,
    maxSubmissions,
    user: locals.user,
  };
};
