ALTER TABLE "generation_usage" DROP CONSTRAINT "generation_usage_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "generation_usage" ALTER COLUMN "owner_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_usage" ADD CONSTRAINT "generation_usage_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;