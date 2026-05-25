-- AlterTable
ALTER TABLE "files" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "iv" TEXT,
ADD COLUMN     "key_id" TEXT,
ADD COLUMN     "tag" TEXT;
