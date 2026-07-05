ALTER TYPE "public"."show_live_status" ADD VALUE 'starting' BEFORE 'live';--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "live_armed_at" timestamp;