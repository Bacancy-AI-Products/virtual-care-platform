import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { errorHandler } from './middleware';
import { requestId } from './middleware/requestId';
import { apiRouter } from './routes';
import { config } from './config';
import { logger } from './utils/logger';
import { isRedisConfigured, pingRedis } from './redis';

const app = express();

// Trust the first proxy hop so req.ip is the real client IP behind ALB / Caddy / nginx
app.set('trust proxy', 1);

app.use(
    helmet({
        // CSP is tuned separately at the Next.js layer; disable here to avoid conflicting headers
        contentSecurityPolicy: false,
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
    }),
);
app.use(requestId);
app.use(pinoHttp({ logger }));
app.use(
    cors({
        origin: config.frontendUrl,
        credentials: true,
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (outside /api for simplicity)
app.get('/health', async (_req, res) => {
    const redisHealthy = isRedisConfigured() ? await pingRedis() : null;
    const ok = redisHealthy !== false;
    res.status(ok ? 200 : 503).json({
        ok,
        timestamp: new Date().toISOString(),
        redis: redisHealthy === null ? 'not-configured' : redisHealthy ? 'ok' : 'down',
    });
});

// API v1
app.use('/api/v1', apiRouter);

// 404
app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
});

// Central error handling
app.use(errorHandler);

export { app };
