import { Router, Response, NextFunction } from "express";
import multer from "multer";
import { requireAuth, AuthenticatedRequest } from "../../middleware/auth";
import { prisma } from "../../db";
import {
  saveFile,
  getFileById,
  getFilesByAppointment,
  getFileBlob,
  deleteFile,
} from "./files.service";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

// Get all files accessible to the current user 
router.get(
  "/mine",
  requireAuth,
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
          mimeType: true,
          type: true,
          sizeBytes: true,
          createdAt: true,
          uploadedBy: { select: { id: true, name: true, role: true } },
          appointment: { select: { id: true, scheduledAt: true, reason: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(
        files.map((f) => ({
          id: f.id,
          originalName: f.originalName,
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
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: { code: "NO_FILE", message: "No file provided" },
        });
      }

      const userId = req.user!.sub;
      const { appointmentId } = req.body;

      if (appointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: { patient: true, doctor: true },
        });

        if (!appointment) {
          return res.status(404).json({
            error: { code: "NOT_FOUND", message: "Appointment not found" },
          });
        }

        const isDoctor = appointment.doctor.userId === userId;
        const isPatient = appointment.patient.userId === userId;

        if (!isDoctor && !isPatient) {
          return res.status(403).json({
            error: { code: "FORBIDDEN", message: "Not authorized" },
          });
        }
      }

      const file = await saveFile(req.file, userId, appointmentId);

      res.status(201).json({
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        type: file.type,
        sizeBytes: file.sizeBytes.toString(),
        uploadedBy: file.uploadedBy,
        createdAt: file.createdAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get files for an appointment
router.get(
  "/appointment/:appointmentId",
  requireAuth,
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
          error: { code: "NOT_FOUND", message: "Appointment not found" },
        });
      }

      const isDoctor = appointment.doctor.userId === userId;
      const isPatient = appointment.patient.userId === userId;

      if (!isDoctor && !isPatient) {
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Not authorized" },
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
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

// Download a file
router.get(
  "/download/:fileId",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params.fileId as string;
      const userId = req.user!.sub;

      const file = await getFileById(fileId);

      if (!file) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "File not found" },
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
              error: { code: "FORBIDDEN", message: "Not authorized" },
            });
          }
        }
      }

      const blob = getFileBlob(file);

      if (!blob) {
        return res.status(404).json({
          error: { code: "FILE_MISSING", message: "File not found on server" },
        });
      }

      res.setHeader("Content-Type", file.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${file.originalName}"`
      );

      res.send(blob);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a file
router.delete(
  "/:fileId",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params.fileId as string;
      const userId = req.user!.sub;

      const file = await deleteFile(fileId, userId);

      if (!file) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "File not found" },
        });
      }

      res.json({ success: true, deletedId: fileId });
    } catch (error) {
      next(error);
    }
  }
);

export { router as filesRouter };