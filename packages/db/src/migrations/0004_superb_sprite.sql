CREATE TYPE "public"."participant_phase" AS ENUM('ready', 'answering', 'results', 'scoreboard', 'finished');--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "participant_phase" "participant_phase";--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "progress_question_index" integer;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "progress_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game_player" ADD COLUMN "choice_order" jsonb;