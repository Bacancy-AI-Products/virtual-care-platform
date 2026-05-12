/**
 * Loads `.env.test` before any module that reads `process.env` is imported.
 *
 * Important: dotenv default behavior (no `override`) — existing env vars
 * always win. This way CI can provide DATABASE_URL via the workflow YAML
 * and `.env.test` only fills in what isn't already set. Locally that means
 * `.env.test` is the source of truth; in CI the workflow is.
 *
 * Vitest runs this file via `setupFiles` for every test file — env vars are
 * process-wide so the cost is negligible after the first load.
 */
import path from 'node:path';
import dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '..', '.env.test');
dotenv.config({ path: envPath });

// Belt-and-suspenders: even if .env.test is missing in CI, NODE_ENV must be test.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
