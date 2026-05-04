import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { prisma } from '../../db';
import { toValidationError } from '../../utils/validation';
import { createRoomParamsSchema, getTokenParamsSchema } from './video.schemas';
import { createDailyRoom, createMeetingToken } from './video.service';

const router = Router();

// Create video room for an appointment
router.post(
    '/rooms/:appointmentId',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const parsed = createRoomParamsSchema.safeParse(req.params);
            if (!parsed.success) {
                return res.status(400).json(toValidationError(parsed.error));
            }

            const { appointmentId } = parsed.data;
            const userId = req.user!.sub;

            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: {
                    patient: { include: { user: true } },
                    doctor: { include: { user: true } },
                },
            });

            if (!appointment) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: 'Appointment not found' },
                });
            }

            const isDoctor = appointment.doctor.userId === userId;
            const isPatient = appointment.patient.userId === userId;

            if (!isDoctor && !isPatient) {
                return res.status(403).json({
                    error: { code: 'FORBIDDEN', message: 'Not authorized for this appointment' },
                });
            }

            let roomName = appointment.videoRoomId;
            let meetingLink = appointment.meetingLink;

            if (!roomName) {
                const room = await createDailyRoom(appointmentId);
                roomName = room.name;
                meetingLink = room.url;

                await prisma.appointment.update({
                    where: { id: appointmentId },
                    data: {
                        videoRoomId: roomName,
                        meetingLink: meetingLink,
                    },
                });
            }

            res.json({
                roomName,
                meetingLink,
                appointmentId,
            });
        } catch (error) {
            next(error);
        }
    },
);

// Get meeting token for joining a consultation
router.get(
    '/token/:appointmentId',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const parsed = getTokenParamsSchema.safeParse(req.params);
            if (!parsed.success) {
                return res.status(400).json(toValidationError(parsed.error));
            }

            const { appointmentId } = parsed.data;
            const userId = req.user!.sub;

            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: {
                    patient: { include: { user: true } },
                    doctor: { include: { user: true } },
                },
            });

            if (!appointment) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: 'Appointment not found' },
                });
            }

            const isDoctor = appointment.doctor.userId === userId;
            const isPatient = appointment.patient.userId === userId;

            if (!isDoctor && !isPatient) {
                return res.status(403).json({
                    error: { code: 'FORBIDDEN', message: 'Not authorized for this appointment' },
                });
            }

            if (!appointment.videoRoomId) {
                return res.status(400).json({
                    error: { code: 'NO_ROOM', message: 'Video room not created yet' },
                });
            }

            const userName = isDoctor
                ? appointment.doctor.user.name
                : appointment.patient.user.name;

            const token = await createMeetingToken(
                appointment.videoRoomId,
                userId,
                userName,
                isDoctor,
            );

            res.json({
                token,
                roomUrl: appointment.meetingLink,
                roomName: appointment.videoRoomId,
                userName,
                isDoctor,
            });
        } catch (error) {
            next(error);
        }
    },
);

// Start consultation session (mark session start time)
router.post(
    '/session/start/:appointmentId',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const parsed = createRoomParamsSchema.safeParse(req.params);
            if (!parsed.success) {
                return res.status(400).json(toValidationError(parsed.error));
            }

            const { appointmentId } = parsed.data;
            const userId = req.user!.sub;

            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: { patient: true, doctor: true },
            });

            if (!appointment) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: 'Appointment not found' },
                });
            }

            const isDoctor = appointment.doctor.userId === userId;
            const isPatient = appointment.patient.userId === userId;

            if (!isDoctor && !isPatient) {
                return res.status(403).json({
                    error: { code: 'FORBIDDEN', message: 'Not authorized' },
                });
            }

            if (!appointment.sessionStartedAt) {
                await prisma.appointment.update({
                    where: { id: appointmentId },
                    data: {
                        sessionStartedAt: new Date(),
                        status: 'CONFIRMED',
                    },
                });
            }

            res.json({
                success: true,
                sessionStartedAt: appointment.sessionStartedAt || new Date(),
            });
        } catch (error) {
            next(error);
        }
    },
);

// End consultation session
router.post(
    '/session/end/:appointmentId',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const parsed = createRoomParamsSchema.safeParse(req.params);
            if (!parsed.success) {
                return res.status(400).json(toValidationError(parsed.error));
            }

            const { appointmentId } = parsed.data;
            const userId = req.user!.sub;

            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: { patient: true, doctor: true },
            });

            if (!appointment) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: 'Appointment not found' },
                });
            }

            const isDoctor = appointment.doctor.userId === userId;
            if (!isDoctor) {
                return res.status(403).json({
                    error: { code: 'FORBIDDEN', message: 'Only doctor can end consultation' },
                });
            }

            const updated = await prisma.appointment.update({
                where: { id: appointmentId },
                data: {
                    sessionEndedAt: new Date(),
                    status: 'COMPLETED',
                },
            });

            res.json({
                success: true,
                sessionEndedAt: updated.sessionEndedAt,
                status: updated.status,
            });
        } catch (error) {
            next(error);
        }
    },
);

// Get appointment video info
router.get(
    '/info/:appointmentId',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const parsed = getTokenParamsSchema.safeParse(req.params);
            if (!parsed.success) {
                return res.status(400).json(toValidationError(parsed.error));
            }

            const { appointmentId } = parsed.data;
            const userId = req.user!.sub;

            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: {
                    patient: {
                        include: { user: { select: { id: true, name: true, email: true } } },
                    },
                    doctor: {
                        include: { user: { select: { id: true, name: true, email: true } } },
                    },
                },
            });

            if (!appointment) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: 'Appointment not found' },
                });
            }

            const isDoctor = appointment.doctor.userId === userId;
            const isPatient = appointment.patient.userId === userId;

            if (!isDoctor && !isPatient) {
                return res.status(403).json({
                    error: { code: 'FORBIDDEN', message: 'Not authorized' },
                });
            }

            res.json({
                appointmentId: appointment.id,
                scheduledAt: appointment.scheduledAt,
                durationMinutes: appointment.durationMinutes,
                status: appointment.status,
                reason: appointment.reason,
                videoRoomId: appointment.videoRoomId,
                meetingLink: appointment.meetingLink,
                sessionStartedAt: appointment.sessionStartedAt,
                sessionEndedAt: appointment.sessionEndedAt,
                doctor: {
                    id: appointment.doctor.id,
                    name: appointment.doctor.user.name,
                    specialization: appointment.doctor.specialization,
                },
                patient: {
                    id: appointment.patient.id,
                    name: appointment.patient.user.name,
                },
                isDoctor,
                isPatient,
            });
        } catch (error) {
            next(error);
        }
    },
);

export { router as videoRouter };
