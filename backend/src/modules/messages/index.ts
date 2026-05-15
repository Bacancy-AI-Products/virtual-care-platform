import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { auditPhiAccess } from '../../middleware/auditLog';
import { AuditAction } from '../audit/audit.service';
import { prisma } from '../../db';

const router = Router();

/**
 * GET /messages/appointment/:appointmentId
 * Returns all messages for an appointment.
 * Only accessible by the doctor or patient of that appointment.
 */
router.get(
    '/appointment/:appointmentId',
    requireAuth,
    auditPhiAccess(AuditAction.MESSAGE_LIST, 'Message'),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const appointmentId = req.params.appointmentId as string;
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

            const messages = await prisma.message.findMany({
                where: { appointmentId },
                include: {
                    sender: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: 'asc' },
            });

            res.json(
                messages.map((m) => ({
                    id: m.id,
                    senderId: m.senderId,
                    receiverId: m.receiverId,
                    appointmentId: m.appointmentId,
                    content: m.content,
                    createdAt: m.createdAt,
                    sender: m.sender,
                })),
            );
        } catch (error) {
            next(error);
        }
    },
);

export { router as messagesRouter };
