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

type Phase = "closed" | "voting" | "submission" | "upcoming";

const battleConfigs = [
  { name: "Weekly Showdown", status: "active" as const, stageCount: 3 },
  { name: "Genre Wars", status: "active" as const, stageCount: 2 },
  { name: "Discovery League", status: "draft" as const, stageCount: 2 },
  { name: "Throwback Tournament", status: "completed" as const, stageCount: 3 },
  { name: "Fresh Finds", status: "draft" as const, stageCount: 2 },
];

let vibeIndex = 0;

for (const config of battleConfigs) {
  const battleId = nanoid(8);

  // Determine which stage is current based on battle status
  let currentStageId: string | null = null;
  const stageIds: string[] = [];

  // Pre-generate stage IDs
  for (let i = 0; i < config.stageCount; i++) {
    stageIds.push(nanoid(8));
  }

  // Set current stage for active battles (middle stage usually)
  if (config.status === "active") {
    currentStageId = stageIds[Math.floor(stageIds.length / 2)];
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
    stagesCount: config.stageCount,
  });

  await db.insert(player).values({
    id: nanoid(8),
    battleId,
    userId,
    joinedAt: Math.floor(Date.now() / 1000),
  });

  // Create stages with appropriate phases and deadlines
  for (let i = 0; i < config.stageCount; i++) {
    const stageId = stageIds[i];
    const stageNumber = i + 1;

    let phase: Phase;
    let submissionDeadline: Date;
    let votingDeadline: Date;

    if (config.status === "completed") {
      // All stages closed for completed battles
      phase = "closed";
      submissionDeadline = new Date(
        now.getTime() - (config.stageCount - i) * 7 * day,
      );
      votingDeadline = new Date(submissionDeadline.getTime() + 2 * day);
    } else if (config.status === "draft") {
      // All stages upcoming for draft battles
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

    vibeIndex++;
  }
}

await pool.end();

console.log("Database seeded for user:", userId);
console.log(
  `Created ${battleConfigs.length} battles with ${battleConfigs.reduce((a, b) => a + b.stageCount, 0)} stages`,
);
