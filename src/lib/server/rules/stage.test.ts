import { describe, expect, it } from "vitest";
import { computeStageRules, shouldShowOtherSubmissions } from "./stage";

const baseStage = {
  id: "stage-1",
  phase: "submission",
  submissionDeadline: new Date("2030-01-01T00:00:00Z"),
  votingDeadline: new Date("2030-01-02T00:00:00Z"),
  spotifyPlaylistId: null,
  battle: {
    status: "active",
    currentStageId: "stage-1",
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
      userSubmissions: [],
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
