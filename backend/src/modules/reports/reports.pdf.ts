/**
 * PDF renderers for the Reports module. Built on pdfkit so the file is small,
 * has no runtime dependency on a browser, and streams directly to the HTTP
 * response. Each renderer returns a Buffer; the route layer sets the
 * `application/pdf` content-type and pipes it.
 */
import PDFDocument from 'pdfkit';
import type { PatientVitalsSummary } from './reports.service';

const BRAND_ORANGE = '#f58220';
const SLATE_900 = '#0f172a';
const SLATE_600 = '#475569';
const SLATE_400 = '#94a3b8';
const SLATE_100 = '#f1f5f9';
const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const ROSE = '#f43f5e';

function statusColor(status: string): string {
    if (status === 'CRITICAL') return ROSE;
    if (status === 'WARNING') return AMBER;
    return EMERALD;
}

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
    });
}

export async function renderVitalsSummaryPdf(summary: PatientVitalsSummary): Promise<Buffer> {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: {
            Title: `Vitals Summary — ${summary.patient.name}`,
            Author: 'BacancyTeleCare',
            Subject: 'Patient vitals summary',
        },
    });

    // ── Header band
    doc.rect(0, 0, doc.page.width, 80).fill(BRAND_ORANGE);
    doc.fillColor('white')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Vitals Summary', 48, 28)
        .fontSize(10)
        .font('Helvetica')
        .text('BacancyTeleCare — Remote vitals report', 48, 54);

    // ── Patient block
    doc.fillColor(SLATE_900)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(summary.patient.name, 48, 104);

    const fromLabel = new Date(summary.window.from).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const toLabel = new Date(summary.window.to).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    doc.fillColor(SLATE_600)
        .fontSize(10)
        .font('Helvetica')
        .text(`${summary.patient.email}`, 48, 124)
        .text(`Window: ${fromLabel} — ${toLabel}  ·  ${summary.window.days} days`, 48, 138);

    // ── Totals strip
    const totalsY = 168;
    drawStat(doc, 48, totalsY, 'Total readings', String(summary.totals.readings));
    drawStat(doc, 175, totalsY, 'In normal range', `${summary.totals.normalPct}%`);
    drawStat(doc, 302, totalsY, 'Warning', String(summary.totals.warning), AMBER);
    drawStat(doc, 429, totalsY, 'Critical', String(summary.totals.critical), ROSE);

    // ── Per-vital table
    let y = totalsY + 70;
    doc.fillColor(SLATE_900).fontSize(12).font('Helvetica-Bold').text('Per-vital breakdown', 48, y);
    y += 22;

    drawTableHeader(doc, y);
    y += 22;
    for (const row of summary.perVital) {
        if (y > doc.page.height - 80) {
            doc.addPage();
            y = 48;
            drawTableHeader(doc, y);
            y += 22;
        }
        drawTableRow(doc, y, row);
        y += 26;
    }

    // ── Footer
    doc.fontSize(8)
        .fillColor(SLATE_400)
        .font('Helvetica')
        .text(
            `Generated ${new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            })}  ·  This summary is patient-recorded data and is not a clinical diagnosis.`,
            48,
            doc.page.height - 48,
            { width: doc.page.width - 96, align: 'center' },
        );

    return streamToBuffer(doc);
}

function drawStat(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    label: string,
    value: string,
    accent: string = SLATE_900,
) {
    doc.roundedRect(x, y, 115, 56, 8).fillAndStroke(SLATE_100, SLATE_100);
    doc.fillColor(SLATE_400)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(label.toUpperCase(), x + 12, y + 10, { characterSpacing: 0.5 });
    doc.fillColor(accent)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(value, x + 12, y + 26);
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
    doc.fillColor(SLATE_400).fontSize(9).font('Helvetica-Bold');
    doc.text('VITAL', 48, y);
    doc.text('READINGS', 200, y);
    doc.text('MIN', 270, y);
    doc.text('AVG', 320, y);
    doc.text('MAX', 370, y);
    doc.text('LATEST', 420, y);
    doc.text('STATUS', 500, y);
    doc.moveTo(48, y + 14)
        .lineTo(doc.page.width - 48, y + 14)
        .strokeColor(SLATE_100)
        .stroke();
}

function drawTableRow(
    doc: PDFKit.PDFDocument,
    y: number,
    row: PatientVitalsSummary['perVital'][number],
) {
    doc.fillColor(SLATE_900).fontSize(10).font('Helvetica-Bold').text(row.label, 48, y);
    doc.fillColor(SLATE_600)
        .fontSize(9)
        .font('Helvetica')
        .text(`Normal ${row.normalRange}`, 48, y + 12);

    doc.fillColor(SLATE_900).fontSize(10).font('Helvetica');
    doc.text(String(row.count), 200, y + 4);
    doc.text(row.min == null ? '—' : row.min.toString(), 270, y + 4);
    doc.text(row.avg == null ? '—' : (Math.round(row.avg * 10) / 10).toString(), 320, y + 4);
    doc.text(row.max == null ? '—' : row.max.toString(), 370, y + 4);

    if (row.latest) {
        doc.text(`${row.latest.value} ${row.unit}`, 420, y + 4);
        const color = statusColor(row.latest.status);
        doc.roundedRect(500, y + 2, 56, 14, 7)
            .fillAndStroke(color, color)
            .fillColor('white')
            .fontSize(7)
            .font('Helvetica-Bold')
            .text(row.latest.status, 500, y + 6, { width: 56, align: 'center' });
    } else {
        doc.fillColor(SLATE_400).text('No data', 420, y + 4);
    }
}
