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

function windowOpen(closesAt: Date | null, now: Date) {
  return !closesAt || closesAt > now;
}

/** Each action paired with the predicate that enables it. */
const rules: [Action, (ctx: CapabilityContext) => boolean][] = [
  ["accept_invite", (ctx) => ctx.actorStatus === "invited"],
  ["edit_game", (ctx) => ctx.gameState === "draft" && ctx.actorRole === "creator"],
  ["edit_future_round", (ctx) => ctx.gameState === "draft" && ctx.actorRole === "creator"],
  ["invite_player", (ctx) => ctx.gameState === "draft" && ctx.actorRole === "creator"],
  [
    "start_game",
    (ctx) =>
      ctx.gameState === "draft" &&
      ctx.actorRole === "creator" &&
      ctx.roundCount >= 1 &&
      ctx.activePlayerCount >= 4,
  ],
  ["leave_game", (ctx) => ctx.gameState === "active" && ctx.actorStatus === "active"],
  [
    "submit_song",
    (ctx) =>
      ctx.gameState === "active" &&
      ctx.actorStatus === "active" &&
      ctx.activeRoundPhase === "submitting" &&
      windowOpen(ctx.submissionClosesAt, ctx.now),
  ],
  [
    "cast_ballot",
    (ctx) =>
      ctx.gameState === "active" &&
      ctx.actorStatus === "active" &&
      ctx.activeRoundPhase === "voting" &&
      windowOpen(ctx.votingClosesAt, ctx.now),
  ],
  [
    "transition_round",
    (ctx) =>
      ctx.gameState === "active" && ctx.actorRole === "creator" && ctx.activeRoundPhase !== null,
  ],
];

export function getAllowedActions(ctx: CapabilityContext): ReadonlySet<Action> {
  if (!ctx.actorRole || !ctx.actorStatus) return new Set();
  return new Set(rules.filter(([, pred]) => pred(ctx)).map(([action]) => action));
}
