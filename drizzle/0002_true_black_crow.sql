CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TABLE "battle" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"creatorId" text NOT NULL,
	"status" text,
	"visibility" text,
	"maxPlayers" integer,
	"doubleSubmissions" boolean,
	"inviteCode" text,
	"currentStageId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" text PRIMARY KEY NOT NULL,
	"battleId" text NOT NULL,
	"userId" text NOT NULL,
	"joinedAt" integer,
	"totalStarsEarned" integer,
	"stagesWon" integer
);
--> statement-breakpoint
CREATE TABLE "stage" (
	"id" text PRIMARY KEY NOT NULL,
	"battleId" text NOT NULL,
	"stageNumber" integer,
	"vibe" text,
	"description" text,
	"submissionDeadline" integer,
	"votingDeadline" integer,
	"phase" text,
	"playlistUrl" text,
	"spotifyPlaylistId" text
);
--> statement-breakpoint
CREATE TABLE "star" (
	"id" text PRIMARY KEY NOT NULL,
	"stageId" text NOT NULL,
	"voterId" text NOT NULL,
	"submissionId" text NOT NULL,
	"votedAt" integer
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" text PRIMARY KEY NOT NULL,
	"stageId" text NOT NULL,
	"userId" text NOT NULL,
	"spotifyUrl" text,
	"submissionOrder" integer,
	"submittedAt" integer,
	"starsReceived" integer
);
--> statement-breakpoint
DROP TABLE "profile" CASCADE;--> statement-breakpoint
ALTER TABLE "public"."account" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."session" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."user" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."verification" SET SCHEMA "auth";
