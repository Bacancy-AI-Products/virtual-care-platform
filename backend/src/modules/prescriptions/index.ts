import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest, auditPhiAccess } from '../../middleware';
import { AuditAction } from '../audit/audit.service';
import { toValidationError } from '../../utils/validation';
import * as prescriptionsService from './prescriptions.service';
import {
    prescriptionIdParamSchema,
    appointmentIdParamSchema,
    createPrescriptionSchema,
    listMyPrescriptionsQuerySchema,
} from './prescriptions.schemas';

const router = Router();

/**
 * POST /prescriptions/appointment/:appointmentId
 * Doctor creates a prescription for an appointment.
 */
router.post(
    '/appointment/:appointmentId',
    requireAuth,
    auditPhiAccess(AuditAction.PRESCRIPTION_CREATE, 'Prescription'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const paramParsed = appointmentIdParamSchema.safeParse(req.params);
            if (!paramParsed.success) {
                next(toValidationError(paramParsed.error));
                return;
            }

            const bodyParsed = createPrescriptionSchema.safeParse(req.body);
            if (!bodyParsed.success) {
                next(toValidationError(bodyParsed.error));
                return;
            }

            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }

            const result = await prescriptionsService.createPrescription(
                paramParsed.data.appointmentId,
                user.sub,
                user.role,
                bodyParsed.data,
            );
            res.status(201).json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /prescriptions/appointment/:appointmentId
 * List prescriptions for an appointment (doctor or patient of that appointment).
 */
router.get(
    '/appointment/:appointmentId',
    requireAuth,
    auditPhiAccess(AuditAction.PRESCRIPTION_LIST, 'Prescription'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const paramParsed = appointmentIdParamSchema.safeParse(req.params);
            if (!paramParsed.success) {
                next(toValidationError(paramParsed.error));
                return;
            }

            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }

            const result = await prescriptionsService.listByAppointment(
                paramParsed.data.appointmentId,
                user.sub,
                user.role,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /prescriptions/mine
 * All prescriptions for the logged-in patient (or written by the logged-in doctor).
 */
router.get(
    '/mine',
    requireAuth,
    auditPhiAccess(AuditAction.PRESCRIPTION_LIST, 'Prescription'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const queryParsed = listMyPrescriptionsQuerySchema.safeParse(req.query);
            if (!queryParsed.success) {
                next(toValidationError(queryParsed.error));
                return;
            }

            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await prescriptionsService.listForUser(
                user.sub,
                user.role,
                queryParsed.data,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /prescriptions/:id
 * Get a prescription by ID.
 */
router.get(
    '/:id',
    requireAuth,
    auditPhiAccess(AuditAction.PRESCRIPTION_READ, 'Prescription'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = prescriptionIdParamSchema.safeParse(req.params);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }

            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }

            const result = await prescriptionsService.getById(parsed.data.id, user.sub, user.role);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

export { router as prescriptionsRouter };
