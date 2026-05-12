/**
 * Frontend test setup, loaded by Vitest before any test file.
 *
 *   - Wires `@testing-library/jest-dom` matchers (e.g. `toBeInTheDocument`).
 *   - Boots the MSW server and resets handlers between tests.
 *   - Cleans the DOM between tests (RTL auto-cleanup is already on in v13+, but
 *     calling it explicitly here is harmless and clearer).
 */
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw-server';

// MSW lifecycle — `error` is strict on purpose: any unmocked request fails the test.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
    server.resetHandlers();
    cleanup();
});
afterAll(() => server.close());
