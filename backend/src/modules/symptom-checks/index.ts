import { Router, Request, Response, NextFunction } from 'express';
import {
    requireAuth,
    requireRole,
    type AuthenticatedRequest,
    auditPhiAccess,
} from '../../middleware';
import { AuditAction } from '../audit/audit.service';
import { toValidationError } from '../../utils/validation';
import * as symptomChecksService from './symptom-checks.service';
import {
    createSymptomCheckSchema,
    listSymptomChecksQuerySchema,
    symptomCheckIdParamSchema,
} from './symptom-checks.schemas';

const router = Router();

/**
 * POST /symptom-checks
 * Submit a new symptom check. PATIENT only.
 * Returns the triage result + a list of suggested doctors.
 */
router.post(
    '/',
    requireAuth,
    requireRole('PATIENT'),
    auditPhiAccess(AuditAction.SYMPTOM_CHECK_CREATED, 'SymptomCheck'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = createSymptomCheckSchema.safeParse(req.body);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await symptomChecksService.createSymptomCheck(user.sub, parsed.data);
            if (result.kind === 'clarify') {
                // One-round clarification: stateless, no row created yet.
                res.status(200).json(result);
            } else {
                // Triage decision: row persisted, 201 Created.
                res.status(201).json(result);
            }
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /symptom-checks/me
 * Paginated list of the calling patient's symptom checks. PATIENT only.
 */
router.get(
    '/me',
    requireAuth,
    requireRole('PATIENT'),
    auditPhiAccess(AuditAction.SYMPTOM_CHECK_LIST, 'SymptomCheck'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = listSymptomChecksQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await symptomChecksService.listMySymptomChecks(user.sub, parsed.data);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /symptom-checks/:id
 * Fetch a single symptom check.
 *   - PATIENT: must be their own check.
 *   - DOCTOR:  must be linked to one of their appointments.
 *   - ADMIN:   full access.
 */
router.get(
    '/:id',
    requireAuth,
    auditPhiAccess(AuditAction.SYMPTOM_CHECK_VIEWED, 'SymptomCheck'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = symptomCheckIdParamSchema.safeParse(req.params);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await symptomChecksService.getSymptomCheck(
                parsed.data.id,
                user.sub,
                user.role,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

export { router as symptomChecksRouter };
