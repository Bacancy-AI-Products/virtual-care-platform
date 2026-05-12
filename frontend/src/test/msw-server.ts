/**
 * MSW server for component tests.
 *
 * Default handlers below cover the most common cases (auth/me, login). Tests
 * that need different behavior should call `server.use(...)` inside the test —
 * `afterEach` in setup.ts resets between tests, so per-test handlers are scoped.
 */
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1';

export const defaultHandlers = [
    http.get(`${API}/auth/me`, () =>
        HttpResponse.json({ id: 'u1', name: 'Test', email: 't@t.local', role: 'PATIENT' }),
    ),
];

export const server = setupServer(...defaultHandlers);
export { http, HttpResponse };
