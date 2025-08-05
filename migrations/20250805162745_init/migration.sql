-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "telegram_id" BIGINT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "env" TEXT NOT NULL DEFAULT 'tg',
    "daily_limit_mb" INTEGER NOT NULL DEFAULT 1024,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "public"."users"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_telegram_id_idx" ON "public"."users"("telegram_id");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_is_deleted_idx" ON "public"."users"("is_deleted");
