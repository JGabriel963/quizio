CREATE TABLE "media_upload" (
	"key" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "media_upload_created_idx" ON "media_upload" USING btree ("created_at");