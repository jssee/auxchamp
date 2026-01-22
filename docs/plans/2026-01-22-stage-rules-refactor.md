# Stage Rules Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize stage eligibility and visibility logic into a dedicated rules module and simplify the page load orchestration.

**Architecture:** Introduce `src/lib/server/rules/stage.ts` with pure rule computations (no DB access). Refactor `src/routes/b/[id]/s/[id]/+page.server.ts` to fetch data, invoke rules, and assemble the response. Add unit tests for rules via Vitest.

**Tech Stack:** SvelteKit server load, TypeScript, Vitest.

---

### Task 1: Write failing unit tests for stage rules

**Files:**
- Create: `src/lib/server/rules/stage.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import {
  computeStageRules,
  shouldShowOtherSubmissions,
} from "./stage";

const baseStage = {
  phase: "submission",
  submissionDeadline: new Date("2030-01-01T00:00:00Z"),
  votingDeadline: new Date("2030-01-02T00:00:00Z"),
  spotifyPlaylistId: null,
  battle: {
    creatorId: "user-1",
    doubleSubmissions: false,
  },
};

const baseUser = { id: "user-1" };

const baseInputs = {
  stage: baseStage,
  user: baseUser,
  now: new Date("2029-12-31T00:00:00Z"),
  userSubmissions: [],
  otherSubmissions: [],
  userVotes: [],
};

describe("shouldShowOtherSubmissions", () => {
  it("returns true only for voting and closed", () => {
    expect(shouldShowOtherSubmissions("submission")).toBe(false);
    expect(shouldShowOtherSubmissions("voting")).toBe(true);
    expect(shouldShowOtherSubmissions("closed")).toBe(true);
  });
});

describe("computeStageRules", () => {
  it("disallows voting when user already voted", () => {
    const result = computeStageRules({
      ...baseInputs,
      stage: { ...baseStage, phase: "voting" },
      otherSubmissions: [
        { id: "sub-1", userId: "user-2" },
        { id: "sub-2", userId: "user-3" },
        { id: "sub-3", userId: "user-4" },
        { id: "sub-4", userId: "user-5" },
      ],
      userVotes: [{ submissionId: "sub-2" }],
    });

    expect(result.hasVoted).toBe(true);
    expect(result.canVote).toBe(false);
  });

  it("allows submission when before deadline and under max", () => {
    const result = computeStageRules({
      ...baseInputs,
      stage: { ...baseStage, phase: "submission" },
      userSubmissions: [{ id: "sub-1" }],
    });

    expect(result.canSubmit).toBe(true);
    expect(result.maxSubmissions).toBe(1);
  });

  it("allows double submissions when enabled", () => {
    const result = computeStageRules({
      ...baseInputs,
      stage: {
        ...baseStage,
        phase: "submission",
        battle: { ...baseStage.battle, doubleSubmissions: true },
      },
      userSubmissions: [{ id: "sub-1" }, { id: "sub-2" }],
    });

    expect(result.maxSubmissions).toBe(2);
    expect(result.canSubmit).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/lib/server/rules/stage.test.ts`
Expected: FAIL with module not found or missing exports from `src/lib/server/rules/stage.ts`.

### Task 2: Implement stage rules module

**Files:**
- Create: `src/lib/server/rules/stage.ts`

**Step 1: Write minimal implementation**

```typescript
type StagePhase = "upcoming" | "submission" | "voting" | "closed";

type StageWithBattle = {
  phase: StagePhase;
  submissionDeadline: Date;
  votingDeadline: Date;
  spotifyPlaylistId: string | null;
  battle: {
    creatorId: string;
    doubleSubmissions: boolean;
  };
};

type UserRef = { id: string };

type SubmissionRef = { id: string; userId: string };

type VoteRef = { submissionId: string };

export function shouldShowOtherSubmissions(phase: StagePhase): boolean {
  return phase === "voting" || phase === "closed";
}

export function computeStageRules(input: {
  stage: StageWithBattle;
  user: UserRef;
  now: Date;
  userSubmissions: Array<{ id: string }>;
  otherSubmissions: SubmissionRef[];
  userVotes: VoteRef[];
}) {
  const { stage, user, now, userSubmissions, otherSubmissions, userVotes } =
    input;

  const showOtherSubmissions = shouldShowOtherSubmissions(stage.phase);
  const hasVoted = userVotes.length > 0;
  const votedSubmissionIds = userVotes.map((vote) => vote.submissionId);
  const votableSubmissions = otherSubmissions.filter(
    (submission) => submission.userId !== user.id,
  );

  const inVotingPhase =
    stage.phase === "voting" ||
    (now >= stage.submissionDeadline && now < stage.votingDeadline);

  const canVote =
    inVotingPhase &&
    !hasVoted &&
    otherSubmissions.length >= 4 &&
    votableSubmissions.length >= 3;

  const maxSubmissions = stage.battle.doubleSubmissions ? 2 : 1;
  const canSubmit =
    stage.phase === "submission" &&
    now < stage.submissionDeadline &&
    userSubmissions.length < maxSubmissions;

  const isCreator = stage.battle.creatorId === user.id;
  const canCreatePlaylist =
    isCreator && stage.phase === "submission" && !stage.spotifyPlaylistId;

  return {
    showOtherSubmissions,
    hasVoted,
    votedSubmissionIds,
    votableSubmissions,
    inVotingPhase,
    canVote,
    maxSubmissions,
    canSubmit,
    isCreator,
    canCreatePlaylist,
  };
}
```

**Step 2: Run test to verify it passes**

Run: `npm run test:unit -- --run src/lib/server/rules/stage.test.ts`
Expected: PASS.

### Task 3: Refactor stage page server load to use rules module

**Files:**
- Modify: `src/routes/b/[id]/s/[id]/+page.server.ts`

**Step 1: Update load to use rules helper**

```typescript
import { computeStageRules, shouldShowOtherSubmissions } from "$lib/server/rules/stage";

// ...

const showOtherSubmissions = shouldShowOtherSubmissions(currentStage.phase);

const otherSubmissions = showOtherSubmissions
  ? (
      await db.query.submission.findMany({
        where: eq(submission.stageId, params.id),
        with: { user: true },
      })
    ).filter((s) => s.user !== null)
  : [];

const userVotes = await db.query.star.findMany({
  where: and(eq(star.stageId, params.id), eq(star.voterId, locals.user.id)),
});

const rules = computeStageRules({
  stage: currentStage,
  user: locals.user,
  now,
  userSubmissions,
  otherSubmissions,
  userVotes,
});

const voteResults = await getVoteResults(
  rules.hasVoted || currentStage.phase === "closed",
  params.id,
  otherSubmissions,
);

return {
  stage: currentStage,
  battle: currentStage.battle,
  userSubmissions,
  otherSubmissions,
  canSubmit: rules.canSubmit,
  maxSubmissions: rules.maxSubmissions,
  user: locals.user,
  isCreator: rules.isCreator,
  canCreatePlaylist: rules.canCreatePlaylist,
  // Voting data
  hasVoted: rules.hasVoted,
  votedSubmissionIds: rules.votedSubmissionIds,
  canVote: rules.canVote,
  voteResults,
  votableSubmissions: rules.votableSubmissions,
};
```

**Step 2: Run unit tests**

Run: `npm run test:unit -- --run src/lib/server/rules/stage.test.ts`
Expected: PASS.

### Task 4: Verify broader correctness

**Files:**
- None

**Step 1: Run quick typecheck**

Run: `npm run check`
Expected: PASS.

**Step 2: Commit**

```bash
git add src/lib/server/rules/stage.ts src/lib/server/rules/stage.test.ts src/routes/b/[id]/s/[id]/+page.server.ts docs/plans/2026-01-22-stage-rules-refactor.md
git commit -m "refactor: centralize stage rules"
```
```
