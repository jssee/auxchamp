ALTER TABLE "stage" ALTER COLUMN "stageNumber" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "vibe" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "submissionDeadline" SET DATA TYPE timestamp USING to_timestamp("submissionDeadline");--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "submissionDeadline" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "votingDeadline" SET DATA TYPE timestamp USING to_timestamp("votingDeadline");--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "votingDeadline" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "phase" SET DEFAULT 'upcoming';--> statement-breakpoint
ALTER TABLE "stage" ALTER COLUMN "phase" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "battle" ADD COLUMN "authoritativeTimezone" text DEFAULT 'America/Los_Angeles' NOT NULL;--> statement-breakpoint
ALTER TABLE "battle" ADD COLUMN "stagesCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stage" ADD COLUMN "job_ids" json;--> statement-breakpoint
ALTER TABLE "stage" ADD CONSTRAINT "stage_battleId_stageNumber_unique" UNIQUE("battleId","stageNumber");