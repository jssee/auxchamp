CREATE TABLE "ballot" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"player_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ballot_round_id_player_id_unique" UNIQUE("round_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "star" (
	"id" text PRIMARY KEY NOT NULL,
	"ballot_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "star_ballot_id_submission_id_unique" UNIQUE("ballot_id","submission_id")
);
--> statement-breakpoint
ALTER TABLE "ballot" ADD CONSTRAINT "ballot_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot" ADD CONSTRAINT "ballot_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star" ADD CONSTRAINT "star_ballot_id_ballot_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."ballot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star" ADD CONSTRAINT "star_submission_id_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ballot_round_id_idx" ON "ballot" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "ballot_player_id_idx" ON "ballot" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "star_ballot_id_idx" ON "star" USING btree ("ballot_id");--> statement-breakpoint
CREATE INDEX "star_submission_id_idx" ON "star" USING btree ("submission_id");