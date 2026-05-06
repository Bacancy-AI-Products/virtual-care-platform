import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware';
import { toValidationError } from '../../utils/validation';
import { emitToUser } from '../../notifications-emitter';
import { prisma } from '../../db';
import * as appointmentsService from './appointments.service';
import * as notificationsService from '../notifications/notifications.service';
import * as prescriptionsService from '../prescriptions/prescriptions.service';
import { sendAppointmentDeclined } from '../email/email.service';
import {
    appointmentIdParamSchema,
    createAppointmentSchema,
    listAppointmentsQuerySchema,
    updateStatusSchema,
} from './appointments.schemas';
import {
    appointmentIdParamSchema as prescriptionAppointmentIdParamSchema,
    createPrescriptionSchema,
} from '../prescriptions/prescriptions.schemas';

const router = Router();

// ─── Appointment CRUD ─────────────────────────────────────────────────────────

/**
 * POST /appointments
 * Book a new appointment. Patient only. Doctor receives APPOINTMENT_REQUESTED notification.
 */
router.post(
    '/',
    requireAuth,
    requireRole('PATIENT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const bodyParsed = createAppointmentSchema.safeParse(req.body);
            if (!bodyParsed.success) {
                next(toValidationError(bodyParsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await appointmentsService.createAppointment(user.sub, bodyParsed.data);

            const notification = await notificationsService.create(
                result.doctorUserId,
                'APPOINTMENT_REQUESTED',
                {
                    title: 'New appointment request',
                    body: 'A patient has requested an appointment with you.',
                    metadata: { appointmentId: result.id },
                },
            );
            emitToUser(result.doctorUserId, notification);

            res.status(201).json({
                id: result.id,
                patientId: result.patientId,
                doctorId: result.doctorId,
                scheduledAt: result.scheduledAt,
                durationMinutes: result.durationMinutes,
                status: result.status,
                reason: result.reason,
                createdAt: result.createdAt,
            });
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /appointments
 * List appointments for the caller.
 * PATIENT → their own | DOCTOR → their own | ADMIN → all
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = listAppointmentsQuerySchema.safeParse(req.query);
        if (!parsed.success) return void next(toValidationError(parsed.error));

        const { user } = req as AuthenticatedRequest;
        const result = await appointmentsService.listAppointments(
            user!.sub,
            user!.role,
            parsed.data,
        );
        res.json(result);
    } catch (e) {
        next(e);
    }
});

/**
 * GET /appointments/:appointmentId
 * Get a single appointment. Doctor, patient of that appointment, or admin.
 */
router.get(
    '/:appointmentId',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = appointmentIdParamSchema.safeParse(req.params);
            if (!parsed.success) return void next(toValidationError(parsed.error));

            const { user } = req as AuthenticatedRequest;
            const result = await appointmentsService.getAppointment(
                parsed.data.appointmentId,
                user!.sub,
                user!.role,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * PATCH /appointments/:appointmentId/cancel
 * Cancel an appointment. Caller must be doctor, patient, or admin of it.
 */
router.patch(
    '/:appointmentId/cancel',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = appointmentIdParamSchema.safeParse(req.params);
            if (!parsed.success) return void next(toValidationError(parsed.error));

            const { user } = req as AuthenticatedRequest;
            const result = await appointmentsService.cancelAppointment(
                parsed.data.appointmentId,
                user!.sub,
                user!.role,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * PATCH /appointments/:appointmentId/status
 * Doctor confirms or declines. Patient receives APPOINTMENT_CONFIRMED or APPOINTMENT_DECLINED notification.
 */
router.patch(
    '/:appointmentId/status',
    requireAuth,
    requireRole('DOCTOR'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const paramParsed = appointmentIdParamSchema.safeParse(req.params);
            if (!paramParsed.success) {
                next(toValidationError(paramParsed.error));
                return;
            }
            const bodyParsed = updateStatusSchema.safeParse(req.body);
            if (!bodyParsed.success) {
                next(toValidationError(bodyParsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const result = await appointmentsService.updateStatus(
                paramParsed.data.appointmentId,
                user.sub,
                user.role,
                bodyParsed.data.status,
                bodyParsed.data.declineReason,
            );

            const isDeclined = result.status === 'CANCELLED_BY_DOCTOR';
            const noteType = isDeclined ? 'APPOINTMENT_DECLINED' : 'APPOINTMENT_CONFIRMED';
            const noteTitle = isDeclined ? 'Appointment request declined' : 'Appointment confirmed';
            const noteBody = isDeclined
                ? `${result.doctorName.startsWith('Dr.') ? result.doctorName : `Dr. ${result.doctorName}`} declined your request. Reason: ${result.declineReason}`
                : 'Your appointment has been confirmed. You can now join the call at the scheduled time.';

            const notification = await notificationsService.create(result.patientUserId, noteType, {
                title: noteTitle,
                body: noteBody,
                metadata: {
                    appointmentId: paramParsed.data.appointmentId,
                    ...(isDeclined ? { declineReason: result.declineReason } : {}),
                },
            });
            emitToUser(result.patientUserId, notification);

            // Send email to patient for decline (fire-and-forget; don't block the response)
            if (isDeclined && result.declineReason) {
                sendAppointmentDeclined(
                    result.patientEmail,
                    result.patientName,
                    result.doctorName,
                    result.scheduledAt,
                    result.declineReason,
                ).catch((err) => console.error('Failed to send decline email:', err));
            }

            res.json({
                id: result.id,
                patientId: result.patientId,
                doctorId: result.doctorId,
                scheduledAt: result.scheduledAt,
                status: result.status,
                reason: result.reason,
                declineReason: result.declineReason,
                createdAt: result.createdAt,
            });
        } catch (e) {
            next(e);
        }
    },
);

// ─── Prescriptions (nested under appointment) ─────────────────────────────────

/**
 * GET /appointments/:appointmentId/prescriptions
 * Doctor, patient, or admin of that appointment.
 */
router.get(
    '/:appointmentId/prescriptions',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = prescriptionAppointmentIdParamSchema.safeParse(req.params);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            const result = await prescriptionsService.listByAppointment(
                parsed.data.appointmentId,
                user!.sub,
                user!.role,
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * POST /appointments/:appointmentId/prescriptions
 * Create prescription for an appointment. Doctor only; must be the appointment's doctor.
 * Patient receives PRESCRIPTION_CREATED notification.
 */
router.post(
    '/:appointmentId/prescriptions',
    requireAuth,
    requireRole('DOCTOR'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const paramParsed = prescriptionAppointmentIdParamSchema.safeParse(req.params);
            if (!paramParsed.success) {
                next(toValidationError(paramParsed.error));
                return;
            }
            const bodyParsed = createPrescriptionSchema.safeParse(req.body);
            if (!bodyParsed.success) return void next(toValidationError(bodyParsed.error));

            const { user } = req as AuthenticatedRequest;
            const result = await prescriptionsService.createPrescription(
                paramParsed.data.appointmentId,
                user!.sub,
                user!.role,
                bodyParsed.data,
            );

            // Notify patient in-app (and real-time via Socket.io)
            const patient = await prisma.patient.findUnique({
                where: { id: result.patientId },
                select: { userId: true },
            });
            if (patient) {
                const notification = await notificationsService.create(
                    patient.userId,
                    'PRESCRIPTION_CREATED',
                    {
                        title: 'New prescription',
                        body: 'Your doctor has added a prescription for this appointment.',
                        metadata: {
                            prescriptionId: result.id,
                            appointmentId: paramParsed.data.appointmentId,
                        },
                    },
                );
                emitToUser(patient.userId, notification);
            }

            res.status(201).json(result);
        } catch (e) {
            next(e);
        }
    },
);

export { router as appointmentsRouter };
