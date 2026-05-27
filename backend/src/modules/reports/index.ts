import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest, auditPhiAccess } from '../../middleware';
import { AuditAction } from '../audit/audit.service';
import { toValidationError } from '../../utils/validation';
import * as reportsService from './reports.service';
import { renderVitalsSummaryPdf } from './reports.pdf';
import {
    patientVitalsSummaryQuerySchema,
    productivityQuerySchema,
    rpmMinutesQuerySchema,
} from './reports.schemas';

const router = Router();

/**
 * GET /reports/vitals-summary
 * Patient pulls their own vitals summary as JSON.
 */
router.get(
    '/vitals-summary',
    requireAuth,
    auditPhiAccess(AuditAction.REPORT_VITALS_SUMMARY, 'Report'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = patientVitalsSummaryQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const summary = await reportsService.buildVitalsSummaryForMe(
                user.sub,
                user.role,
                parsed.data.days,
            );
            res.json(summary);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /reports/vitals-summary.pdf
 * Patient pulls their own vitals summary as a downloadable PDF.
 */
router.get(
    '/vitals-summary.pdf',
    requireAuth,
    auditPhiAccess(AuditAction.REPORT_VITALS_SUMMARY_PDF, 'Report'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = patientVitalsSummaryQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const summary = await reportsService.buildVitalsSummaryForMe(
                user.sub,
                user.role,
                parsed.data.days,
            );
            const pdf = await renderVitalsSummaryPdf(summary);
            const safeName = summary.patient.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'patient';
            const fname = `vitals-summary-${safeName}-${parsed.data.days}d.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
            res.setHeader('Content-Length', String(pdf.length));
            res.send(pdf);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /reports/rpm-minutes
 * Doctor view: per-patient RPM minutes for a calendar month, with
 * CPT 99457 / 99458 derivations.
 */
router.get(
    '/rpm-minutes',
    requireAuth,
    auditPhiAccess(AuditAction.REPORT_RPM_MINUTES, 'Report'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = rpmMinutesQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await reportsService.buildRpmMinutesReport(
                user.sub,
                user.role,
                parsed.data,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /reports/productivity
 * Doctor view: appointment volume, response/duration averages, completion vs
 * decline rate, per-day completed series for charting.
 */
router.get(
    '/productivity',
    requireAuth,
    auditPhiAccess(AuditAction.REPORT_PRODUCTIVITY, 'Report'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = productivityQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await reportsService.buildProductivityReport(
                user.sub,
                user.role,
                parsed.data.days,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

export { router as reportsRouter };
