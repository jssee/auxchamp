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
const { getGame, getPublicProfile } = await import("./query");

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
  await invitePlayer(creator.id, { gameId: draftGame.gameId, targetUserId: invitee.id });
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
  expect(detail!.rounds[0]).toMatchObject({ number: 1, theme: "Openers", submissionCount: 0 });
  expect(detail!.rounds[1]).toMatchObject({ number: 2, theme: "Deep cuts", submissionCount: 0 });
});

test("returns activeRound and actorSubmission for an active game", async () => {
  const { gameId, players } = await setupActiveGame();

  await saveSubmission(players[0]!.id, {
    gameId,
    spotifyTrackUrl: "https://open.spotify.com/track/abc",
    note: "My pick",
  });

  const detail = await getGame(players[0]!.id, gameId);

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

  const detail = await getGame(players[0]!.id, gameId);

  expect(detail!.activeRound).not.toBeNull();
  expect(detail!.actorSubmission).toBeNull();
});

test("returns actorPlayer reflecting the actor's participation", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  const creatorDetail = await getGame(creator.id, gameId);
  expect(creatorDetail!.actorPlayer).toMatchObject({ role: "creator", status: "active" });

  const playerDetail = await getGame(players[1]!.id, gameId);
  expect(playerDetail!.actorPlayer).toMatchObject({ role: "player", status: "active" });
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

test("returns voting state with actorBallot and votingSubmissions", async () => {
  const { gameId, creator, players } = await setupActiveGame();

  // All players submit.
  const allPlayers = [creator, ...players];
  for (let i = 0; i < allPlayers.length; i++) {
    await saveSubmission(allPlayers[i]!.id, {
      gameId,
      spotifyTrackUrl: `https://open.spotify.com/track/t${i}`,
    });
  }

  // Advance to voting.
  await advanceRound(creator.id, { gameId });

  // Player 0 has not voted yet.
  const beforeVote = await getGame(players[0]!.id, gameId);
  expect(beforeVote!.activeRound).toMatchObject({ phase: "voting" });
  expect(beforeVote!.activeRound!.votingOpensAt).toBeInstanceOf(Date);
  expect(beforeVote!.votingSubmissions).toHaveLength(allPlayers.length);
  expect(beforeVote!.actorBallot).toBeNull();
  expect(beforeVote!.actorSubmission).toBeNull(); // Not in submitting phase.

  // Player 0 votes.
  const subs = beforeVote!.votingSubmissions!;
  const voterPlayerId = beforeVote!.actorPlayer.id;
  const targets = subs.filter((s) => s.playerId !== voterPlayerId).slice(0, 3);
  await saveBallot(players[0]!.id, {
    gameId,
    submissionIds: targets.map((t) => t.id),
  });

  const afterVote = await getGame(players[0]!.id, gameId);
  expect(afterVote!.actorBallot).toMatchObject({
    ballotId: expect.any(String),
    submissionIds: expect.arrayContaining(targets.map((t) => t.id)),
  });
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

  // All players vote.
  const gameDetail = await getGame(creator.id, gameId);
  const subs = gameDetail!.votingSubmissions!;

  for (const voter of allPlayers) {
    const voterDetail = await getGame(voter.id, gameId);
    const voterPlayerId = voterDetail!.actorPlayer.id;
    const targets = subs.filter((s) => s.playerId !== voterPlayerId).slice(0, 3);
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
  const totalStars = scored!.standings.reduce((sum, s) => sum + s.totalStars, 0);
  // Each voter gives 3 stars, so total = playerCount * 3.
  expect(totalStars).toBe(allPlayers.length * 3);
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
