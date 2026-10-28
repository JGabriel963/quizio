CREATE TABLE "custom_theme" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"look" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theme_upload" (
	"key" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "custom_theme" jsonb;--> statement-breakpoint
ALTER TABLE "quiz" ADD COLUMN "custom_theme_id" text;--> statement-breakpoint
ALTER TABLE "custom_theme" ADD CONSTRAINT "custom_theme_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_upload" ADD CONSTRAINT "theme_upload_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_theme_owner_created_idx" ON "custom_theme" USING btree ("owner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "theme_upload_created_idx" ON "theme_upload" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_custom_theme_id_custom_theme_id_fk" FOREIGN KEY ("custom_theme_id") REFERENCES "public"."custom_theme"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_custom_theme_idx" ON "quiz" USING btree ("custom_theme_id");