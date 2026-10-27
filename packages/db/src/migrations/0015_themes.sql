ALTER TABLE "game" ADD COLUMN "theme_id" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz" ADD COLUMN "theme_id" text DEFAULT 'standard' NOT NULL;