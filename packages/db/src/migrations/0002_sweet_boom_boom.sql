ALTER TABLE "game" ADD COLUMN "game_characters" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "character" text DEFAULT 'koala' NOT NULL;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "accessory" text;--> statement-breakpoint
ALTER TABLE "host_preferences" ADD COLUMN "game_characters" boolean DEFAULT true NOT NULL;