CREATE TYPE "public"."show_live_status" AS ENUM('offline', 'live');--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "stream_key" text;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "live_status" "show_live_status" DEFAULT 'offline' NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "live_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_stream_key_unique" UNIQUE("stream_key");