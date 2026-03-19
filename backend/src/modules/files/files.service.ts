import path from "path";
import fs from "fs";
import { Jimp } from "jimp";
import { prisma } from "../../db";
import { FileType } from "../../../generated/prisma";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Max dimensions and quality for optimization
const AVATAR_MAX_SIZE = 400;
const AVATAR_QUALITY = 80;
const MEDICAL_IMAGE_MAX_SIZE = 1200;
const MEDICAL_IMAGE_QUALITY = 85;

function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith("image/")) return FileType.IMAGE;
  if (mimeType === "application/pdf") return FileType.REPORT;
  if (mimeType.includes("document") || mimeType.includes("text")) return FileType.DOCUMENT;
  return FileType.OTHER;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Optimize image and return buffer. Uses JPEG for smaller size (Jimp, pure JS, Alpine-compatible).
 * - Avatar (no appointment): 400x400, quality 80
 * - Medical image: 1200x1200, quality 85
 */
async function optimizeImage(
  buffer: Buffer,
  mimeType: string,
  isAvatar: boolean
): Promise<{ buffer: Buffer; mimeType: string }> {
  const maxSize = isAvatar ? AVATAR_MAX_SIZE : MEDICAL_IMAGE_MAX_SIZE;
  const quality = isAvatar ? AVATAR_QUALITY : MEDICAL_IMAGE_QUALITY;

  const image = await Jimp.read(buffer);
  image.scaleToFit({ w: maxSize, h: maxSize });
  const optimized = await image.getBuffer("image/jpeg", { quality });
  return { buffer: Buffer.from(optimized), mimeType: "image/jpeg" };
}

/**
 * Save file: optimize images, store blob in DB. Legacy filesystem fallback for existing data.
 */
export async function saveFile(
  file: Express.Multer.File,
  userId: string,
  appointmentId?: string
) {
  const isAvatar = !appointmentId;
  let data: Buffer | null = null;
  let storageKey: string | null = null;
  let mimeType = file.mimetype;
  let sizeBytes = file.size;

  if (isImage(file.mimetype)) {
    try {
      const optimized = await optimizeImage(
        file.buffer,
        file.mimetype,
        isAvatar
      );
      data = optimized.buffer;
      mimeType = optimized.mimeType;
      sizeBytes = optimized.buffer.length;
      storageKey = "db";
    } catch (err) {
      // Jimp failed — store original
      data = file.buffer;
      storageKey = "db";
    }
  } else if (file.mimetype === "application/pdf") {
    // PDF: store as-is, no compression
    data = file.buffer;
    storageKey = "db";
  } else {
    // Other docs: store as-is
    data = file.buffer;
    storageKey = "db";
  }

  const fileRecord = await prisma.file.create({
    data: {
      ownerId: userId,
      uploadedById: userId,
      appointmentId: appointmentId || null,
      type: getFileType(file.mimetype),
      storageKey,
      originalName: file.originalname,
      mimeType,
      sizeBytes: BigInt(sizeBytes),
      data: data ? new Uint8Array(data) : null,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });

  return fileRecord;
}

export async function getFileById(fileId: string) {
  return prisma.file.findUnique({
    where: { id: fileId },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });
}

export async function getFilesByAppointment(appointmentId: string) {
  return prisma.file.findMany({
    where: { appointmentId },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      type: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getFilePath(storageKey: string): string {
  return path.join(UPLOADS_DIR, storageKey);
}

/**
 * Get file blob for download. Prefers DB data; falls back to filesystem for legacy files.
 */
export function getFileBlob(file: {
  data: Buffer | Uint8Array | null;
  storageKey: string | null;
  mimeType: string;
}): Buffer | null {
  if (file.data && file.data.length > 0) {
    return Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
  }
  if (file.storageKey && file.storageKey !== "db") {
    const filePath = getFilePath(file.storageKey);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  }
  return null;
}

export async function deleteFile(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) return null;
  if (file.ownerId !== userId && file.uploadedById !== userId) {
    throw new Error("Not authorized to delete this file");
  }

  // Legacy: delete from filesystem if stored there
  if (file.storageKey && file.storageKey !== "db") {
    const filePath = getFilePath(file.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.file.delete({ where: { id: fileId } });
  return file;
}
