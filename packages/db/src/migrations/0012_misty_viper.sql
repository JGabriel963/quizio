ALTER TYPE "public"."group_post_kind" ADD VALUE 'quizShare';--> statement-breakpoint
ALTER TYPE "public"."group_post_kind" ADD VALUE 'quizzesShare';--> statement-breakpoint
CREATE TABLE "group_shared_quiz" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"quiz_id" text NOT NULL,
	"shared_by_id" text NOT NULL,
	"shared_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "game_unended_quiz_idx";--> statement-breakpoint
ALTER TABLE "group_post" ADD COLUMN "shared_quiz_id" text;--> statement-breakpoint
ALTER TABLE "group_shared_quiz" ADD CONSTRAINT "group_shared_quiz_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_shared_quiz" ADD CONSTRAINT "group_shared_quiz_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_shared_quiz" ADD CONSTRAINT "group_shared_quiz_member_fk" FOREIGN KEY ("group_id","shared_by_id") REFERENCES "public"."group_member"("group_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_shared_quiz_idx" ON "group_shared_quiz" USING btree ("group_id","quiz_id");--> statement-breakpoint
CREATE INDEX "group_shared_quiz_recent_idx" ON "group_shared_quiz" USING btree ("group_id","shared_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "group_shared_quiz_quiz_idx" ON "group_shared_quiz" USING btree ("quiz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_unended_quiz_idx" ON "game" USING btree ("quiz_id","owner_id") WHERE "game"."ended_at" is null and "game"."mode" = 'live';--> statement-breakpoint
ALTER TABLE "group_post" ADD CONSTRAINT "group_post_shared_quiz" CHECK (("group_post"."kind"::text = 'quizShare') = ("group_post"."shared_quiz_id" is not null));