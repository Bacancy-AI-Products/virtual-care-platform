export interface MedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionCanvasParams {
  doctorName: string;
  specialization: string;
  patientName: string;
  date: string;
  medicines: MedicineItem[];
  notes: string;
}

export async function buildPrescriptionPng(params: PrescriptionCanvasParams): Promise<Blob> {
  const { doctorName, specialization, patientName, date, medicines, notes } = params;
  const W = 800;
  const PAD = 48;

  const validMeds = medicines.filter(m => m.name.trim());
  const medsH = validMeds.length * 56 + 60;
  const notesH = notes.trim() ? Math.ceil(notes.length / 90) * 20 + 80 : 0;
  const totalH = 240 + medsH + notesH + 80;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, totalH);

  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(0, 0, W, 6);

  let y = 44;

  ctx.fillStyle = '#0ea5e9';
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillText('℞', PAD, y + 28);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('BacancyTeleCare Medical Consultation', W - PAD, y + 10);
  ctx.textAlign = 'left';

  y += 52;

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px Arial, sans-serif';
  const displayDoctorName = /^dr\.?\s/i.test(doctorName) ? doctorName : `Dr. ${doctorName}`;
  ctx.fillText(displayDoctorName, PAD, y);
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillText(specialization, PAD, y + 20);

  y += 50;

  const drawDivider = () => {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
  };

  drawDivider();
  y += 22;

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.fillText('PATIENT', PAD, y);
  ctx.textAlign = 'right';
  ctx.fillText('DATE', W - PAD, y);
  ctx.textAlign = 'left';

  y += 16;

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText(patientName, PAD, y);
  ctx.textAlign = 'right';
  ctx.fillText(date, W - PAD, y);
  ctx.textAlign = 'left';

  y += 28;
  drawDivider();
  y += 24;

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.fillText('MEDICINES', PAD, y);
  y += 22;

  validMeds.forEach(med => {
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(PAD + 5, y + 4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(med.name, PAD + 18, y + 9);
    y += 24;

    const parts: string[] = [];
    if (med.dosage) parts.push(`Dosage: ${med.dosage}`);
    if (med.frequency) parts.push(`Frequency: ${med.frequency}`);
    if (med.duration) parts.push(`Duration: ${med.duration}`);

    if (parts.length > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(parts.join('   ·   '), PAD + 18, y);
      y += 18;
    }
    y += 12;
  });

  if (notes.trim()) {
    y += 8;
    drawDivider();
    y += 22;

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillText("DOCTOR'S ADVICE", PAD, y);
    y += 18;

    ctx.fillStyle = '#475569';
    ctx.font = 'italic 13px Arial, sans-serif';
    const maxW = W - PAD * 2;
    const words = notes.split(' ');
    let line = '';
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), PAD, y);
        line = word + ' ';
        y += 20;
      } else {
        line = test;
      }
    }
    if (line.trim()) { ctx.fillText(line.trim(), PAD, y); y += 20; }
    y += 10;
  }

  y += 24;
  drawDivider();
  y += 18;

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Digital prescription generated via BacancyTeleCare • Not a substitute for professional medical advice', W / 2, y);

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
}
