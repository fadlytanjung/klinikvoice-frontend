# 01 — Project Setup `[SPEC]`

## 1. Stack & rationale

- **Vite 5 + React 18 + TypeScript (strict)** — client-only SPA.
- **React Router v6** — routing + role gating (no server middleware).
- **Tailwind CSS v3** + a small set of hand-rolled primitives (doc 08).
- **TanStack Query v5** — server state.
- **react-hook-form + zod** — forms.
- **react-big-calendar + date-fns** — appointments calendar UI (lazy-loaded;
  ships as its own chunk only on the `/calendar` route).
- **Lucide** icons.

> **Decision (M3): Vite SPA, not Next.js.** The dashboard is an internal admin
> tool — no SEO, no SSR, no public pages. A Vite SPA removes the App
> Router/RSC/SSR surface we would never use, builds to static assets, and is
> trivially served from any static host or Cloud Run + nginx (doc 06). The
> earlier Next.js plan is superseded.

## 2. package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . && tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

No `codegen` script — the API client is hand-written (doc 07).

## 3. Path alias

Vite + tsconfig both map `@/* → ./src/*`.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 3000,
    proxy: {
      // Dev only: forward API calls to the backend, avoiding CORS.
      "/api": { target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000", changeOrigin: true },
    },
  },
});
```

## 4. Directory layout

```
frontend/
├── index.html               ← single SPA entry
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx             ← React root, providers (QueryClient, Router)
│   ├── App.tsx              ← route tree + role gating
│   ├── routes/
│   │   ├── login.tsx
│   │   ├── pending-activation.tsx
│   │   ├── clinic/
│   │   │   ├── layout.tsx        ← clinic shell (sidebar + topbar)
│   │   │   ├── overview.tsx
│   │   │   └── settings/
│   │   │       ├── profile.tsx
│   │   │       ├── services.tsx
│   │   │       ├── doctors.tsx
│   │   │       └── calendar.tsx
│   │   └── superadmin/
│   │       ├── layout.tsx
│   │       ├── tenants.tsx
│   │       └── users.tsx
│   ├── components/
│   │   ├── ui/              ← Button, Input, Card, Table, Badge, Dialog… (doc 08)
│   │   └── layout/          ← Sidebar, Topbar, RoleGate
│   ├── hooks/               ← one file per resource (use-services.ts, …)
│   ├── lib/
│   │   ├── api/             ← hand-written typed client (doc 07)
│   │   │   ├── client.ts    ← fetch wrapper: base URL, auth header, refresh, errors
│   │   │   ├── auth.ts      ← login/google/refresh/logout/me
│   │   │   ├── tenants.ts
│   │   │   ├── clinic.ts    ← profile/services/doctors/schedules/calendar
│   │   │   └── admin.ts     ← superadmin users/tenants
│   │   ├── auth-context.tsx ← session state (token in memory + refresh in storage)
│   │   └── query-client.ts
│   └── types/               ← shared TS types mirroring backend DTOs
└── .env.example
```

## 5. TanStack Query setup

```ts
// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});
```

## 6. Dev proxy / API base

In dev, Vite proxies `/api → backend` (§3) so the app calls same-origin `/api/...`.
In prod, `VITE_API_BASE_URL` points at the deployed API (doc 04). The client
(doc 07) reads the base URL once and prefixes every request.
