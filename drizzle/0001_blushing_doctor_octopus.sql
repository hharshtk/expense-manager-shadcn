ALTER TABLE "users" ALTER COLUMN "locale" SET DATA TYPE varchar(15);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "locale" SET DEFAULT 'en-US';