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
