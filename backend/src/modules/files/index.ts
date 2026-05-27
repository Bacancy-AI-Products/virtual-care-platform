import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { auditPhiAccess } from '../../middleware/auditLog';
import { AuditAction } from '../audit/audit.service';
import { prisma } from '../../db';
import {
    saveFile,
    getFileById,
    getFilesByAppointment,
    getFileBlob,
    deleteFile,
    FILE_INTEGRITY_FAILURE,
} from './files.service';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'));
        }
    },
});

// Get all files accessible to the current user
router.get(
    '/mine',
    requireAuth,
    auditPhiAccess(AuditAction.FILE_LIST, 'File'),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.sub;
            const files = await prisma.file.findMany({
                where: {
                    OR: [
                        { uploadedById: userId },
                        { appointment: { patient: { userId } } },
                        { appointment: { doctor: { userId } } },
                    ],
                },
                select: {
                    id: true,
                    originalName: true,
                    description: true,
                    mimeType: true,
                    type: true,
                    sizeBytes: true,
                    createdAt: true,
                    uploadedBy: { select: { id: true, name: true, role: true } },
                    appointment: { select: { id: true, scheduledAt: true, reason: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json(
                files.map((f) => ({
                    id: f.id,
                    originalName: f.originalName,
                    description: f.description,
                    mimeType: f.mimeType,
                    type: f.type,
                    sizeBytes: f.sizeBytes.toString(),
                    uploadedBy: f.uploadedBy,
                    appointment: f.appointment,
                    createdAt: f.createdAt,
                })),
            );
        } catch (error) {
            next(error);
        }
    },
);

// Upload file for an appointment
router.post(
    '/upload',
    requireAuth,
    auditPhiAccess(AuditAction.FILE_UPLOAD, 'File'),
    upload.single('file'),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: { code: 'NO_FILE', message: 'No file provided' },
                });
            }

            const userId = req.user!.sub;
            const { appointmentId } = req.body;
            // `description` is the patient-supplied label used by the
            // "medical reports" upload page. Trim and clamp to 500 chars to
            // match the DB column constraint.
            const rawDescription =
                typeof req.body.description === 'string' ? req.body.description.trim() : '';
            const description = rawDescription.length === 0 ? null : rawDescription.slice(0, 500);

            if (appointmentId) {
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
            }

            // Any upload through this endpoint is a medical document — never an
            // avatar. Avatars use the dedicated `/users/me/avatar` route.
            const file = await saveFile(req.file, userId, appointmentId, {
                isAvatar: false,
                description,
            });

            res.status(201).json({
                id: file.id,
                originalName: file.originalName,
                description: file.description,
                mimeType: file.mimeType,
                type: file.type,
                sizeBytes: file.sizeBytes.toString(),
                uploadedBy: file.uploadedBy,
                createdAt: file.createdAt,
            });
        } catch (error) {
            next(error);
        }
    },
);

/**
 * GET /files/patient/:patientId
 * Doctor-only view of every medical document a patient has uploaded — both
 * appointment-scoped files and standalone reports.
 *
 * Access rule mirrors `patients.getPatientForDoctor`: the doctor must have at
 * least one appointment with this patient. Otherwise 403.
 */
router.get(
    '/patient/:patientId',
    requireAuth,
    auditPhiAccess(AuditAction.FILE_LIST, 'File'),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.sub;
            const patientId = req.params.patientId as string;
            if (!patientId) {
                return res.status(400).json({
                    error: { code: 'BAD_REQUEST', message: 'patientId is required' },
                });
            }

            // Resolve the calling doctor's profile id and verify the link.
            const me = await prisma.user.findUnique({
                where: { id: userId },
                select: { doctorProfile: { select: { id: true } } },
            });
            const doctorId = me?.doctorProfile?.id;
            if (!doctorId) {
                return res.status(403).json({
                    error: { code: 'FORBIDDEN', message: 'Doctor profile required' },
                });
            }
            const link = await prisma.appointment.findFirst({
                where: { doctorId, patientId },
                select: { id: true },
            });
            if (!link) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this patient',
                    },
                });
            }

            // Walk patient → user → owned files. Includes both appointment-
            // scoped (older flow) and patient-level (new reports flow) files.
            const patient = await prisma.patient.findUnique({
                where: { id: patientId },
                select: { userId: true },
            });
            if (!patient) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: 'Patient not found' },
                });
            }
            const files = await prisma.file.findMany({
                where: { ownerId: patient.userId },
                select: {
                    id: true,
                    originalName: true,
                    description: true,
                    mimeType: true,
                    type: true,
                    sizeBytes: true,
                    createdAt: true,
                    appointmentId: true,
                    uploadedBy: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json(
                files.map((f) => ({
                    id: f.id,
                    originalName: f.originalName,
                    description: f.description,
                    mimeType: f.mimeType,
                    type: f.type,
                    sizeBytes: f.sizeBytes.toString(),
                    appointmentId: f.appointmentId,
                    uploadedBy: f.uploadedBy,
                    createdAt: f.createdAt,
                })),
            );
        } catch (error) {
            next(error);
        }
    },
);

// Get files for an appointment
router.get(
    '/appointment/:appointmentId',
    requireAuth,
    auditPhiAccess(AuditAction.FILE_LIST_APPOINTMENT, 'File'),
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

            const files = await getFilesByAppointment(appointmentId);

            res.json(
                files.map((f) => ({
                    id: f.id,
                    originalName: f.originalName,
                    mimeType: f.mimeType,
                    type: f.type,
                    sizeBytes: f.sizeBytes.toString(),
                    uploadedBy: f.uploadedBy,
                    createdAt: f.createdAt,
                })),
            );
        } catch (error) {
            next(error);
        }
    },
);

// Download a file
router.get(
    '/download/:fileId',
    requireAuth,
    auditPhiAccess(AuditAction.FILE_DOWNLOAD, 'File'),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const fileId = req.params.fileId as string;
            const userId = req.user!.sub;

            const file = await getFileById(fileId);

            if (!file) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: 'File not found' },
                });
            }

            if (file.appointmentId) {
                const appointment = await prisma.appointment.findUnique({
                    where: { id: file.appointmentId },
                    include: { patient: true, doctor: true },
                });

                if (appointment) {
                    const isDoctor = appointment.doctor.userId === userId;
                    const isPatient = appointment.patient.userId === userId;

                    if (!isDoctor && !isPatient) {
                        return res.status(403).json({
                            error: { code: 'FORBIDDEN', message: 'Not authorized' },
                        });
                    }
                }
            }

            const blob = await getFileBlob(file, {
                userId,
                actorRole: req.user!.role,
            });

            if (blob === FILE_INTEGRITY_FAILURE) {
                return res.status(500).json({
                    error: {
                        code: 'FILE_INTEGRITY_FAILED',
                        message: 'File integrity check failed',
                    },
                });
            }

            if (!blob) {
                return res.status(404).json({
                    error: { code: 'FILE_MISSING', message: 'File not found on server' },
                });
            }

            // Strip characters that would break the Content-Disposition header value
            const safeName = file.originalName.replace(/["\\\r\n]/g, '_');
            res.setHeader('Content-Type', file.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

            res.send(blob);
        } catch (error) {
            next(error);
        }
    },
);

// Delete a file
router.delete(
    '/:fileId',
    requireAuth,
    auditPhiAccess(AuditAction.FILE_DELETE, 'File'),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const fileId = req.params.fileId as string;
            const userId = req.user!.sub;

            const file = await deleteFile(fileId, userId);

            if (!file) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: 'File not found' },
                });
            }

            res.json({ success: true, deletedId: fileId });
        } catch (error) {
            next(error);
        }
    },
);

export { router as filesRouter };
