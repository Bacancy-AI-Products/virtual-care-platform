import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { errorHandler } from './middleware';
import { requestId } from './middleware/requestId';
import { apiRouter } from './routes';
import { config } from './config';
import { logger } from './utils/logger';

const app = express();

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
app.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
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
