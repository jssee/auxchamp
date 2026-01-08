import { error } from "@sveltejs/kit";
import { eq, asc } from "drizzle-orm";

import { db } from "$lib/server/db";
import { battle, stage } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const result = await db.query.battle.findFirst({
    where: eq(battle.id, params.id),
    with: { stages: true },
  });

  if (!result) error(404, "Battle not found");

  const sortedStages = result.stages.sort((a, b) => a.stageNumber - b.stageNumber);

  return {
    battle: result,
    stages: sortedStages,
    user: locals.user,
  };
};
