import { afterEach, expect, test } from "bun:test";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({
  path: new URL("../../../../apps/web/.env", import.meta.url).pathname,
});

const { db } = await import("@auxchamp/db");
const { game } = await import("@auxchamp/db/schema/game");
const { user } = await import("@auxchamp/db/schema/auth");
const { acceptInvite, addRound, createGame, invitePlayer, startGame, upsertSubmission } =
  await import("./commands");
const { getGameDetail } = await import("./queries");

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

test("returns game metadata, players, and rounds for a draft game", async () => {
  const creator = await createTestUser("Alice");
  const invitee = await createTestUser("Bob");
  const draftGame = await createGame(creator.id, {
    name: "Weekend mix",
    description: "Chill vibes only",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await addRound(creator.id, { gameId: draftGame.gameId, theme: "Openers" });
  await addRound(creator.id, { gameId: draftGame.gameId, theme: "Deep cuts" });
  await invitePlayer(creator.id, { gameId: draftGame.gameId, targetUserId: invitee.id });
  await acceptInvite(invitee.id, { gameId: draftGame.gameId });

  const detail = await getGameDetail(creator.id, draftGame.gameId);

  expect(detail).toMatchObject({
    id: draftGame.gameId,
    name: "Weekend mix",
    description: "Chill vibes only",
    state: "draft",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  expect(detail!.players).toHaveLength(2);
  expect(detail!.players).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        userId: creator.id,
        userName: "Alice",
        role: "creator",
        status: "active",
      }),
      expect.objectContaining({
        userId: invitee.id,
        userName: "Bob",
        role: "player",
        status: "active",
      }),
    ]),
  );

  expect(detail!.rounds).toHaveLength(2);
  expect(detail!.rounds[0]).toMatchObject({ number: 1, theme: "Openers", submissionCount: 0 });
  expect(detail!.rounds[1]).toMatchObject({ number: 2, theme: "Deep cuts", submissionCount: 0 });
});

test("returns activeRound and actorSubmission for an active game", async () => {
  const { gameId, players } = await setupActiveGame();

  await upsertSubmission(players[0]!.id, {
    gameId,
    spotifyTrackUrl: "https://open.spotify.com/track/abc",
    note: "My pick",
  });

  const detail = await getGameDetail(players[0]!.id, gameId);

  expect(detail!.activeRound).toMatchObject({
    number: 1,
    phase: "submitting",
  });
  expect(detail!.actorSubmission).toMatchObject({
    spotifyTrackUrl: "https://open.spotify.com/track/abc",
    note: "My pick",
  });

  // Submission count for round 1 should reflect the one submission
  expect(detail!.rounds[0]!.submissionCount).toBe(1);
});

test("returns null actorSubmission when the actor has not submitted", async () => {
  const { gameId, players } = await setupActiveGame();

  const detail = await getGameDetail(players[0]!.id, gameId);

  expect(detail!.activeRound).not.toBeNull();
  expect(detail!.actorSubmission).toBeNull();
});

test("returns actorPlayer reflecting the actor's participation", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  const creatorDetail = await getGameDetail(creator.id, gameId);
  expect(creatorDetail!.actorPlayer).toMatchObject({ role: "creator", status: "active" });

  const playerDetail = await getGameDetail(players[1]!.id, gameId);
  expect(playerDetail!.actorPlayer).toMatchObject({ role: "player", status: "active" });
});

test("returns null for a non-existent game", async () => {
  const actor = await createTestUser("Ghost");
  const detail = await getGameDetail(actor.id, "nonexistent");
  expect(detail).toBeNull();
});

// -- test helpers ---------------------------------------------------------

async function setupActiveGame() {
  const creator = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Test game",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await addRound(creator.id, { gameId: draftGame.gameId, theme: "Round 1" });

  const players: Awaited<ReturnType<typeof createTestUser>>[] = [];
  for (let i = 0; i < 3; i++) {
    const p = await createTestUser();
    await invitePlayer(creator.id, { gameId: draftGame.gameId, targetUserId: p.id });
    await acceptInvite(p.id, { gameId: draftGame.gameId });
    players.push(p);
  }

  await startGame(creator.id, { gameId: draftGame.gameId });

  return { gameId: draftGame.gameId, creator, players };
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
