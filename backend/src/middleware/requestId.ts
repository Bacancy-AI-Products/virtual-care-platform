import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestId(req: Request, res: Response, next: NextFunction): void {
    const id = randomUUID();
    (req as Request & { id: string }).id = id;
    res.setHeader('X-Request-Id', id);
    next();
}
