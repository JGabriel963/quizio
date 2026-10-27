ALTER TYPE "public"."quiz_visibility" ADD VALUE 'public';--> statement-breakpoint
CREATE TABLE "account_deletion_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_photo" (
	"user_id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_photo" ADD CONSTRAINT "profile_photo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Spec 039, RN-25: "Não listado" never had an effect and left the product;
-- those quizzes become private. The value stays in the type, which Postgres
-- cannot drop, and only uses an old value, so it runs with the ADD VALUE above.
UPDATE "quiz" SET "visibility" = 'private' WHERE "visibility" = 'unlisted';
