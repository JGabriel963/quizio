CREATE TYPE "public"."group_post_kind" AS ENUM('assignment');--> statement-breakpoint
CREATE TABLE "group_post" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"author_id" text NOT NULL,
	"kind" "group_post_kind" NOT NULL,
	"message" text,
	"game_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_post_like" (
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "group_post_like_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "group_post" ADD CONSTRAINT "group_post_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post" ADD CONSTRAINT "group_post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_like" ADD CONSTRAINT "group_post_like_post_id_group_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."group_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_like" ADD CONSTRAINT "group_post_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_post_assignment_idx" ON "group_post" USING btree ("group_id","game_id") WHERE "group_post"."game_id" is not null;--> statement-breakpoint
CREATE INDEX "group_post_feed_idx" ON "group_post" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "group_post_game_idx" ON "group_post" USING btree ("game_id");