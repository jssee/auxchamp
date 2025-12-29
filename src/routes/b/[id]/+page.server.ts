import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

import { db } from "$lib/server/db";
import { battle } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const result = await db.query.battle.findFirst({
    where: eq(battle.id, params.id),
  });

  if (!result) error(404, "Battle not found");

  return {
    battle: result,
    user: locals.user,
  };
};
