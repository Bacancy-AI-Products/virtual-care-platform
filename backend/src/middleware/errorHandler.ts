import { Request, Response, NextFunction } from 'express';

export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    const status = (err as Error & { status?: number }).status ?? 500;
    const code = (err as Error & { code?: string }).code ?? 'INTERNAL_ERROR';
    res.status(status).json({
        error: {
            code,
            message: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && {
                details: (err as Error & { details?: unknown }).details,
            }),
        },
    });
}
