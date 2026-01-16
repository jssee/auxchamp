CREATE TABLE "spotify_credentials" (
	"id" text PRIMARY KEY DEFAULT 'service' NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"lifetimeStarsEarned" integer DEFAULT 0 NOT NULL,
	"lifetimeStagesWon" integer DEFAULT 0 NOT NULL,
	"battlesCompleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "player" ALTER COLUMN "joinedAt" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "star" ALTER COLUMN "votedAt" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "submission" ALTER COLUMN "submittedAt" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star" ADD CONSTRAINT "star_stageId_voterId_submissionId_unique" UNIQUE("stageId","voterId","submissionId");