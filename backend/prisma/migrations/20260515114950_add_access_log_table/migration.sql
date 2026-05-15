-- CreateTable
CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "http_method" TEXT,
    "path" TEXT,
    "status_code" INTEGER,
    "success" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "prev_hash" TEXT,
    "hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_logs_user_id_created_at_idx" ON "access_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "access_logs_action_created_at_idx" ON "access_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "access_logs_resource_type_resource_id_idx" ON "access_logs"("resource_type", "resource_id");
