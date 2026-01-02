import { error, redirect } from "@sveltejs/kit";
import { eq, or, and, exists } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";

import { env } from "$env/dynamic/private";
import { form, query, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import {
  battle,
  player,
  stage,
  battleInsertSchema,
  type QStashJobRef,
} from "$lib/server/db/schema";
import { scheduleStageTransition, cancelJob } from "$lib/server/qstash";
import { booleanFromForm } from "$lib/utils";
import { isValidTimeZone, parseDateTimeInZone } from "$lib/utils/time";

// Stage schema for form input
const stageFormSchema = v.object({
  vibe: v.pipe(v.string(), v.minLength(1, "Stage vibe is required")),
  submissionDeadline: v.pipe(
    v.string(),
    v.minLength(1, "Submission deadline is required"),
  ),
  votingDeadline: v.pipe(
    v.string(),
    v.minLength(1, "Voting deadline is required"),
  ),
});

// Form schema: derives from drizzle schema, adds form coercion for boolean fields
const battleFormSchema = v.object({
  ...v.pick(battleInsertSchema, ["name", "visibility", "maxPlayers"]).entries,
  doubleSubmissions: booleanFromForm,
  authoritativeTimezone: v.pipe(
    v.string(),
    v.minLength(1, "Timezone is required"),
  ),
  stages: v.pipe(
    v.array(stageFormSchema),
    v.minLength(1, "At least one stage is required"),
  ),
});

// GET: User's battles (created + joined)
export const getBattles = query(async () => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  return db.query.battle.findMany({
    where: or(
      eq(battle.creatorId, locals.user.id),
      exists(
        db
          .select()
          .from(player)
          .where(
            and(
              eq(player.battleId, battle.id),
              eq(player.userId, locals.user.id),
            ),
          ),
      ),
    ),
  });
});

// GET: Single battle by ID
export const getBattle = query(v.string(), async (id) => {
  const result = await db.query.battle.findFirst({
    where: eq(battle.id, id),
  });
  if (!result) error(404, "Battle not found");
  return result;
});

// Minimum time between submission and voting deadlines (5 minutes)
const MIN_DEADLINE_GAP_MS = 5 * 60 * 1000;

// POST: Create battle
export const createBattle = form(battleFormSchema, async (data, invalid) => {
  const { locals, request } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const { stages: stageInputs, authoritativeTimezone, ...battleData } = data;

  if (!isValidTimeZone(authoritativeTimezone)) {
    invalid("Timezone is invalid");
    return;
  }

  // Validate and convert stage deadlines
  const parsedStages: {
    vibe: string;
    submissionDeadline: Date;
    votingDeadline: Date;
  }[] = [];

  for (let i = 0; i < stageInputs.length; i++) {
    const stageInput = stageInputs[i];
    const submissionDeadline = parseDateTimeInZone(
      stageInput.submissionDeadline,
      authoritativeTimezone,
    );
    const votingDeadline = parseDateTimeInZone(
      stageInput.votingDeadline,
      authoritativeTimezone,
    );

    // Validate dates are parseable
    if (!submissionDeadline) {
      invalid(`Stage ${i + 1}: Invalid submission deadline`);
      return;
    }
    if (!votingDeadline) {
      invalid(`Stage ${i + 1}: Invalid voting deadline`);
      return;
    }

    // Validate submissionDeadline < votingDeadline
    if (submissionDeadline >= votingDeadline) {
      invalid(
        `Stage ${i + 1}: Submission deadline must be before voting deadline`,
      );
      return;
    }

    // Validate minimum 5 minute gap
    if (
      votingDeadline.getTime() - submissionDeadline.getTime() <
      MIN_DEADLINE_GAP_MS
    ) {
      invalid(
        `Stage ${i + 1}: At least 5 minutes required between submission and voting deadlines`,
      );
      return;
    }

    // Validate stage ordering: previous votingDeadline <= this submissionDeadline
    if (i > 0) {
      const prevVotingDeadline = parsedStages[i - 1].votingDeadline;
      if (prevVotingDeadline > submissionDeadline) {
        invalid(
          `Stage ${i + 1}: Submission deadline must be at or after previous stage's voting deadline`,
        );
        return;
      }
    }

    parsedStages.push({
      vibe: stageInput.vibe,
      submissionDeadline,
      votingDeadline,
    });
  }

  const battleId = nanoid(8);
  const stageIds = parsedStages.map(() => nanoid(8));

  // Get base URL for QStash callbacks
  const baseUrl = env.PUBLIC_BASE_URL || new URL(request.url).origin;

  try {
    // Insert battle
    await db.insert(battle).values({
      id: battleId,
      ...battleData,
      authoritativeTimezone,
      stagesCount: parsedStages.length,
      currentStageId: stageIds[0],
      creatorId: locals.user.id,
      status: "active",
    });

    // Insert stages and schedule QStash jobs
    for (let i = 0; i < parsedStages.length; i++) {
      const stageData = parsedStages[i];
      const stageId = stageIds[i];
      const stageNumber = i + 1;
      const isLastStage = i === parsedStages.length - 1;

      const common = { baseUrl, battleId, stageId, stageNumber };

      // Schedule stage transition jobs (returns null in dev mode)
      const jobs = await Promise.all([
        scheduleStageTransition({
          ...common,
          action: "voting_open",
          scheduledFor: stageData.submissionDeadline,
        }),
        scheduleStageTransition({
          ...common,
          action: "stage_closed",
          scheduledFor: stageData.votingDeadline,
        }),
        ...(isLastStage
          ? [
              scheduleStageTransition({
                ...common,
                action: "battle_completed",
                scheduledFor: stageData.votingDeadline,
              }),
            ]
          : []),
      ]);

      const jobIds = jobs.filter((j): j is QStashJobRef => j !== null);

      // Insert stage
      await db.insert(stage).values({
        id: stageId,
        battleId,
        stageNumber,
        vibe: stageData.vibe,
        submissionDeadline: stageData.submissionDeadline,
        votingDeadline: stageData.votingDeadline,
        phase: "upcoming",
        jobIds,
      });
    }
  } catch (err) {
    console.error(err);
    invalid((err as Error).message);
    return;
  }

  redirect(302, `/b/${battleId}`);
});

// Update schema: partial version of form schema + required id
const battleUpdateFormSchema = v.object({
  id: v.string(),
  ...v.partial(battleFormSchema).entries,
});

// POST: Update battle (id from form data)
export const updateBattle = form(
  battleUpdateFormSchema,
  async (data, invalid) => {
    const { locals } = getRequestEvent();
    if (!locals.user) error(401, "Not authenticated");

    const { id, ...updates } = data;

    const existing = await db.query.battle.findFirst({
      where: eq(battle.id, id),
    });

    if (!existing) error(404, "Battle not found");
    if (existing.creatorId !== locals.user.id) error(403, "Not authorized");

    if (existing.status === "completed" || existing.status === "cancelled") {
      invalid("Cannot edit a " + existing.status + " battle");
      return;
    }

    try {
      await db.update(battle).set(updates).where(eq(battle.id, id));
    } catch (err) {
      console.error(err);
      invalid((err as Error).message);
      return;
    }

    redirect(302, `/b/${id}`);
  },
);

// POST: Cancel battle (id from hidden input)
export const cancelBattle = form(
  v.object({ id: v.string() }),
  async (data, invalid) => {
    const { locals } = getRequestEvent();
    if (!locals.user) error(401, "Not authenticated");

    const existing = await db.query.battle.findFirst({
      where: eq(battle.id, data.id),
      with: { stages: true },
    });

    if (!existing) error(404, "Battle not found");
    if (existing.creatorId !== locals.user.id) error(403, "Not authorized");

    if (existing.status === "completed" || existing.status === "cancelled") {
      invalid("Cannot cancel a " + existing.status + " battle");
      return;
    }

    // Cancel all pending QStash jobs
    for (const s of existing.stages) {
      if (s.jobIds && Array.isArray(s.jobIds)) {
        await Promise.all(s.jobIds.map((job) => cancelJob(job.messageId)));
      }
    }

    // Update battle status and all stage phases
    await db.transaction(async (tx) => {
      await tx
        .update(battle)
        .set({ status: "cancelled" })
        .where(eq(battle.id, data.id));

      // Set all stages to closed
      for (const s of existing.stages) {
        await tx
          .update(stage)
          .set({ phase: "closed" })
          .where(eq(stage.id, s.id));
      }
    });

    redirect(302, "/home");
  },
);
