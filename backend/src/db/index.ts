import { PrismaClient } from '../../generated/prisma';
import { config } from '../config';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
        log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
