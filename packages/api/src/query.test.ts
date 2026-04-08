import { afterEach, expect, test } from "bun:test";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({
  path: new URL("../../../apps/web/.env", import.meta.url).pathname,
});

const { db } = await import("@auxchamp/db");
const { game } = await import("@auxchamp/db/schema/game");
const { user } = await import("@auxchamp/db/schema/auth");
const {
  acceptInvite,
  addRound,
  advanceRound,
  createGame,
  invitePlayer,
  saveBallot,
  startGame,
  saveSubmission,
} = await import("./mutation");
const { getGame, getPublicProfile, getRound } = await import("./query");

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

test("returns a public profile by username", async () => {
  const profileOwner = await createTestUser("Alice");

  const profile = await getPublicProfile(profileOwner.username);

  expect(profile).toMatchObject({
    id: profileOwner.id,
    username: profileOwner.username,
    displayUsername: profileOwner.displayUsername,
    name: "Alice",
  });
});

test("normalizes username lookup for public profiles", async () => {
  const profileOwner = await createTestUser("Alice");

  const profile = await getPublicProfile(profileOwner.username.toUpperCase());

  expect(profile).toMatchObject({
    id: profileOwner.id,
    username: profileOwner.username,
  });
});

test("returns null for a missing public profile", async () => {
  const profile = await getPublicProfile("missing_user");

  expect(profile).toBeNull();
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
  await invitePlayer(creator.id, {
    gameId: draftGame.gameId,
    targetUserId: invitee.id,
  });
  await acceptInvite(invitee.id, { gameId: draftGame.gameId });

  const detail = await getGame(creator.id, draftGame.gameId);

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
  expect(detail!.rounds[0]).toMatchObject({
    number: 1,
    theme: "Openers",
    submissionCount: 0,
  });
  expect(detail!.rounds[1]).toMatchObject({
    number: 2,
    theme: "Deep cuts",
    submissionCount: 0,
  });
});

test("returns submission count for an active game round", async () => {
  const { gameId, players } = await setupActiveGame();

  await saveSubmission(players[0]!.id, {
    gameId,
    spotifyTrackUrl: "https://open.spotify.com/track/abc",
    note: "My pick",
  });

  const detail = await getGame(players[0]!.id, gameId);
  expect(detail!.rounds[0]!.submissionCount).toBe(1);
});

test("returns actorPlayer reflecting the actor's participation", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  const creatorDetail = await getGame(creator.id, gameId);
  expect(creatorDetail!.actorPlayer).toMatchObject({
    role: "creator",
    status: "active",
  });

  const playerDetail = await getGame(players[1]!.id, gameId);
  expect(playerDetail!.actorPlayer).toMatchObject({
    role: "player",
    status: "active",
  });
});

test("returns null for a non-existent game", async () => {
  const actor = await createTestUser("Ghost");
  const detail = await getGame(actor.id, "nonexistent");
  expect(detail).toBeNull();
});

test("returns null for a non-member", async () => {
  const { gameId } = await setupActiveGame();
  const outsider = await createTestUser("Outsider");
  const detail = await getGame(outsider.id, gameId);
  expect(detail).toBeNull();
});

test("returns roundResults and standings after scoring", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  const allPlayers = [creator, ...players];
  for (let i = 0; i < allPlayers.length; i++) {
    await saveSubmission(allPlayers[i]!.id, {
      gameId,
      spotifyTrackUrl: `https://open.spotify.com/track/t${i}`,
    });
  }

  await advanceRound(creator.id, { gameId }); // submitting → voting

  // All players vote (use getRound to get voting submissions).
  const preScoreDetail = await getGame(creator.id, gameId);
  const roundId = preScoreDetail!.rounds[0]!.id;

  for (const voter of allPlayers) {
    const roundDetail = await getRound(voter.id, gameId, roundId);
    const subs = roundDetail!.votingSubmissions!;
    const targets = subs
      .filter((s) => s.playerId !== roundDetail!.actorPlayer.id)
      .slice(0, 3);
    await saveBallot(voter.id, {
      gameId,
      submissionIds: targets.map((t) => t.id),
    });
  }

  await advanceRound(creator.id, { gameId }); // voting → scored

  const scored = await getGame(creator.id, gameId);

  expect(scored!.roundResults).toHaveLength(1);
  expect(scored!.roundResults[0]!.roundNumber).toBe(1);
  expect(scored!.roundResults[0]!.submissions.length).toBe(allPlayers.length);

  // Each submission should have a starCount >= 0.
  for (const sub of scored!.roundResults[0]!.submissions) {
    expect(sub.starCount).toBeGreaterThanOrEqual(0);
    expect(sub.submissionId).toBeTypeOf("string");
    expect(sub.playerId).toBeTypeOf("string");
  }

  // Results should be sorted by starCount descending.
  const counts = scored!.roundResults[0]!.submissions.map((s) => s.starCount);
  for (let i = 1; i < counts.length; i++) {
    expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]!);
  }

  // Standings should cover all players.
  expect(scored!.standings.length).toBeGreaterThan(0);
  const totalStars = scored!.standings.reduce(
    (sum, s) => sum + s.totalStars,
    0,
  );
  // Each voter gives 3 stars, so total = playerCount * 3.
  expect(totalStars).toBe(allPlayers.length * 3);
});

// -- getRound tests -------------------------------------------------------

test("getRound returns null for a non-existent game", async () => {
  const actor = await createTestUser("Ghost");
  const result = await getRound(actor.id, "nonexistent", "nonexistent");
  expect(result).toBeNull();
});

test("getRound returns null for a non-member", async () => {
  const { gameId, creator } = await setupActiveGame();
  const outsider = await createTestUser("Outsider");

  const gameDetail = await getGame(creator.id, gameId);
  const roundId = gameDetail!.rounds[0]!.id;

  const result = await getRound(outsider.id, gameId, roundId);
  expect(result).toBeNull();
});

test("getRound returns null for a non-existent round", async () => {
  const { gameId, creator } = await setupActiveGame();
  const result = await getRound(creator.id, gameId, "nonexistent-round");
  expect(result).toBeNull();
});

test("getRound returns round metadata and actorSubmission during submitting phase", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  await saveSubmission(players[0]!.id, {
    gameId,
    spotifyTrackUrl: "https://open.spotify.com/track/abc",
    note: "Great song",
  });

  const gameDetail = await getGame(creator.id, gameId);
  const roundId = gameDetail!.rounds[0]!.id;

  // Player who submitted sees their submission.
  const withSub = await getRound(players[0]!.id, gameId, roundId);
  expect(withSub).toMatchObject({
    number: 1,
    theme: "Round 1",
    phase: "submitting",
  });
  expect(withSub!.actorSubmission).toMatchObject({
    spotifyTrackUrl: "https://open.spotify.com/track/abc",
    note: "Great song",
  });
  expect(withSub!.actorBallot).toBeNull();
  expect(withSub!.votingSubmissions).toBeNull();
  expect(withSub!.results).toBeNull();
  expect(withSub!.actions).toContain("submit_song");

  // Player who hasn't submitted sees null actorSubmission.
  const withoutSub = await getRound(players[1]!.id, gameId, roundId);
  expect(withoutSub!.actorSubmission).toBeNull();
  expect(withoutSub!.actions).toContain("submit_song");
});

test("getRound returns actorBallot and votingSubmissions during voting phase", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  const allPlayers = [creator, ...players];
  for (let i = 0; i < allPlayers.length; i++) {
    await saveSubmission(allPlayers[i]!.id, {
      gameId,
      spotifyTrackUrl: `https://open.spotify.com/track/t${i}`,
    });
  }

  await advanceRound(creator.id, { gameId }); // submitting → voting

  const gameDetail = await getGame(creator.id, gameId);
  const roundId = gameDetail!.rounds[0]!.id;

  // Before voting: no ballot, but votingSubmissions present.
  const beforeVote = await getRound(players[0]!.id, gameId, roundId);
  expect(beforeVote!.phase).toBe("voting");
  expect(beforeVote!.votingSubmissions).toHaveLength(allPlayers.length);
  expect(beforeVote!.actorBallot).toBeNull();
  expect(beforeVote!.actorSubmission).toBeNull();
  expect(beforeVote!.results).toBeNull();
  expect(beforeVote!.actions).toContain("cast_ballot");

  // Vote, then check ballot is returned.
  const subs = beforeVote!.votingSubmissions!;
  const voterPlayerId = beforeVote!.actorPlayer.id;
  const targets = subs.filter((s) => s.playerId !== voterPlayerId).slice(0, 3);
  await saveBallot(players[0]!.id, {
    gameId,
    submissionIds: targets.map((t) => t.id),
  });

  const afterVote = await getRound(players[0]!.id, gameId, roundId);
  expect(afterVote!.actorBallot).toMatchObject({
    ballotId: expect.any(String),
    submissionIds: expect.arrayContaining(targets.map((t) => t.id)),
  });
});

test("getRound returns results for a scored round", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  const allPlayers = [creator, ...players];
  for (let i = 0; i < allPlayers.length; i++) {
    await saveSubmission(allPlayers[i]!.id, {
      gameId,
      spotifyTrackUrl: `https://open.spotify.com/track/t${i}`,
    });
  }

  await advanceRound(creator.id, { gameId }); // submitting → voting

  // All players vote (use getRound for voting submissions).
  const gameDetail = await getGame(creator.id, gameId);
  const roundId = gameDetail!.rounds[0]!.id;

  for (const voter of allPlayers) {
    const roundDetail = await getRound(voter.id, gameId, roundId);
    const subs = roundDetail!.votingSubmissions!;
    const targets = subs
      .filter((s) => s.playerId !== roundDetail!.actorPlayer.id)
      .slice(0, 3);
    await saveBallot(voter.id, {
      gameId,
      submissionIds: targets.map((t) => t.id),
    });
  }

  await advanceRound(creator.id, { gameId }); // voting → scored
  const scored = await getRound(creator.id, gameId, roundId);

  expect(scored!.phase).toBe("scored");
  expect(scored!.results).not.toBeNull();
  expect(scored!.results!.submissions.length).toBe(allPlayers.length);

  // Results sorted by starCount descending.
  const counts = scored!.results!.submissions.map((s) => s.starCount);
  for (let i = 1; i < counts.length; i++) {
    expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]!);
  }

  // No active-phase data for scored rounds.
  expect(scored!.actorSubmission).toBeNull();
  expect(scored!.actorBallot).toBeNull();
  expect(scored!.votingSubmissions).toBeNull();
});

test("getRound returns empty actions for a pending round", async () => {
  const creator = await createTestUser("Alice");
  const gameResult = await createGame(creator.id, {
    name: "Multi round",
    submissionWindowDays: 7,
    votingWindowDays: 3,
  });
  createdGameIds.add(gameResult.gameId);

  await addRound(creator.id, { gameId: gameResult.gameId, theme: "Round 1" });
  await addRound(creator.id, { gameId: gameResult.gameId, theme: "Round 2" });

  // Invite enough players to start.
  const players = [];
  for (let i = 0; i < 3; i++) {
    const p = await createTestUser();
    await invitePlayer(creator.id, {
      gameId: gameResult.gameId,
      targetUserId: p.id,
    });
    await acceptInvite(p.id, { gameId: gameResult.gameId });
    players.push(p);
  }

  await startGame(creator.id, { gameId: gameResult.gameId });

  const gameDetail = await getGame(creator.id, gameResult.gameId);
  const pendingRound = gameDetail!.rounds.find((r) => r.phase === "pending");
  expect(pendingRound).toBeDefined();

  const result = await getRound(
    creator.id,
    gameResult.gameId,
    pendingRound!.id,
  );
  expect(result!.phase).toBe("pending");
  // Pending round: no submit/vote/transition actions since it's not the active round.
  expect(result!.actions).not.toContain("submit_song");
  expect(result!.actions).not.toContain("cast_ballot");
  expect(result!.actions).not.toContain("transition_round");
});

test("getRound includes actorPlayer with correct role", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  const gameDetail = await getGame(creator.id, gameId);
  const roundId = gameDetail!.rounds[0]!.id;

  const creatorRound = await getRound(creator.id, gameId, roundId);
  expect(creatorRound!.actorPlayer).toMatchObject({
    role: "creator",
    status: "active",
  });

  const playerRound = await getRound(players[0]!.id, gameId, roundId);
  expect(playerRound!.actorPlayer).toMatchObject({
    role: "player",
    status: "active",
  });
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
    await invitePlayer(creator.id, {
      gameId: draftGame.gameId,
      targetUserId: p.id,
    });
    await acceptInvite(p.id, { gameId: draftGame.gameId });
    players.push(p);
  }

  await startGame(creator.id, { gameId: draftGame.gameId });

  return { gameId: draftGame.gameId, creator, players };
}

async function createTestUser(name?: string) {
  const id = `user_${crypto.randomUUID()}`;

  createdUserIds.add(id);

  const username = id.toLowerCase();

  const [createdUser] = await db
    .insert(user)
    .values({
      id,
      name: name ?? `Test ${id}`,
      email: `${id}@example.com`,
      username,
      displayUsername: username,
    })
    .returning();

  if (!createdUser) {
    throw new Error("Failed to create test user.");
  }

  return createdUser;
}
