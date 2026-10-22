ALTER TYPE "public"."answer_correctness" ADD VALUE 'almostCorrect';--> statement-breakpoint
ALTER TYPE "public"."question_type" ADD VALUE 'slider';--> statement-breakpoint
ALTER TABLE "game_answer" ADD COLUMN "value" numeric(14, 2);