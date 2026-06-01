-- CreateEnum
CREATE TYPE "TriageUrgency" AS ENUM ('SELF_CARE', 'ROUTINE', 'URGENT', 'EMERGENCY');

-- CreateTable
CREATE TABLE "symptom_checks" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "symptoms_text" TEXT NOT NULL,
    "age_band" TEXT,
    "sex" "Gender",
    "urgency" "TriageUrgency" NOT NULL,
    "specialization_id" TEXT,
    "recommendation" TEXT NOT NULL,
    "doctor_handoff_summary" TEXT NOT NULL,
    "red_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model_version" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "raw_llm_response" TEXT,
    "raw_response_purge_at" TIMESTAMP(3),
    "resulting_appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "symptom_checks_patient_id_created_at_idx" ON "symptom_checks"("patient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "symptom_checks_raw_response_purge_at_idx" ON "symptom_checks"("raw_response_purge_at");

-- AddForeignKey
ALTER TABLE "symptom_checks" ADD CONSTRAINT "symptom_checks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_checks" ADD CONSTRAINT "symptom_checks_specialization_id_fkey" FOREIGN KEY ("specialization_id") REFERENCES "specializations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_checks" ADD CONSTRAINT "symptom_checks_resulting_appointment_id_fkey" FOREIGN KEY ("resulting_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
