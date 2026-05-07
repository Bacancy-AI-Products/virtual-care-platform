import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    const status = err instanceof AppError ? err.status : 500;
    const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
    const details = err instanceof AppError ? err.details : undefined;

    logger.error(
        {
            err,
            path: req.path,
            method: req.method,
            requestId: (req as Request & { id?: string }).id,
        },
        err.message,
    );

    res.status(status).json({
        error: {
            code,
            message: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && details !== undefined && { details }),
        },
    });
}
