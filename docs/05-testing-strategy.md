# 05 — Frontend Testing Strategy `[SPEC]`

## 1. Layers

| Layer | Tool | What |
|---|---|---|
| Unit (hooks/utils) | Vitest | Pure logic, no DOM |
| Component | Vitest + React Testing Library + MSW | Components with mocked API |
| E2E | Playwright | Full flows against staging |

## 2. Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: { reporter: ['text', 'lcov'], threshold: { lines: 70 } },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

## 3. MSW Setup (API Mocking) `[SPEC]`

MSW handlers are hand-written to mirror the live API contract (doc 07 §1) —
keep them in sync with the typed client by hand (no codegen). Mock only
**live** endpoints; do not add handlers for deferred routes (doc 02 §6).

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/tenants/:tid/services', () => {
    return HttpResponse.json([
      {
        id: 'uuid-1',
        code: 'CONSULT-GENERAL',
        display_name: 'Konsultasi Umum',
        duration_minutes: 30,
        price_amount_cents: 17500000,
        currency: 'IDR',
        deposit_required: false,
        deposit_amount_cents: null,
        is_active: true,
      },
    ]);
  }),
];

// tests/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';
const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## 4. Component Test Example `[SPEC]`

```typescript
// tests/components/ServicesTable.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { ServicesTable } from '@/routes/clinic/settings/services';

test('renders services from API', async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <ServicesTable tenantId="t1" />
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText('Konsultasi Umum')).toBeInTheDocument());
});
```
