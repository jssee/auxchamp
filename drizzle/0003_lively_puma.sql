ALTER TABLE "battle" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "battle" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "battle" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "battle" ALTER COLUMN "maxPlayers" SET DEFAULT 8;--> statement-breakpoint
ALTER TABLE "battle" ALTER COLUMN "doubleSubmissions" SET DEFAULT false;