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
