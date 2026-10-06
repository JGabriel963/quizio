CREATE TYPE "public"."answer_correctness" AS ENUM('correct', 'partiallyCorrect', 'wrong');--> statement-breakpoint
CREATE TYPE "public"."game_end_reason" AS ENUM('host', 'replaced', 'expired', 'quizDeleted');--> statement-breakpoint
CREATE TYPE "public"."game_phase" AS ENUM('gameIntro', 'questionIntro', 'answering', 'results', 'scoreboard');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('lobby', 'playing', 'finished', 'ended');--> statement-breakpoint
CREATE TYPE "public"."question_points" AS ENUM('standard', 'double', 'noPoints');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('quiz', 'trueFalse');--> statement-breakpoint
CREATE TYPE "public"."quiz_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."quiz_visibility" AS ENUM('private', 'unlisted');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"quiz_id" text NOT NULL,
	"quiz_version" integer NOT NULL,
	"title" text NOT NULL,
	"pin" text NOT NULL,
	"status" "game_status" DEFAULT 'lobby' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"show_questions_on_devices" boolean DEFAULT false NOT NULL,
	"randomize_questions" boolean DEFAULT false NOT NULL,
	"randomize_answers" boolean DEFAULT false NOT NULL,
	"autoplay_since" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" "game_end_reason",
	"question_count" integer DEFAULT 0 NOT NULL,
	"question_index" integer,
	"phase" "game_phase",
	"phase_started_at" timestamp with time zone,
	"host_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_answer" (
	"game_id" text NOT NULL,
	"question_index" integer NOT NULL,
	"player_id" text NOT NULL,
	"choice_ids" jsonb NOT NULL,
	"response_time_ms" integer NOT NULL,
	"correctness" "answer_correctness" NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "game_answer_game_id_question_index_player_id_pk" PRIMARY KEY("game_id","question_index","player_id")
);
--> statement-breakpoint
CREATE TABLE "game_player" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"nickname" text NOT NULL,
	"nickname_key" text NOT NULL,
	"secret" text NOT NULL,
	"first_question_index" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "game_question" (
	"game_id" text NOT NULL,
	"index" integer NOT NULL,
	"question" jsonb NOT NULL,
	CONSTRAINT "game_question_game_id_index_pk" PRIMARY KEY("game_id","index")
);
--> statement-breakpoint
CREATE TABLE "host_preferences" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"show_questions_on_devices" boolean DEFAULT false NOT NULL,
	"randomize_questions" boolean DEFAULT false NOT NULL,
	"randomize_answers" boolean DEFAULT false NOT NULL,
	"autoplay" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"position" integer NOT NULL,
	"type" "question_type" NOT NULL,
	"text" text,
	"time_limit_seconds" integer DEFAULT 20 NOT NULL,
	"points" "question_points" DEFAULT 'standard' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"image" jsonb
);
--> statement-breakpoint
CREATE TABLE "quiz" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text,
	"description" text,
	"cover_image_key" text,
	"visibility" "quiz_visibility" DEFAULT 'private' NOT NULL,
	"status" "quiz_status" DEFAULT 'draft' NOT NULL,
	"published_version" integer,
	"published_at" timestamp with time zone,
	"has_unpublished_changes" boolean DEFAULT false NOT NULL,
	"search_title" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"trashed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quiz_version" (
	"quiz_id" text NOT NULL,
	"number" integer NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "quiz_version_quiz_id_number_pk" PRIMARY KEY("quiz_id","number")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"game_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"trashed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attempt_window" (
	"key" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_player_id_game_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."game_player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_player" ADD CONSTRAINT "game_player_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_question" ADD CONSTRAINT "game_question_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_preferences" ADD CONSTRAINT "host_preferences_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_version" ADD CONSTRAINT "quiz_version_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "game_unended_pin_idx" ON "game" USING btree ("pin") WHERE "game"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "game_unended_quiz_idx" ON "game" USING btree ("quiz_id") WHERE "game"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "game_owner_ended_idx" ON "game" USING btree ("owner_id","ended_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_player_nickname_idx" ON "game_player" USING btree ("game_id","nickname_key");--> statement-breakpoint
CREATE INDEX "game_player_joined_idx" ON "game_player" USING btree ("game_id","joined_at");--> statement-breakpoint
CREATE INDEX "question_quiz_position_idx" ON "question" USING btree ("quiz_id","position");--> statement-breakpoint
CREATE INDEX "quiz_owner_trashed_updated_idx" ON "quiz" USING btree ("owner_id","trashed_at","updated_at");