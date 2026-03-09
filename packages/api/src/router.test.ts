import { afterEach, expect, test } from "bun:test";
import { createRouterClient } from "@orpc/server";
import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";

dotenv.config({
  path: new URL("../../../apps/web/.env", import.meta.url).pathname,
});

const { appRouter } = await import("./router");
const { db } = await import("@auxchamp/db");
const { game, player, submission } = await import("@auxchamp/db/schema/game");
const { user } = await import("@auxchamp/db/schema/auth");
const { acceptInvite, addRound, createGame, invitePlayer, startGame } = await import("./mutation");

const createdGameIds = new Set<string>();
const createdUserIds = new Set<string>();

afterEach(async () => {
  for (const gameId of createdGameIds) {
    await db.delete(game).where(eq(game.id, gameId));
  }
  createdGameIds.clear();

  for (const userId of createdUserIds) {
    await db.delete(user).where(eq(user.id, userId));
  }
  createdUserIds.clear();
});

test("top-level saveSubmission rejects non-track Spotify URLs at the procedure boundary", async () => {
  const { gameId, submitter } = await setupActiveGame();
  const api = createRouterClient(appRouter, {
    context: () =>
      ({
        session: {
          user: {
            id: submitter.id,
          },
        },
      }) as any,
  });

  await expect(
    api.saveSubmission({
      gameId,
      spotifyTrackUrl: "https://open.spotify.com/album/abc123",
    }),
  ).rejects.toMatchObject({
    code: "BAD_REQUEST",
    status: 400,
    message: "Input validation failed",
  });

  const [submitterPlayer] = await db
    .select({ id: player.id })
    .from(player)
    .where(and(eq(player.gameId, gameId), eq(player.userId, submitter.id)))
    .limit(1);

  const createdSubmissions = submitterPlayer
    ? await db.select().from(submission).where(eq(submission.playerId, submitterPlayer.id))
    : [];

  expect(createdSubmissions).toHaveLength(0);
});

async function setupActiveGame() {
  const creator = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Procedure test game",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await addRound(creator.id, { gameId: draftGame.gameId, theme: "Round 1" });

  const players: Awaited<ReturnType<typeof createTestUser>>[] = [];
  for (let i = 0; i < 3; i++) {
    const nextPlayer = await createTestUser();
    await invitePlayer(creator.id, {
      gameId: draftGame.gameId,
      targetUserId: nextPlayer.id,
    });
    await acceptInvite(nextPlayer.id, { gameId: draftGame.gameId });
    players.push(nextPlayer);
  }

  await startGame(creator.id, { gameId: draftGame.gameId });

  return { gameId: draftGame.gameId, creator, submitter: players[0]! };
}

async function createTestUser(name?: string) {
  const id = `user_${crypto.randomUUID()}`;

  createdUserIds.add(id);

  const [createdUser] = await db
    .insert(user)
    .values({
      id,
      name: name ?? `Test ${id}`,
      email: `${id}@example.com`,
    })
    .returning();

  if (!createdUser) {
    throw new Error("Failed to create test user.");
  }

  return createdUser;
}
