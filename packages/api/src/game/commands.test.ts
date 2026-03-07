import { afterEach, expect, test } from "bun:test";
import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";

dotenv.config({
  path: new URL("../../../../apps/web/.env", import.meta.url).pathname,
});

const { db } = await import("@auxchamp/db");
const { game, player, round } = await import("@auxchamp/db/schema/game");
const { user } = await import("@auxchamp/db/schema/auth");
const { addRound, createGame } = await import("@auxchamp/api/game");

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

test("createGame creates a draft game and creator participation", async () => {
  const actor = await createTestUser();

  const result = await createGame(actor.id, {
    name: "Friday night mix",
    description: "Songs for the opener round",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(result.gameId);

  const [createdGame] = await db.select().from(game).where(eq(game.id, result.gameId));
  const [creatorPlayer] = await db
    .select()
    .from(player)
    .where(and(eq(player.gameId, result.gameId), eq(player.userId, actor.id)));

  expect(createdGame).toMatchObject({
    id: result.gameId,
    name: "Friday night mix",
    description: "Songs for the opener round",
    state: "draft",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });
  expect(creatorPlayer).toMatchObject({
    id: result.creatorPlayerId,
    gameId: result.gameId,
    userId: actor.id,
    role: "creator",
    status: "active",
  });
});

test("addRound appends pending rounds in creator order", async () => {
  const actor = await createTestUser();
  const draftGame = await createGame(actor.id, {
    name: "Road trip",
    submissionWindowDays: 5,
    votingWindowDays: 2,
  });

  createdGameIds.add(draftGame.gameId);

  const firstRound = await addRound(actor.id, {
    gameId: draftGame.gameId,
    theme: "Opening credits",
    description: "Set the tone",
  });
  const secondRound = await addRound(actor.id, {
    gameId: draftGame.gameId,
    theme: "Midnight drive",
  });

  const createdRounds = await db.query.round.findMany({
    where: eq(round.gameId, draftGame.gameId),
    orderBy: (round, { asc }) => [asc(round.number)],
  });

  expect(firstRound).toMatchObject({
    gameId: draftGame.gameId,
    number: 1,
    theme: "Opening credits",
  });
  expect(secondRound).toMatchObject({
    gameId: draftGame.gameId,
    number: 2,
    theme: "Midnight drive",
  });
  expect(createdRounds).toMatchObject([
    {
      id: firstRound.roundId,
      gameId: draftGame.gameId,
      number: 1,
      theme: "Opening credits",
      description: "Set the tone",
      phase: "pending",
    },
    {
      id: secondRound.roundId,
      gameId: draftGame.gameId,
      number: 2,
      theme: "Midnight drive",
      description: null,
      phase: "pending",
    },
  ]);
});

test("addRound rejects users who are not the draft creator", async () => {
  const creator = await createTestUser();
  const intruder = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Host picks",
    submissionWindowDays: 4,
    votingWindowDays: 2,
  });

  createdGameIds.add(draftGame.gameId);

  await expect(
    addRound(intruder.id, {
      gameId: draftGame.gameId,
      theme: "Should not land",
    }),
  ).rejects.toThrow("Only the creator can add rounds to a draft game.");

  const createdRounds = await db.query.round.findMany({
    where: eq(round.gameId, draftGame.gameId),
  });

  expect(createdRounds).toHaveLength(0);
});

test("addRound rejects creator writes once the game is active", async () => {
  const creator = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Too late edits",
    submissionWindowDays: 4,
    votingWindowDays: 2,
  });

  createdGameIds.add(draftGame.gameId);

  await db
    .update(game)
    .set({
      state: "active",
    })
    .where(eq(game.id, draftGame.gameId));

  await expect(
    addRound(creator.id, {
      gameId: draftGame.gameId,
      theme: "After the start",
    }),
  ).rejects.toThrow("Only the creator can add rounds to a draft game.");

  const createdRounds = await db.query.round.findMany({
    where: eq(round.gameId, draftGame.gameId),
  });

  expect(createdRounds).toHaveLength(0);
});

async function createTestUser() {
  const id = `user_${crypto.randomUUID()}`;

  createdUserIds.add(id);

  const [createdUser] = await db
    .insert(user)
    .values({
      id,
      name: `Test ${id}`,
      email: `${id}@example.com`,
    })
    .returning();

  if (!createdUser) {
    throw new Error("Failed to create test user.");
  }

  return createdUser;
}
