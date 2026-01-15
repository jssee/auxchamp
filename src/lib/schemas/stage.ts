import * as v from "valibot";

export const submitSchema = v.object({
  stageId: v.string(),
  spotifyUrl: v.pipe(v.string(), v.url()),
  note: v.optional(v.pipe(v.string(), v.maxLength(280))),
});

export const voteSchema = v.object({
  stageId: v.string(),
  submissionId: v.string(),
});

export const castVotesSchema = v.pipe(
  v.object({
    stageId: v.string(),
    submissionIds: v.pipe(
      v.array(v.string()),
      v.length(3, "Must select exactly 3 submissions"),
    ),
  }),
  v.forward(
    v.check(
      (input) => new Set(input.submissionIds).size === 3,
      "Cannot vote for the same submission twice",
    ),
    ["submissionIds"],
  ),
);

export const createPlaylistSchema = v.object({
  stageId: v.string(),
});
