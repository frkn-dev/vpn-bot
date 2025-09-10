-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "expired_at" SET DEFAULT (now() + '3 days'::interval);
