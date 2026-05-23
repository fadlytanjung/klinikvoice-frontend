# frontend/docs — KlinikVoice Frontend Implementation Guide

> Same SDD contract as backend. Docs are the spec. Update docs before code.
> See the SDD status tags in `backend/docs/00-README.md`.

## What the frontend IS and IS NOT

**IS:** A lightweight admin dashboard for clinic owners and platform superadmins.
Appointments calendar, patient directory, clinic configuration (profile,
services, doctors, schedules), Google Calendar connection status, and superadmin
tenant + user management. **Client-only SPA — no SEO, no SSR.**

**IS NOT:** The voice pipeline, the WhatsApp handler, or the booking engine —
those are backend. The frontend only reads/writes the backend's REST API.

## Stack (M3)

- **Vite + React 18 + TypeScript (strict)** — client-only SPA, no SSR/RSC.
- **React Router v6** — client-side routing + role gating.
- **TanStack Query v5** — server-state fetching/caching.
- **Tailwind CSS v3** — styling, with the KlinikVoice brand palette (doc 08).
- **react-hook-form + zod** — forms + validation.
- **Hand-written typed fetch client** — no codegen pipeline (doc 07).
- **Lucide** icons. Charts deferred until usage endpoints exist.

> **Why not Next.js?** This is an internal tool with no SEO or SSR need. A Vite
> SPA is lighter to build, ship, and reason about. Decision recorded in doc 01.

## Scope reality (M3)

The dashboard implements **only what the backend serves today** (doc 07 §1):
auth, clinic profile, services, doctors, schedules, calendar status,
**appointments (read-only calendar), patients**, and superadmin tenants/users.
Pages that need not-yet-built endpoints (**calls, usage, audit, live trace,
appointment status edits**) are **deferred** and tracked in doc 02 §6 — do not
scaffold them against mock data.

## Docs Index

| Doc | Purpose |
|---|---|
| [01-project-setup](./01-project-setup.md) | Vite + React + TS stack, scripts, directory layout, dev proxy |
| [02-dashboard-architecture](./02-dashboard-architecture.md) | Router, role gating, TanStack Query patterns, live + deferred page inventory |
| [03-realtime-tracing](./03-realtime-tracing.md) | `[DEFERRED]` — SSE live call panel; backend endpoint not built yet |
| [04-env-vars](./04-env-vars.md) | `VITE_` naming rules, all vars |
| [05-testing-strategy](./05-testing-strategy.md) | Vitest, RTL, Playwright |
| [06-deployment](./06-deployment.md) | Static build, nginx/Cloud Run, cache headers |
| [07-api-client-and-auth](./07-api-client-and-auth.md) | Live API surface, hand-written client, Google sign-in + JWT refresh flow |
| [08-design-system](./08-design-system.md) | Brand palette (from logo), tokens, component conventions |

## Cross-References

Backend API: `backend/docs/06-api-and-webhooks.md` (route table — note: that doc
is partly `[SPEC]`; doc 07 here reflects the **implemented** surface),
`backend/docs/18-tenant-google-auth.md` (Google OAuth + activation flow).
