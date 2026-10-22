ALTER TYPE "public"."question_type" ADD VALUE 'typeAnswer';--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "review_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "review_closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game_answer" ADD COLUMN "text" text;--> statement-breakpoint
ALTER TABLE "game_answer" ADD COLUMN "reviewed_at" timestamp with time zone;