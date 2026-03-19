-- AlterTable: make storage_key nullable (for DB-stored blobs)
ALTER TABLE "files" ALTER COLUMN "storage_key" DROP NOT NULL;

-- AlterTable: add data column for blob storage
ALTER TABLE "files" ADD COLUMN "data" BYTEA;
