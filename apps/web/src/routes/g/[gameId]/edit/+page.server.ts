import { redirect } from "@sveltejs/kit";

export const load = async ({ parent }) => {
  const { game } = await parent();

  if (game.actorPlayer.role !== "creator") {
    redirect(303, `/g/${game.id}`);
  }
};
