import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { reset } from "drizzle-seed";
import { nanoid } from "nanoid";
import ws from "ws";
import {
  battle,
  player,
  stage,
  submission,
  star,
} from "../src/lib/server/db/schema/public";

neonConfig.webSocketConstructor = ws;

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: bun scripts/db-seed.ts <user-id>");
  console.error("Sign up in the app first, then pass your user ID.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

await reset(db, { star, submission, stage, player, battle });

const now = new Date();
const hour = 60 * 60 * 1000;
const day = 24 * hour;

const vibes = [
  "Summer Road Trip",
  "Late Night Coding",
  "Morning Coffee",
  "Workout Energy",
  "Rainy Day Vibes",
  "Party Starter",
  "Chill Sunday",
  "Focus Mode",
  "Throwback Classics",
  "New Discoveries",
];

// Sample Spotify tracks for seeding submissions
const spotifyTracks = [
  "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", // Never Gonna Give You Up
  "https://open.spotify.com/track/7GhIk7Il098yCjg4BQjzvb", // Bohemian Rhapsody
  "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp", // Mr. Brightside
  "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b", // Blinding Lights
  "https://open.spotify.com/track/2tpWsVSb9UEmDRxAl1zhX1", // Somebody That I Used to Know
  "https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr", // Crazy Train
];

type Phase = "closed" | "voting" | "submission" | "upcoming";

const battleConfigs = [
  // All 4 phases in one battle for UI testing
  {
    name: "Phase Showcase",
    status: "active" as const,
    stages: [
      { phase: "closed" as Phase, daysOffset: -10 },
      { phase: "voting" as Phase, daysOffset: -1 },
      { phase: "submission" as Phase, daysOffset: 1 },
      { phase: "upcoming" as Phase, daysOffset: 7 },
    ],
  },
  { name: "Weekly Showdown", status: "active" as const, stageCount: 3 },
  { name: "Genre Wars", status: "active" as const, stageCount: 2 },
  { name: "Discovery League", status: "draft" as const, stageCount: 2 },
  { name: "Throwback Tournament", status: "completed" as const, stageCount: 3 },
  { name: "Fresh Finds", status: "draft" as const, stageCount: 2 },
];

let vibeIndex = 0;

for (const config of battleConfigs) {
  const battleId = nanoid(8);
  const stageCount = "stages" in config ? config.stages.length : config.stageCount;

  // Pre-generate stage IDs
  const stageIds: string[] = [];
  for (let i = 0; i < stageCount; i++) {
    stageIds.push(nanoid(8));
  }

  // Determine current stage
  let currentStageId: string | null = null;
  if (config.status === "active") {
    if ("stages" in config) {
      // Find first non-closed stage
      const idx = config.stages.findIndex((s) => s.phase !== "closed");
      currentStageId = stageIds[idx >= 0 ? idx : 0];
    } else {
      currentStageId = stageIds[Math.floor(stageIds.length / 2)];
    }
  }

  await db.insert(battle).values({
    id: battleId,
    name: config.name,
    creatorId: userId,
    status: config.status,
    visibility: "public",
    maxPlayers: 8,
    doubleSubmissions: false,
    currentStageId,
    authoritativeTimezone: "America/New_York",
    stagesCount: stageCount,
  });

  await db.insert(player).values({
    id: nanoid(8),
    battleId,
    userId,
    joinedAt: Math.floor(Date.now() / 1000),
  });

  // Create stages
  for (let i = 0; i < stageCount; i++) {
    const stageId = stageIds[i];
    const stageNumber = i + 1;

    let phase: Phase;
    let submissionDeadline: Date;
    let votingDeadline: Date;

    if ("stages" in config) {
      // Explicit phase config
      const stageConfig = config.stages[i];
      phase = stageConfig.phase;
      submissionDeadline = new Date(now.getTime() + stageConfig.daysOffset * day);
      votingDeadline = new Date(submissionDeadline.getTime() + 2 * day);
    } else if (config.status === "completed") {
      phase = "closed";
      submissionDeadline = new Date(
        now.getTime() - (stageCount - i) * 7 * day,
      );
      votingDeadline = new Date(submissionDeadline.getTime() + 2 * day);
    } else if (config.status === "draft") {
      phase = "upcoming";
      submissionDeadline = new Date(now.getTime() + (i + 1) * 7 * day);
      votingDeadline = new Date(submissionDeadline.getTime() + 2 * day);
    } else {
      // Active battles: mix of phases
      if (stageId === currentStageId) {
        phase = "submission";
        submissionDeadline = new Date(now.getTime() + 1 * day);
        votingDeadline = new Date(submissionDeadline.getTime() + 2 * day);
      } else if (i < stageIds.indexOf(currentStageId!)) {
        phase = "closed";
        submissionDeadline = new Date(
          now.getTime() - (stageIds.indexOf(currentStageId!) - i) * 7 * day,
        );
        votingDeadline = new Date(submissionDeadline.getTime() + 2 * day);
      } else {
        phase = "upcoming";
        submissionDeadline = new Date(
          now.getTime() + (i - stageIds.indexOf(currentStageId!) + 1) * 7 * day,
        );
        votingDeadline = new Date(submissionDeadline.getTime() + 2 * day);
      }
    }

    await db.insert(stage).values({
      id: stageId,
      battleId,
      stageNumber,
      vibe: vibes[vibeIndex % vibes.length],
      phase,
      submissionDeadline,
      votingDeadline,
    });

    // Add submissions for closed/voting stages
    if (phase === "closed" || phase === "voting") {
      // Use fake user IDs so real user can vote; first submission is from real user
      const fakeUserIds = [userId, "fake-user-1", "fake-user-2", "fake-user-3"];
      const submissionIds: string[] = [];

      for (let j = 0; j < 4; j++) {
        const subId = nanoid(8);
        submissionIds.push(subId);
        await db.insert(submission).values({
          id: subId,
          stageId,
          userId: fakeUserIds[j],
          spotifyUrl: spotifyTracks[j % spotifyTracks.length],
          submissionOrder: j + 1,
          submittedAt: Math.floor((submissionDeadline.getTime() - hour) / 1000),
          starsReceived: phase === "closed" ? [3, 2, 1, 0][j] : 0,
        });
      }

      // Add stars for closed stages (simulates voting happened)
      if (phase === "closed") {
        // User voted for submissions 1, 2, 3 (not their own at index 0)
        for (let j = 1; j < 4; j++) {
          await db.insert(star).values({
            id: nanoid(8),
            stageId,
            voterId: userId,
            submissionId: submissionIds[j],
            votedAt: Math.floor((votingDeadline.getTime() - hour) / 1000),
          });
        }
      }
    }

    vibeIndex++;
  }
}

await pool.end();

console.log("Database seeded for user:", userId);
const totalStages = battleConfigs.reduce(
  (a, b) => a + ("stages" in b ? b.stages.length : b.stageCount),
  0,
);
console.log(`Created ${battleConfigs.length} battles with ${totalStages} stages`);
