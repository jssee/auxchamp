type StagePhase = "upcoming" | "submission" | "voting" | "closed";

export type StageWithBattle = {
  id: string;
  phase: StagePhase;
  submissionDeadline: Date;
  votingDeadline: Date;
  spotifyPlaylistId: string | null;
  battle: {
    status: string;
    currentStageId: string | null;
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
  now?: Date;
  userSubmissions?: Array<{ id: string }>;
  otherSubmissions?: SubmissionRef[];
  userVotes?: VoteRef[];
}) {
  const {
    stage,
    user,
    now = new Date(),
    userSubmissions = [],
    otherSubmissions = [],
    userVotes = [],
  } = input;

  const isStageActive =
    stage.battle.status === "active" &&
    stage.battle.currentStageId === stage.id;

  const showOtherSubmissions = shouldShowOtherSubmissions(stage.phase);
  const hasVoted = userVotes.length > 0;
  const votedSubmissionIds = userVotes.map((vote) => vote.submissionId);
  const votableSubmissions = otherSubmissions.filter(
    (submission) => submission.userId !== user.id,
  );

  const inSubmissionPhase =
    stage.phase === "submission" && now < stage.submissionDeadline;

  const inVotingPhase =
    now >= stage.submissionDeadline && now < stage.votingDeadline;

  const canVote =
    inVotingPhase &&
    !hasVoted &&
    otherSubmissions.length >= 4 &&
    votableSubmissions.length >= 3;

  const maxSubmissions = stage.battle.doubleSubmissions ? 2 : 1;
  const canSubmit = inSubmissionPhase && userSubmissions.length < maxSubmissions;

  const isCreator = stage.battle.creatorId === user.id;
  const canCreatePlaylist =
    isCreator && stage.phase === "submission" && !stage.spotifyPlaylistId;

  return {
    isStageActive,
    showOtherSubmissions,
    hasVoted,
    votedSubmissionIds,
    votableSubmissions,
    inSubmissionPhase,
    inVotingPhase,
    canVote,
    maxSubmissions,
    canSubmit,
    isCreator,
    canCreatePlaylist,
  };
}

type SubmitRules = Pick<
  ReturnType<typeof computeStageRules>,
  "canSubmit" | "inSubmissionPhase" | "maxSubmissions"
>;

export function getSubmitErrorMessage(rules: SubmitRules): string | null {
  if (rules.canSubmit) return null;
  if (!rules.inSubmissionPhase) return "Submission deadline has passed";
  return `Maximum ${rules.maxSubmissions} submission(s) allowed`;
}
