import { describe, expect, test } from "bun:test";
import { type CapabilityContext, getAllowedActions } from "./capability";

function ctx(overrides: Partial<CapabilityContext> = {}): CapabilityContext {
  return {
    gameState: "active",
    activeRoundPhase: "submitting",
    actorRole: "player",
    actorStatus: "active",
    activePlayerCount: 5,
    roundCount: 3,
    submissionClosesAt: null,
    votingClosesAt: null,
    now: new Date(),
    ...overrides,
  };
}

describe("getAllowedActions", () => {
  test("returns empty set for non-members", () => {
    const actions = getAllowedActions(ctx({ actorRole: null, actorStatus: null }));
    expect(actions.size).toBe(0);
  });

  test("invited player can only accept invite", () => {
    const actions = getAllowedActions(ctx({ actorStatus: "invited" }));
    expect(actions.has("accept_invite")).toBe(true);
    expect(actions.size).toBe(1);
  });

  test("left player gets no actions", () => {
    const actions = getAllowedActions(ctx({ actorStatus: "left" }));
    expect(actions.size).toBe(0);
  });

  test("removed player gets no actions", () => {
    const actions = getAllowedActions(ctx({ actorStatus: "removed" }));
    expect(actions.size).toBe(0);
  });

  describe("draft game", () => {
    test("creator gets draft actions", () => {
      const actions = getAllowedActions(
        ctx({
          gameState: "draft",
          activeRoundPhase: null,
          actorRole: "creator",
        }),
      );
      expect(actions.has("edit_game")).toBe(true);
      expect(actions.has("edit_future_round")).toBe(true);
      expect(actions.has("invite_player")).toBe(true);
    });

    test("creator can start with enough players and rounds", () => {
      const actions = getAllowedActions(
        ctx({
          gameState: "draft",
          activeRoundPhase: null,
          actorRole: "creator",
          activePlayerCount: 4,
          roundCount: 1,
        }),
      );
      expect(actions.has("start_game")).toBe(true);
    });

    test("creator cannot start with too few players", () => {
      const actions = getAllowedActions(
        ctx({
          gameState: "draft",
          activeRoundPhase: null,
          actorRole: "creator",
          activePlayerCount: 3,
          roundCount: 1,
        }),
      );
      expect(actions.has("start_game")).toBe(false);
    });

    test("creator cannot start with no rounds", () => {
      const actions = getAllowedActions(
        ctx({
          gameState: "draft",
          activeRoundPhase: null,
          actorRole: "creator",
          activePlayerCount: 4,
          roundCount: 0,
        }),
      );
      expect(actions.has("start_game")).toBe(false);
    });

    test("non-creator player gets no draft actions", () => {
      const actions = getAllowedActions(
        ctx({
          gameState: "draft",
          activeRoundPhase: null,
          actorRole: "player",
        }),
      );
      expect(actions.has("edit_game")).toBe(false);
      expect(actions.has("invite_player")).toBe(false);
      expect(actions.has("start_game")).toBe(false);
    });
  });

  describe("active game — submitting phase", () => {
    test("active player can submit", () => {
      const actions = getAllowedActions(ctx({ activeRoundPhase: "submitting" }));
      expect(actions.has("submit_song")).toBe(true);
      expect(actions.has("leave_game")).toBe(true);
    });

    test("active player cannot submit after window closes", () => {
      const past = new Date(Date.now() - 1000);
      const actions = getAllowedActions(
        ctx({ activeRoundPhase: "submitting", submissionClosesAt: past }),
      );
      expect(actions.has("submit_song")).toBe(false);
    });

    test("active player cannot vote during submitting phase", () => {
      const actions = getAllowedActions(ctx({ activeRoundPhase: "submitting" }));
      expect(actions.has("cast_ballot")).toBe(false);
    });

    test("creator can transition during submitting phase", () => {
      const actions = getAllowedActions(
        ctx({ activeRoundPhase: "submitting", actorRole: "creator" }),
      );
      expect(actions.has("transition_round")).toBe(true);
    });

    test("non-creator cannot transition", () => {
      const actions = getAllowedActions(
        ctx({ activeRoundPhase: "submitting", actorRole: "player" }),
      );
      expect(actions.has("transition_round")).toBe(false);
    });
  });

  describe("active game — voting phase", () => {
    test("active player can vote", () => {
      const actions = getAllowedActions(ctx({ activeRoundPhase: "voting" }));
      expect(actions.has("cast_ballot")).toBe(true);
      expect(actions.has("leave_game")).toBe(true);
    });

    test("active player cannot vote after window closes", () => {
      const past = new Date(Date.now() - 1000);
      const actions = getAllowedActions(ctx({ activeRoundPhase: "voting", votingClosesAt: past }));
      expect(actions.has("cast_ballot")).toBe(false);
    });

    test("active player cannot submit during voting phase", () => {
      const actions = getAllowedActions(ctx({ activeRoundPhase: "voting" }));
      expect(actions.has("submit_song")).toBe(false);
    });
  });

  describe("completed game", () => {
    test("no actions available", () => {
      const actions = getAllowedActions(ctx({ gameState: "completed", activeRoundPhase: null }));
      expect(actions.has("submit_song")).toBe(false);
      expect(actions.has("cast_ballot")).toBe(false);
      expect(actions.has("transition_round")).toBe(false);
      expect(actions.has("leave_game")).toBe(false);
    });
  });
});
