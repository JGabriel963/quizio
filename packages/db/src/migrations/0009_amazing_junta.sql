ALTER TABLE "group" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "members_can_invite" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "members_can_see_members" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "members_can_share" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "members_can_assign" boolean DEFAULT false NOT NULL;