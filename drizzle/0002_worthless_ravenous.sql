ALTER TABLE "shows" DROP CONSTRAINT "shows_stream_key_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stream_key" text;--> statement-breakpoint
ALTER TABLE "shows" DROP COLUMN "stream_key";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stream_key_unique" UNIQUE("stream_key");