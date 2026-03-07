import { afterEach, expect, test } from "bun:test";
import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";

dotenv.config({
  path: new URL("../../../../apps/web/.env", import.meta.url).pathname,
});

const { db } = await import("@auxchamp/db");
const { game, player, round, submission } = await import("@auxchamp/db/schema/game");
const { user } = await import("@auxchamp/db/schema/auth");
const { acceptInvite, addRound, createGame, invitePlayer, startGame, upsertSubmission } =
  await import("./commands");

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

// -- invitePlayer ---------------------------------------------------------

test("invitePlayer creates an invited player row", async () => {
  const creator = await createTestUser();
  const invitee = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Invite test",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  const result = await invitePlayer(creator.id, {
    gameId: draftGame.gameId,
    targetUserId: invitee.id,
  });

  const [invitedPlayer] = await db
    .select()
    .from(player)
    .where(and(eq(player.gameId, draftGame.gameId), eq(player.userId, invitee.id)));

  expect(result).toMatchObject({
    playerId: expect.any(String),
    gameId: draftGame.gameId,
    userId: invitee.id,
    status: "invited",
  });
  expect(invitedPlayer).toMatchObject({
    role: "player",
    status: "invited",
  });
});

test("invitePlayer rejects non-creator", async () => {
  const creator = await createTestUser();
  const other = await createTestUser();
  const target = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Non-creator invite",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await expect(
    invitePlayer(other.id, {
      gameId: draftGame.gameId,
      targetUserId: target.id,
    }),
  ).rejects.toThrow("Only the creator can invite players to a draft game.");
});

test("invitePlayer rejects duplicate invite", async () => {
  const creator = await createTestUser();
  const invitee = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Duplicate invite",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await invitePlayer(creator.id, {
    gameId: draftGame.gameId,
    targetUserId: invitee.id,
  });

  await expect(
    invitePlayer(creator.id, {
      gameId: draftGame.gameId,
      targetUserId: invitee.id,
    }),
  ).rejects.toThrow("Player is already in this game.");
});

test("invitePlayer rejects invite to non-draft game", async () => {
  const creator = await createTestUser();
  const invitee = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Active game invite",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await db.update(game).set({ state: "active" }).where(eq(game.id, draftGame.gameId));

  await expect(
    invitePlayer(creator.id, {
      gameId: draftGame.gameId,
      targetUserId: invitee.id,
    }),
  ).rejects.toThrow("Only the creator can invite players to a draft game.");
});

// -- acceptInvite ---------------------------------------------------------

test("acceptInvite activates an invited player", async () => {
  const creator = await createTestUser();
  const invitee = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Accept test",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await invitePlayer(creator.id, {
    gameId: draftGame.gameId,
    targetUserId: invitee.id,
  });

  const result = await acceptInvite(invitee.id, { gameId: draftGame.gameId });

  const [acceptedPlayer] = await db
    .select()
    .from(player)
    .where(and(eq(player.gameId, draftGame.gameId), eq(player.userId, invitee.id)));

  expect(result).toMatchObject({
    gameId: draftGame.gameId,
    userId: invitee.id,
    status: "active",
  });
  expect(acceptedPlayer).toMatchObject({
    status: "active",
    joinedAt: expect.any(Date),
  });
});

test("acceptInvite rejects if no pending invite", async () => {
  const stranger = await createTestUser();
  const creator = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "No invite",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await expect(acceptInvite(stranger.id, { gameId: draftGame.gameId })).rejects.toThrow(
    "No pending invite found.",
  );
});

test("acceptInvite rejects if already active", async () => {
  const creator = await createTestUser();
  const invitee = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Already accepted",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  await invitePlayer(creator.id, {
    gameId: draftGame.gameId,
    targetUserId: invitee.id,
  });
  await acceptInvite(invitee.id, { gameId: draftGame.gameId });

  await expect(acceptInvite(invitee.id, { gameId: draftGame.gameId })).rejects.toThrow(
    "No pending invite found.",
  );
});

// -- startGame ------------------------------------------------------------

test("startGame activates a valid draft and opens round 1", async () => {
  const { gameId, creator } = await setupLobby();

  const result = await startGame(creator.id, { gameId });

  const [startedGame] = await db.select().from(game).where(eq(game.id, gameId));
  const [firstRound] = await db
    .select()
    .from(round)
    .where(and(eq(round.gameId, gameId), eq(round.number, 1)));

  expect(result).toMatchObject({ gameId, state: "active" });
  expect(startedGame).toMatchObject({ state: "active" });
  expect(startedGame!.startedAt).toBeInstanceOf(Date);
  expect(firstRound).toMatchObject({ phase: "submitting" });
  expect(firstRound!.submissionOpensAt).toBeInstanceOf(Date);
  expect(firstRound!.submissionClosesAt).toBeInstanceOf(Date);
});

test("startGame rejects non-creator", async () => {
  const { gameId, players } = await setupLobby();

  await expect(startGame(players[0]!.id, { gameId })).rejects.toThrow(
    "Only the creator can start a draft game.",
  );
});

test("startGame rejects game with no rounds", async () => {
  const { gameId, creator } = await setupLobby({ rounds: 0 });

  await expect(startGame(creator.id, { gameId })).rejects.toThrow(
    "Game must have at least one round.",
  );
});

test("startGame rejects game with fewer than four active players", async () => {
  const { gameId, creator } = await setupLobby({ playerCount: 2 });

  await expect(startGame(creator.id, { gameId })).rejects.toThrow(
    "Game must have at least four active players.",
  );
});

test("startGame rejects non-draft game", async () => {
  const { gameId, creator } = await setupLobby();

  await db.update(game).set({ state: "active" }).where(eq(game.id, gameId));

  await expect(startGame(creator.id, { gameId })).rejects.toThrow(
    "Only the creator can start a draft game.",
  );
});

// -- upsertSubmission -----------------------------------------------------

test("upsertSubmission creates a submission for the active round", async () => {
  const { gameId, players } = await setupActiveGame();

  const result = await upsertSubmission(players[0]!.id, {
    gameId,
    spotifyTrackUrl: "https://open.spotify.com/track/abc123",
    note: "Great opener",
  });

  expect(result).toMatchObject({
    gameId,
    spotifyTrackUrl: "https://open.spotify.com/track/abc123",
    note: "Great opener",
  });

  const [created] = await db
    .select()
    .from(submission)
    .where(eq(submission.id, result.submissionId));

  expect(created).toMatchObject({
    spotifyTrackUrl: "https://open.spotify.com/track/abc123",
    note: "Great opener",
  });
});

test("upsertSubmission updates an existing submission", async () => {
  const { gameId, players } = await setupActiveGame();

  await upsertSubmission(players[0]!.id, {
    gameId,
    spotifyTrackUrl: "https://open.spotify.com/track/first",
  });

  const result = await upsertSubmission(players[0]!.id, {
    gameId,
    spotifyTrackUrl: "https://open.spotify.com/track/revised",
    note: "Changed my mind",
  });

  expect(result).toMatchObject({
    spotifyTrackUrl: "https://open.spotify.com/track/revised",
    note: "Changed my mind",
  });

  const playerSubmissions = await db
    .select()
    .from(submission)
    .where(eq(submission.playerId, result.playerId));

  expect(playerSubmissions).toHaveLength(1);
});

test("upsertSubmission rejects non-active player", async () => {
  const { gameId } = await setupActiveGame();
  const outsider = await createTestUser();

  await expect(
    upsertSubmission(outsider.id, {
      gameId,
      spotifyTrackUrl: "https://open.spotify.com/track/nope",
    }),
  ).rejects.toThrow("Only active players can submit.");
});

test("upsertSubmission rejects when no round is accepting submissions", async () => {
  const { gameId, players } = await setupActiveGame();

  // Close the submission round
  await db
    .update(round)
    .set({ phase: "voting" })
    .where(and(eq(round.gameId, gameId), eq(round.number, 1)));

  await expect(
    upsertSubmission(players[0]!.id, {
      gameId,
      spotifyTrackUrl: "https://open.spotify.com/track/late",
    }),
  ).rejects.toThrow("No round is currently accepting submissions.");
});

test("upsertSubmission rejects when submission window has closed", async () => {
  const { gameId, players } = await setupActiveGame();

  // Set submissionClosesAt to the past
  await db
    .update(round)
    .set({ submissionClosesAt: new Date("2020-01-01") })
    .where(and(eq(round.gameId, gameId), eq(round.number, 1)));

  await expect(
    upsertSubmission(players[0]!.id, {
      gameId,
      spotifyTrackUrl: "https://open.spotify.com/track/expired",
    }),
  ).rejects.toThrow("The submission window has closed.");
});

// -- test helpers ---------------------------------------------------------

/** Create a draft game with a lobby of accepted players. */
async function setupLobby({ playerCount = 3, rounds = 1 } = {}) {
  const creator = await createTestUser();
  const draftGame = await createGame(creator.id, {
    name: "Test game",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });

  createdGameIds.add(draftGame.gameId);

  for (let i = 0; i < rounds; i++) {
    await addRound(creator.id, {
      gameId: draftGame.gameId,
      theme: `Round ${i + 1}`,
    });
  }

  const players: Awaited<ReturnType<typeof createTestUser>>[] = [];
  for (let i = 0; i < playerCount; i++) {
    const p = await createTestUser();
    await invitePlayer(creator.id, {
      gameId: draftGame.gameId,
      targetUserId: p.id,
    });
    await acceptInvite(p.id, { gameId: draftGame.gameId });
    players.push(p);
  }

  return { gameId: draftGame.gameId, creator, players };
}

/** Create a started game with round 1 open for submissions. */
async function setupActiveGame() {
  const lobby = await setupLobby();
  await startGame(lobby.creator.id, { gameId: lobby.gameId });
  return lobby;
}

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
