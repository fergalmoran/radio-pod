CREATE TYPE "public"."show_recurrence" AS ENUM('once', 'weekly', 'monthly');--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "recurrence" "show_recurrence" DEFAULT 'once' NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "series_id" integer;