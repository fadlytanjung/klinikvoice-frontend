# 04 — Environment Variables `[SPEC]`

## Naming rule

Vite only exposes vars prefixed **`VITE_`** to the browser bundle
(`import.meta.env.VITE_*`). Anything without the prefix is build-time only and
never reaches the client. There is no server runtime (pure SPA), so there are no
server-only secrets here.

## Complete reference

| Variable | In bundle? | Required | Example | Description |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | Prod only | `https://api.klinikvoice.ai` | Backend API origin. Empty/unset in dev → calls go to same-origin `/api` (Vite proxy, doc 01 §3). |
| `VITE_APP_ENV` | Yes | No | `production` | Environment label shown in the UI. |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Yes | `xxx.apps.googleusercontent.com` | Google OAuth client id for the sign-in button (public by design). |
| `VITE_API_PROXY_TARGET` | No (dev only) | No | `http://localhost:8000` | Dev proxy target for `vite.config.ts`. |

## Rules

- **No secrets in the bundle.** The Google **client secret** must never be a
  `VITE_` var — the code↔token exchange happens server-side (doc 07 §5 Q1).
  The client *id* is public and fine to ship.
- **No per-tenant tokens/IDs in env.** Identity comes from the backend JWT
  issued at login; tenant scope comes from `/auth/me`.
- `.env.example` lists every var with placeholder values; real values via the
  deploy pipeline (doc 06).
