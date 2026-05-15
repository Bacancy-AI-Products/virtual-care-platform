-- HIPAA Phase 1.2 — Field-level encryption schema changes
--
-- Convert date_of_birth from DATE to TEXT so the column can hold either
-- a plain ISO date string ("YYYY-MM-DD") during migration or an AES-256-GCM
-- ciphertext after the backfill script runs.
--
-- The USING clause produces "YYYY-MM-DD" text for all existing rows.
-- NULL rows remain NULL.

-- AlterTable
ALTER TABLE "patients"
  ALTER COLUMN "date_of_birth" SET DATA TYPE TEXT
  USING TO_CHAR("date_of_birth", 'YYYY-MM-DD');
