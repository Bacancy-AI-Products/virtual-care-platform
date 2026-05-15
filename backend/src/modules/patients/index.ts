import { Router, Request, Response, NextFunction } from 'express';
import {
    requireAuth,
    requireRole,
    type AuthenticatedRequest,
    auditPhiAccess,
} from '../../middleware';
import { AuditAction } from '../audit/audit.service';
import { toValidationError } from '../../utils/validation';
import * as patientsService from './patients.service';
import { patientIdParamSchema, updatePatientProfileSchema } from './patients.schemas';

const router = Router();

/**
 * PUT /patients/me
 * Update own patient profile. Patient-only. Must be defined before /:id.
 */
router.put(
    '/me',
    requireAuth,
    requireRole('PATIENT'),
    auditPhiAccess(AuditAction.PATIENT_PROFILE_UPDATE, 'Patient'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = updatePatientProfileSchema.safeParse(req.body);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const userId = (req as AuthenticatedRequest).user!.sub;
            const result = await patientsService.updateMyProfile(userId, parsed.data);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /patients/:id
 * Get patient evaluation data. Doctor-only; must have an appointment with this patient.
 */
router.get(
    '/:id',
    requireAuth,
    requireRole('DOCTOR'),
    auditPhiAccess(AuditAction.PATIENT_PROFILE_READ, 'Patient'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = patientIdParamSchema.safeParse(req.params);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const userId = (req as AuthenticatedRequest).user!.sub;
            const result = await patientsService.getPatientForDoctor(parsed.data.id, userId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

export { router as patientsRouter };
