CREATE TYPE "public"."game_mode" AS ENUM('live', 'assignment');--> statement-breakpoint
CREATE TABLE "assignment_preferences" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"game_characters" boolean DEFAULT false NOT NULL,
	"question_timer" boolean DEFAULT true NOT NULL,
	"randomize_answers" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "game_unended_quiz_idx";--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "mode" "game_mode" DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "question_timer" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_preferences" ADD CONSTRAINT "assignment_preferences_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_assignment_pin_idx" ON "game" USING btree ("pin","created_at") WHERE "game"."mode" = 'assignment';--> statement-breakpoint
CREATE UNIQUE INDEX "game_unended_quiz_idx" ON "game" USING btree ("quiz_id") WHERE "game"."ended_at" is null and "game"."mode" = 'live';