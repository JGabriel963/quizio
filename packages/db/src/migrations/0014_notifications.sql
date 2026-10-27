CREATE TABLE "group_notice" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"group_name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_inbox" (
	"user_id" text PRIMARY KEY NOT NULL,
	"seen_at" timestamp with time zone,
	"read_all_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_read" (
	"user_id" text NOT NULL,
	"notification_id" text NOT NULL,
	"read_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_read_user_id_notification_id_pk" PRIMARY KEY("user_id","notification_id")
);
--> statement-breakpoint
ALTER TABLE "group_notice" ADD CONSTRAINT "group_notice_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_inbox" ADD CONSTRAINT "notification_inbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_read" ADD CONSTRAINT "notification_read_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_notice_user_idx" ON "group_notice" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
-- Spec 040 (ADR 0020): the groups' history is not news to the accounts that
-- already exist, so they start with everything read and seen.
INSERT INTO "notification_inbox" ("user_id", "seen_at", "read_all_at") SELECT "id", now(), now() FROM "user" ON CONFLICT DO NOTHING;
