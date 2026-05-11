import { createClient, RedisClientType } from 'redis';
import { config } from './config';
import { logger } from './utils/logger';

let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;

export async function connectRedis(): Promise<{
    pubClient: RedisClientType;
    subClient: RedisClientType;
} | null> {
    if (!config.redisUrl) {
        logger.warn(
            'Socket.io running without Redis adapter — not safe for multi-instance deployments. Set REDIS_URL to enable.',
        );
        return null;
    }

    const pub = createClient({ url: config.redisUrl }) as RedisClientType;
    const sub = pub.duplicate() as RedisClientType;

    pub.on('error', (err) => logger.error({ err }, '[Redis] pub client error'));
    sub.on('error', (err) => logger.error({ err }, '[Redis] sub client error'));

    await Promise.all([pub.connect(), sub.connect()]);

    pubClient = pub;
    subClient = sub;

    logger.info('[Redis] Connected — Socket.io adapter ready');
    return { pubClient: pub, subClient: sub };
}

export async function disconnectRedis(): Promise<void> {
    const tasks: Promise<unknown>[] = [];
    if (pubClient?.isOpen) tasks.push(pubClient.quit());
    if (subClient?.isOpen) tasks.push(subClient.quit());
    await Promise.all(tasks);
    pubClient = null;
    subClient = null;
}

export async function pingRedis(): Promise<boolean> {
    if (!pubClient?.isOpen) return false;
    try {
        const result = await pubClient.ping();
        return result === 'PONG';
    } catch {
        return false;
    }
}

export function isRedisConfigured(): boolean {
    return !!config.redisUrl;
}
