import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest, auditPhiAccess } from '../../middleware';
import { AuditAction } from '../audit/audit.service';
import { toValidationError } from '../../utils/validation';
import * as vitalsService from './vitals.service';
import {
    createVitalReadingSchema,
    listMyVitalsQuerySchema,
    patientIdParamSchema,
    recentStatusQuerySchema,
    trendsQuerySchema,
    vitalIdParamSchema,
} from './vitals.schemas';

const router = Router();

/**
 * GET /vitals/reference
 * Reference table (units, normal/valid ranges, label) for every vital type.
 * Public to authenticated users — no PHI involved.
 */
router.get('/reference', requireAuth, (_req: Request, res: Response) => {
    res.json({ data: vitalsService.getReferenceTable() });
});

/**
 * POST /vitals
 * Patient logs a new reading. Server derives status against the reference range.
 */
router.post(
    '/',
    requireAuth,
    auditPhiAccess(AuditAction.VITAL_CREATE, 'VitalReading'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = createVitalReadingSchema.safeParse(req.body);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await vitalsService.createReading(user.sub, user.role, parsed.data);
            res.status(201).json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /vitals/mine
 * Paginated list of the logged-in patient's own readings.
 */
router.get(
    '/mine',
    requireAuth,
    auditPhiAccess(AuditAction.VITAL_LIST, 'VitalReading'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = listMyVitalsQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await vitalsService.listForMe(user.sub, user.role, parsed.data);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /vitals/mine/trends
 * Patient-side trend series for charts (default 30-day window).
 */
router.get(
    '/mine/trends',
    requireAuth,
    auditPhiAccess(AuditAction.VITAL_TRENDS, 'VitalReading'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = trendsQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await vitalsService.getMyTrends(user.sub, user.role, parsed.data);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /vitals/patient/:patientId
 * Doctor-side list — access enforced by service (must have an appointment with patient).
 */
router.get(
    '/patient/:patientId',
    requireAuth,
    auditPhiAccess(AuditAction.VITAL_LIST, 'VitalReading'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const paramParsed = patientIdParamSchema.safeParse(req.params);
            if (!paramParsed.success) {
                next(toValidationError(paramParsed.error));
                return;
            }
            const queryParsed = listMyVitalsQuerySchema.safeParse(req.query);
            if (!queryParsed.success) {
                next(toValidationError(queryParsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await vitalsService.listForPatientByDoctor(
                user.sub,
                paramParsed.data.patientId,
                queryParsed.data,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /vitals/patient/:patientId/trends
 * Doctor-side trend series for a patient.
 */
router.get(
    '/patient/:patientId/trends',
    requireAuth,
    auditPhiAccess(AuditAction.VITAL_TRENDS, 'VitalReading'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const paramParsed = patientIdParamSchema.safeParse(req.params);
            if (!paramParsed.success) {
                next(toValidationError(paramParsed.error));
                return;
            }
            const queryParsed = trendsQuerySchema.safeParse(req.query);
            if (!queryParsed.success) {
                next(toValidationError(queryParsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await vitalsService.getTrendsForPatientByDoctor(
                user.sub,
                paramParsed.data.patientId,
                queryParsed.data,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /vitals/doctor/recent-status
 * One-shot summary of vitals status across the doctor's patient panel
 * (every patient with at least one appointment). Used by the doctor's
 * patients-list page to render the warning / critical badge.
 */
router.get(
    '/doctor/recent-status',
    requireAuth,
    auditPhiAccess(AuditAction.VITAL_LIST, 'VitalReading'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = recentStatusQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await vitalsService.getRecentStatusForDoctorPanel(
                user.sub,
                parsed.data.days,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * DELETE /vitals/:id
 * Patient deletes one of their own readings.
 */
router.delete(
    '/:id',
    requireAuth,
    auditPhiAccess(AuditAction.VITAL_DELETE, 'VitalReading'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = vitalIdParamSchema.safeParse(req.params);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await vitalsService.deleteReading(user.sub, user.role, parsed.data.id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

export { router as vitalsRouter };
