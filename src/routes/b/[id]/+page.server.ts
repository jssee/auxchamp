import { error } from "@sveltejs/kit";
import { eq, desc } from "drizzle-orm";

import { db } from "$lib/server/db";
import { battle, player } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const result = await db.query.battle.findFirst({
    where: eq(battle.id, params.id),
    with: { stages: true },
  });

  if (!result) error(404, "Battle not found");

  const sortedStages = result.stages.sort(
    (a, b) => a.stageNumber - b.stageNumber,
  );

  // Check if any stages are closed (results available)
  const hasClosedStages = sortedStages.some((s) => s.phase === "closed");

  // Get standings if stages have closed
  let standings: Array<{
    rank: number;
    user: { id: string; name: string | null; image: string | null };
    totalStarsEarned: number;
    stagesWon: number;
  }> = [];

  if (hasClosedStages) {
    const players = await db.query.player.findMany({
      where: eq(player.battleId, params.id),
      with: { user: true },
      orderBy: [desc(player.totalStarsEarned), desc(player.stagesWon)],
    });

    let currentRank = 1;
    let previousStars = -1;
    let previousWins = -1;

    standings = players.map((p, index) => {
      const stars = p.totalStarsEarned || 0;
      const wins = p.stagesWon || 0;

      if (stars !== previousStars || wins !== previousWins) {
        currentRank = index + 1;
        previousStars = stars;
        previousWins = wins;
      }

      return {
        rank: currentRank,
        user: {
          id: p.user.id,
          name: p.user.name,
          image: p.user.image,
        },
        totalStarsEarned: stars,
        stagesWon: wins,
      };
    });
  }

  return {
    battle: result,
    stages: sortedStages,
    user: locals.user,
    standings,
    hasClosedStages,
  };
};
