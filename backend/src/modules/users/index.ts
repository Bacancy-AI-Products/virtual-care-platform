import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, type AuthenticatedRequest } from '../../middleware';
import { saveFile } from '../files/files.service';
import * as usersService from './users.service';

const router = Router();

const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed for avatars'));
    },
});

/**
 * GET /users/me
 * Current user profile with linked doctor or patient profile.
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as AuthenticatedRequest).user!.sub;
        const result = await usersService.getMe(userId);
        res.json(result);
    } catch (e) {
        next(e);
    }
});

/**
 * POST /users/me/avatar
 * Upload a profile picture. Saves the file and stores its ID on the user record.
 */
router.post(
    '/me/avatar',
    requireAuth,
    avatarUpload.single('avatar'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                return res
                    .status(400)
                    .json({ error: { code: 'NO_FILE', message: 'No image provided' } });
            }
            const userId = (req as AuthenticatedRequest).user!.sub;
            const file = await saveFile(req.file, userId);
            await usersService.updateAvatar(userId, file.id);
            res.json({ avatarFileId: file.id });
        } catch (e) {
            next(e);
        }
    },
);

export { router as usersRouter };
