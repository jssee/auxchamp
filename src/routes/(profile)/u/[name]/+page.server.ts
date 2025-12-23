import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const profile = await db.query.user.findFirst({
    where: eq(user.name, params.name),
    columns: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
    },
  });

  if (!profile) {
    error(404, "User not found");
  }

  return { profile };
};
