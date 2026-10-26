CREATE TYPE "public"."group_file_type" AS ENUM('image', 'pdf');--> statement-breakpoint
ALTER TYPE "public"."group_post_kind" ADD VALUE 'message';--> statement-breakpoint
CREATE TABLE "group_upload" (
	"key" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"uploader_id" text NOT NULL,
	"file_type" "group_file_type" NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "group_post_feed_idx";--> statement-breakpoint
ALTER TABLE "group_post" ADD COLUMN "file_type" "group_file_type";--> statement-breakpoint
ALTER TABLE "group_post" ADD COLUMN "file_key" text;--> statement-breakpoint
ALTER TABLE "group_post" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "group_post" ADD COLUMN "file_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "group_upload" ADD CONSTRAINT "group_upload_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_upload" ADD CONSTRAINT "group_upload_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_upload_created_idx" ON "group_upload" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "group_upload_group_idx" ON "group_upload" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_post_feed_idx" ON "group_post" USING btree ("group_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "group_post" ADD CONSTRAINT "group_post_file_complete" CHECK (("group_post"."file_type" is null and "group_post"."file_key" is null and "group_post"."file_name" is null and "group_post"."file_size_bytes" is null) or ("group_post"."file_type" is not null and "group_post"."file_key" is not null and "group_post"."file_name" is not null and "group_post"."file_size_bytes" is not null));