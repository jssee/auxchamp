import { Receiver } from "@upstash/qstash";
import { nanoid } from "nanoid";
import { env } from "$env/dynamic/private";
import { db } from "$lib/server/db";
import {
  battle,
  stage,
  submission,
  player,
  userStats,
} from "$lib/server/db/schema";
import { createStagePlaylist } from "$lib/server/spotify";
import { eq, and, sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

async function tallyStageResults(stageId: string, battleId: string) {
  // Get all submissions with their star counts
  const submissions = await db.query.submission.findMany({
    where: eq(submission.stageId, stageId),
  });

  if (submissions.length === 0) return;

  // Rank submissions
  const ranked = submissions
    .map((s) => ({ ...s, stars: s.starsReceived || 0 }))
    .sort((a, b) => b.stars - a.stars);

  // Find winner(s) - submissions with rank 1
  const topStars = ranked[0]?.stars || 0;
  const winners = ranked.filter((s) => s.stars === topStars && topStars > 0);

  // Get all players in the battle
  const players = await db.query.player.findMany({
    where: eq(player.battleId, battleId),
  });

  // Update player stats
  for (const p of players) {
    // Calculate total stars earned by this player in the battle
    const allBattleStages = await db.query.stage.findMany({
      where: eq(stage.battleId, battleId),
    });
    const stageIds = allBattleStages.map((s) => s.id);

    const playerSubmissions = await db.query.submission.findMany({
      where: and(
        eq(submission.userId, p.userId),
        sql`${submission.stageId} IN (${sql.join(
          stageIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    });

    const totalStars = playerSubmissions.reduce(
      (sum, s) => sum + (s.starsReceived || 0),
      0,
    );

    // Check if player won this stage
    const wonThisStage = winners.some((w) => w.userId === p.userId);

    // Update player record
    await db
      .update(player)
      .set({
        totalStarsEarned: totalStars,
        stagesWon: wonThisStage
          ? sql`COALESCE(${player.stagesWon}, 0) + 1`
          : player.stagesWon,
      })
      .where(eq(player.id, p.id));

    // Update or create userStats
    const starsFromThisStage = playerSubmissions
      .filter((s) => s.stageId === stageId)
      .reduce((sum, s) => sum + (s.starsReceived || 0), 0);

    await db
      .insert(userStats)
      .values({
        id: nanoid(8),
        userId: p.userId,
        lifetimeStarsEarned: starsFromThisStage,
        lifetimeStagesWon: wonThisStage ? 1 : 0,
        battlesCompleted: 0,
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          lifetimeStarsEarned: sql`${userStats.lifetimeStarsEarned} + ${starsFromThisStage}`,
          lifetimeStagesWon: wonThisStage
            ? sql`${userStats.lifetimeStagesWon} + 1`
            : userStats.lifetimeStagesWon,
          updatedAt: new Date(),
        },
      });
  }

  console.log(
    `Tallied results for stage ${stageId}: ${winners.length} winner(s) with ${topStars} stars`,
  );
}

type StageTransitionPayload = {
  battleId: string;
  stageId: string;
  stageNumber: number;
  action:
    | "submission_open"
    | "voting_open"
    | "stage_closed"
    | "battle_completed";
  expectedDeadline: string; // ISO timestamp
  idempotencyHash: string;
};

export const POST: RequestHandler = async ({ request }) => {
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) {
    console.error("QStash signing keys not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });

  const body = await request.text();
  const signature = request.headers.get("upstash-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  try {
    const isValid = await receiver.verify({
      signature,
      body,
    });

    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }
  } catch (err) {
    console.error("Signature verification failed:", err);
    return new Response("Signature verification failed", { status: 401 });
  }

  let payload: StageTransitionPayload;
  try {
    payload = JSON.parse(body) as StageTransitionPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    // Fetch battle with stages
    const currentBattle = await db.query.battle.findFirst({
      where: eq(battle.id, payload.battleId),
      with: { stages: true },
    });

    // Guard: Battle must exist and be active
    if (!currentBattle) {
      console.log(`Stage transition: Battle ${payload.battleId} not found`);
      return new Response("OK", { status: 200 });
    }
    if (currentBattle.status !== "active") {
      console.log(
        `Stage transition: Battle ${payload.battleId} not active (status: ${currentBattle.status})`,
      );
      return new Response("OK", { status: 200 });
    }

    // Guard: Stage must exist and match stageNumber
    const currentStage = currentBattle.stages.find(
      (s) => s.id === payload.stageId,
    );
    if (!currentStage) {
      console.log(`Stage transition: Stage ${payload.stageId} not found`);
      return new Response("OK", { status: 200 });
    }
    if (currentStage.stageNumber !== payload.stageNumber) {
      console.log(
        `Stage transition: Stage number mismatch (expected ${payload.stageNumber}, got ${currentStage.stageNumber})`,
      );
      return new Response("OK", { status: 200 });
    }

    // Guard: Don't process before deadline
    const now = new Date();
    const expectedDeadline = new Date(payload.expectedDeadline);
    if (now < expectedDeadline) {
      console.log(
        `Stage transition: Too early (now: ${now.toISOString()}, expected: ${payload.expectedDeadline})`,
      );
      return new Response("OK", { status: 200 });
    }

    // Handle each action
    switch (payload.action) {
      case "voting_open": {
        // Idempotency: skip if already in voting or later phase
        if (
          currentStage.phase === "voting" ||
          currentStage.phase === "closed"
        ) {
          console.log(
            `Stage transition: Stage ${payload.stageNumber} already in phase ${currentStage.phase}`,
          );
          return new Response("OK", { status: 200 });
        }

        // Create Spotify playlist before opening voting
        try {
          const result = await createStagePlaylist(payload.stageId);
          if (result) {
            console.log(
              `Created playlist for stage ${payload.stageNumber}: ${result.playlistUrl}`,
            );
          } else {
            console.log(
              `No playlist created for stage ${payload.stageNumber} (no submissions)`,
            );
          }
        } catch (playlistErr) {
          console.error(
            `Failed to create playlist for stage ${payload.stageNumber}:`,
            playlistErr,
          );
        }

        await db
          .update(stage)
          .set({ phase: "voting" })
          .where(eq(stage.id, payload.stageId));
        console.log(
          `Stage ${payload.stageNumber} voting opened for battle ${payload.battleId}`,
        );
        break;
      }

      case "stage_closed": {
        // Idempotency: skip if already closed
        if (currentStage.phase === "closed") {
          console.log(
            `Stage transition: Stage ${payload.stageNumber} already closed`,
          );
          return new Response("OK", { status: 200 });
        }

        // Tally results before closing
        await tallyStageResults(payload.stageId, payload.battleId);

        await db
          .update(stage)
          .set({ phase: "closed" })
          .where(eq(stage.id, payload.stageId));

        // Find next stage
        const nextStage = currentBattle.stages.find(
          (s) => s.stageNumber === payload.stageNumber + 1,
        );
        if (nextStage) {
          // Advance to next stage
          await db
            .update(battle)
            .set({ currentStageId: nextStage.id })
            .where(eq(battle.id, payload.battleId));
          await db
            .update(stage)
            .set({ phase: "submission" })
            .where(eq(stage.id, nextStage.id));
        }
        console.log(
          `Stage ${payload.stageNumber} closed for battle ${payload.battleId}`,
        );
        break;
      }

      case "battle_completed": {
        // Idempotency handled by guard: non-active battles (including completed) already returned

        // Increment battlesCompleted for all players
        const players = await db.query.player.findMany({
          where: eq(player.battleId, payload.battleId),
        });

        for (const p of players) {
          await db
            .insert(userStats)
            .values({
              id: nanoid(8),
              userId: p.userId,
              lifetimeStarsEarned: 0,
              lifetimeStagesWon: 0,
              battlesCompleted: 1,
            })
            .onConflictDoUpdate({
              target: userStats.userId,
              set: {
                battlesCompleted: sql`${userStats.battlesCompleted} + 1`,
                updatedAt: new Date(),
              },
            });
        }

        await db
          .update(battle)
          .set({ status: "completed" })
          .where(eq(battle.id, payload.battleId));
        console.log(`Battle ${payload.battleId} completed`);
        break;
      }

      case "submission_open": {
        // Idempotency: skip if already in submission or later phase
        if (currentStage.phase !== "upcoming") {
          console.log(
            `Stage transition: Stage ${payload.stageNumber} already past upcoming phase`,
          );
          return new Response("OK", { status: 200 });
        }
        await db
          .update(stage)
          .set({ phase: "submission" })
          .where(eq(stage.id, payload.stageId));
        console.log(
          `Stage ${payload.stageNumber} submission opened for battle ${payload.battleId}`,
        );
        break;
      }
    }
  } catch (err) {
    // Log errors but still return 200 to prevent QStash retries for permanent failures
    console.error("Stage transition error:", err);
  }

  return new Response("OK", { status: 200 });
};
