import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Backend test runner.
 *
 * Two kinds of tests live in this repo:
 *   - Pure unit tests       (no DB, fast, run in parallel)
 *   - Integration tests     (real Postgres test DB, run serially)
 *
 * Integration tests opt in by importing `test/setupDb.ts` at the top of the file.
 * Vitest itself stays a single runner — no projects/workspaces — to keep config simple.
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
        setupFiles: ['test/setupEnv.ts'],
        // Integration tests use a shared Postgres DB; running serially avoids write contention.
        // Pure unit tests pay a tiny throughput cost — acceptable for the simplicity win.
        pool: 'forks',
        poolOptions: {
            forks: { singleFork: true },
        },
        testTimeout: 15_000,
        hookTimeout: 30_000,
        reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'generated/**', 'dist/**'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
