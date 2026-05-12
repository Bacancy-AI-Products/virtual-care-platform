import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Frontend test runner.
 *
 * Tests run in jsdom (the de-facto DOM emulator for React testing — chosen for
 * stability and library compatibility over speed).
 *
 * MSW is the network mock for component tests. Tests of the API client itself
 * stub `global.fetch` directly — see docs/testing.md.
 */
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        // Skip Playwright specs — they have their own runner.
        exclude: ['node_modules', 'e2e/**', '.next/**'],
        css: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.d.ts',
                'src/app/**/layout.tsx',
                'src/app/**/page.tsx', // pages are covered by Playwright
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
