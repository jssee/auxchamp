import { error, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

import { db } from "$lib/server/db";
import { battle } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/signin");

  const result = await db.query.battle.findFirst({
    where: eq(battle.id, params.id),
  });

  if (!result) error(404, "Battle not found");
  if (result.creatorId !== locals.user.id) error(403, "Not authorized");
  if (result.status === "cancelled") redirect(302, `/b/${params.id}`);

  return {
    battle: result,
  };
};
