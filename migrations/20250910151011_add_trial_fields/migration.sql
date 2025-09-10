/*
  Warnings:

  - You are about to drop the column `daily_limit_mb` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "daily_limit_mb",
ADD COLUMN     "expired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_trial" BOOLEAN NOT NULL DEFAULT false;
