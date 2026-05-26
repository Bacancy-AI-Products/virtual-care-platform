-- CreateEnum
CREATE TYPE "VitalType" AS ENUM ('BP_SYSTOLIC', 'BP_DIASTOLIC', 'HEART_RATE', 'BLOOD_SUGAR', 'SPO2', 'TEMPERATURE', 'WEIGHT');

-- CreateEnum
CREATE TYPE "VitalStatus" AS ENUM ('NORMAL', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "VitalEntryMethod" AS ENUM ('MANUAL', 'BLUETOOTH_DEVICE', 'CONNECTED_APP', 'IMPORTED');

-- CreateTable
CREATE TABLE "vital_readings" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "type" "VitalType" NOT NULL,
    "value" DECIMAL(8,2) NOT NULL,
    "unit" VARCHAR(16) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "entry_method" "VitalEntryMethod" NOT NULL DEFAULT 'MANUAL',
    "status" "VitalStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vital_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vital_readings_patient_id_recorded_at_idx" ON "vital_readings"("patient_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vital_readings_patient_id_type_recorded_at_idx" ON "vital_readings"("patient_id", "type", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vital_readings_patient_id_status_recorded_at_idx" ON "vital_readings"("patient_id", "status", "recorded_at" DESC);

-- AddForeignKey
ALTER TABLE "vital_readings" ADD CONSTRAINT "vital_readings_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
