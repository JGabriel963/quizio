ALTER TABLE "generation_usage" ADD COLUMN "credits" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_usage" ADD COLUMN "instance_credits" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "generation_usage_created_idx" ON "generation_usage" USING btree ("created_at");