# Testing Conventions

> Short doc. The whole point is that there's not much to remember.

## Philosophy

**Test behavior at the boundary. Mock only what crosses an external wire.**

- **External wires** (mock these): SMTP, third-party APIs, cloud storage, payment gateways — anything with a network or disk side-effect outside our code.
- **Internal seams** (do NOT mock these): services calling services, services calling Prisma, components using stores. Let them run for real.
- **Playwright covers user journeys.** Unit/integration tests cover **logic, branches, and error paths** — the stuff Playwright is too slow and too coarse to exercise exhaustively.

If a test's value is "I clicked a button and the page changed," that's Playwright's job. If a test's value is "given these 5 inputs, the appointment-conflict logic returns the right answer," that's a unit test.

---

## Three test layers (when each one is right)

| Layer | Lives in | When to write | Example |
|-------|---------|---------------|---------|
| **Pure unit** | `*.test.ts` next to source — no DB import | Logic with no I/O: error classes, schemas, utility functions, store reducers | `AppError`, Zod schemas, `useAuthStore.login` |
| **Integration** | `*.test.ts` that imports `test/setupDb` (backend) or uses MSW (frontend) | Service-layer or component logic that crosses a single boundary | `auth.service.signup`, a form component that submits to the API |
| **E2E (Playwright)** | `frontend/e2e/*.spec.ts` | A full user journey across multiple pages | "user logs in → books appointment → sees it on dashboard" |

**Rule of thumb:** if you can write the same test as a pure unit, do that. If not, write an integration test. Only reach for Playwright when the value is the full flow.

---

## Naming & location

- Tests live **next to the file they test**, named `<filename>.test.ts(x)`.
- Shared scaffolding lives in `backend/test/` and `frontend/src/test/`.
- One `describe` block per exported function or component. Test names describe **behavior**, not implementation:
  - ✅ `'returns 401 for unknown email with generic message'`
  - ❌ `'should call prisma.user.findUnique once'`

---

## Backend

### Test database

There is one test database: `telecare_test`. Schema is applied via `prisma migrate deploy`.

**Setup once locally:**
```bash
cd backend
npm run db:test:setup      # runs migrate deploy against the test DB
```

**Run tests:**
```bash
npm test                   # runs everything
npm run test:watch         # watch mode while developing
```

In CI, a Postgres service container is started fresh per run — no manual setup.

### When to import `test/setupDb`

Add this at the top of any test file that needs the DB:

```ts
import '../../../test/setupDb';
```

It installs `beforeEach(resetDb)` and `afterAll(disconnect)`. Pure unit tests should NOT import it — they don't need the plumbing.

### What to mock

Only the email module:

```ts
vi.mock('../email', () => ({
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
}));
```

Do NOT mock Prisma. Do NOT mock bcrypt or jwt. They run against the real test DB.

### Route tests with supertest

```ts
import { app } from '../../app';
import request from 'supertest';

const res = await request(app).post('/api/v1/auth/login').send({ email, password });
expect(res.status).toBe(401);
expect(res.body.error.code).toBe('UNAUTHORIZED');
```

One happy path + one failure path per route is the minimum. Don't re-test Zod schemas through HTTP — test them directly as pure units.

---

## Frontend

### When to use MSW vs. stub fetch

- **Component tests** → MSW. Render the component, let it call the network, MSW returns canned responses. Closer to real behavior, less brittle.
- **API client tests** (`services/api/client.ts` and friends) → stub `global.fetch` with `vi.fn()`. The code under test IS the fetch wrapper — MSW would obscure exactly what we want to assert.

```ts
// API client test pattern
const fetchSpy = vi.fn();
beforeEach(() => { global.fetch = fetchSpy; });
```

```ts
// Component test pattern
server.use(
    http.get(`${API}/doctors`, () => HttpResponse.json([/*…*/])),
);
render(<DoctorList />);
```

### RTL query priority (use top-to-bottom)

1. `getByRole(...)` — most resilient, mirrors accessibility tree
2. `getByLabelText(...)` — for form inputs
3. `getByPlaceholderText(...)` — when no label exists
4. `getByText(...)` — for non-interactive elements
5. `getByDisplayValue(...)` — for filled inputs
6. **Avoid** `getByTestId` — last resort only

### Async patterns

```ts
// ✅ wait for an async element
expect(await screen.findByRole('alert')).toBeInTheDocument();

// ✅ wait for state to settle
await waitFor(() => expect(mock).toHaveBeenCalled());

// ❌ NEVER do this
await new Promise(r => setTimeout(r, 500));
```

### Zustand stores

Reset state at the top of every test:

```ts
beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    localStorage.clear();
});
```

Stores are module singletons — without a reset, state leaks between tests.

---

## What NOT to test

- ❌ **Layout / presentational components** — if it has no logic, there's nothing to regress.
- ❌ **Snapshot tests** — not allowed. Inline or file-based. They become "blindly update on failure" anti-patterns.
- ❌ **Trivial CRUD wrappers** — `prisma.x.findMany()` is tested upstream.
- ❌ **Anything Playwright already covers** end-to-end (full user journeys).
- ❌ **Implementation details** — `expect(spy).toHaveBeenCalledWith(...)` is a code smell unless the call IS the contract you're protecting.

---

## Test factories

When the same object shape appears in 3+ tests, add it to `test/factories.ts`. Keep factories flat — no fluent builders, no chaining:

```ts
export const aPatientInput = (overrides: Partial<UserFactoryInput> = {}) => ({
    name: 'Test User',
    email: `test.${uniq()}@telecare.local`,
    password: 'Demo@1234',
    role: Role.PATIENT,
    ...overrides,
});
```

If a factory grows beyond ~15 lines, it's too clever — split it.

---

## Coverage

Coverage is **reported, not enforced**. Run `npm run test:coverage` to see what's covered. We'll add thresholds only when the suite has stabilized and there's a real reason to gate on a number.

The goal is regression protection, not a 100% bar.
