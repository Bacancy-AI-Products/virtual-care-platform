import http from 'http';
import { app } from './app';
import { config } from './config';
import { setNotificationEmitter } from './notifications-emitter';
import { initializeSocket } from './socket';
import { disconnectRedis } from './redis';

const { port } = config;

const server = http.createServer(app);

async function start() {
    const io = await initializeSocket(server);

    setNotificationEmitter((userId, payload) => {
        io.to(`user:${userId}`).emit('notification', payload);
    });

    server.listen(port, () => {
        console.log(`[BacancyTeleCare] Server running on port ${port} (${config.nodeEnv})`);
        console.log(`[BacancyTeleCare] Socket.io initialized`);
    });

    const shutdown = () => {
        io.close();
        server.close(async () => {
            await disconnectRedis();
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return io;
}

server.on('error', (err: NodeJS.ErrnoException) => {
    const msg =
        err.code === 'EADDRINUSE'
            ? `Port ${port} in use. Run: lsof -ti:${port} | xargs kill`
            : err.message;
    console.error(`[BacancyTeleCare] ${msg}`);
    process.exit(1);
});

const ioPromise = start().catch((err) => {
    console.error('[BacancyTeleCare] Failed to start:', err);
    process.exit(1);
});

export { server, ioPromise };
