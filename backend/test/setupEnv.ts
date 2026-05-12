/**
 * Loads `.env.test` before any module that reads `process.env` is imported.
 *
 * Vitest runs this file via `setupFiles` for every test file — but env vars are
 * process-wide so the cost is negligible after the first load.
 */
import path from 'node:path';
import dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '..', '.env.test');
dotenv.config({ path: envPath, override: true });

// Belt-and-suspenders: even if .env.test is missing in CI, NODE_ENV must be test.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
