/**
 * Capability model: compute allowed actions from game state.
 *
 * This is the single source of truth for "what can this actor do right now?"
 * The API returns the result; the client never derives permissions from raw state.
 *
 * See docs/2026-03-05-DESIGN.md § Capability model.
 */

export const actionValues = [
  "accept_invite",
  "cast_ballot",
  "edit_future_round",
  "edit_game",
  "invite_player",
  "leave_game",
  "start_game",
  "submit_song",
  "transition_round",
] as const;

export type Action = (typeof actionValues)[number];

export type CapabilityContext = {
  gameState: "draft" | "active" | "completed";
  activeRoundPhase: "submitting" | "voting" | null;
  actorRole: "creator" | "player" | null;
  actorStatus: "invited" | "active" | "left" | "removed" | null;
  activePlayerCount: number;
  roundCount: number;
  submissionClosesAt: Date | null;
  votingClosesAt: Date | null;
  now: Date;
};

export function getAllowedActions(ctx: CapabilityContext): ReadonlySet<Action> {
  const actions = new Set<Action>();

  if (!ctx.actorRole || !ctx.actorStatus) return actions;

  const isCreator = ctx.actorRole === "creator";
  const isActivePlayer = ctx.actorStatus === "active";
  const isDraft = ctx.gameState === "draft";
  const isGameActive = ctx.gameState === "active";

  if (ctx.actorStatus === "invited") {
    actions.add("accept_invite");
    return actions;
  }

  if (isDraft && isCreator) {
    actions.add("edit_game");
    actions.add("edit_future_round");
    actions.add("invite_player");

    if (ctx.roundCount >= 1 && ctx.activePlayerCount >= 4) {
      actions.add("start_game");
    }
  }

  if (isGameActive && isActivePlayer) {
    actions.add("leave_game");

    if (ctx.activeRoundPhase === "submitting") {
      if (!ctx.submissionClosesAt || ctx.submissionClosesAt > ctx.now) {
        actions.add("submit_song");
      }
    }

    if (ctx.activeRoundPhase === "voting") {
      if (!ctx.votingClosesAt || ctx.votingClosesAt > ctx.now) {
        actions.add("cast_ballot");
      }
    }
  }

  if (isGameActive && isCreator && ctx.activeRoundPhase !== null) {
    actions.add("transition_round");
  }

  return actions;
}
