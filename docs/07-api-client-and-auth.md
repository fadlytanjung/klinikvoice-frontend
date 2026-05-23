# 07 — API Client & Auth `[SPEC]`

> Reflects the **implemented** backend (`backend/src/adapters/inbound/api/`),
> not the partly-aspirational `backend/docs/06`. Cross-ref:
> `backend/docs/18-tenant-google-auth.md`.

## 1. Live API surface (M3)

All under `/api/v1`. Bearer JWT in `Authorization` unless noted.

### Auth (`/auth`) — public except `/me`

| Method | Path | Body / notes |
|---|---|---|
| POST | `/auth/login` | `{email, password}` → `TokenPair` |
| POST | `/auth/google` | `{id_token, refresh_token, scopes}` → `TokenPair`; `403 pending_activation`; `400 calendar_consent_required` / `invalid_google_token` / `refresh_token_invalid` |
| POST | `/auth/refresh` | `{refresh_token}` → `TokenPair` (rotates; replay → 401 + family revoke) |
| POST | `/auth/logout` | `{refresh_token}` → 204 |
| GET | `/auth/me` | → `{user_id, tenant_id, role, email}` |

`TokenPair = {access_token, refresh_token, token_type:"bearer", expires_in}`.
JWT claims: `sub` (user_id), `tid` (tenant_id, may be absent), `role`, `email`.
Roles: `owner`, `superadmin`. A superadmin has `tid` absent/null.

### Tenant-scoped (`/tenants/{tid}/…`) — owner of that tenant or superadmin

| Method | Path | Purpose |
|---|---|---|
| GET/PUT | `/tenants/{tid}/profile` | Clinic profile (display name, hours, location, persona) |
| GET/POST | `/tenants/{tid}/services` | List / create service |
| PATCH/DELETE | `/tenants/{tid}/services/{id}` | Update / soft-delete service |
| GET/POST | `/tenants/{tid}/doctors` | List / create doctor |
| PATCH/DELETE | `/tenants/{tid}/doctors/{id}` | Update / soft-delete doctor |
| GET/PUT | `/tenants/{tid}/doctors/{id}/schedule` | Weekly schedule (read/replace) |
| GET | `/tenants/{tid}/calendar/status` | Google Calendar connection state |
| GET | `/tenants/{tid}/calendar/list` | Calendars available to the connected account (`{calendars: [...]}`) |
| GET | `/tenants/{tid}/appointments` | Bookings (read-only); query `from`/`to`/`status`; joined with patient name+phone — powers the calendar |
| GET | `/tenants/{tid}/patients` | Patients (read-only); query `q` (name/phone search); includes `appointment_count` |
| GET | `/tenants/{tid}/patients/{id}` | Patient detail + their appointments |
| GET | `/tenants/{tid}` | Tenant detail |
| PATCH | `/tenants/{tid}` | Update tenant config |
| POST | `/tenants/{tid}/whatsapp/test` | Send a WhatsApp test message |

### Superadmin

| Method | Path | Purpose |
|---|---|---|
| GET | `/tenants` | List all tenants |
| POST | `/tenants` · `/admin/tenants` | Create tenant |
| GET/POST | `/admin/users` | List / create users |
| POST | `/admin/users/{id}/activate` | Activate a pending owner → attaches tenant |
| POST | `/admin/users/{id}/impersonate` | Issue a scoped token for a tenant owner |
| POST | `/admin/tenants/{tid}/provision-twilio` | Provision Twilio subaccount |

### Not implemented yet — DO NOT call (doc 02 §6)

`calls`, `usage`, `audit`, `conversations/{id}/stream` (SSE),
`knowledge/documents`. Appointment **status mutation** (PATCH) is also not yet
built — the dashboard shows appointments read-only.

## 2. Google sign-in flow (frontend responsibility)

The backend expects the frontend to run Google OAuth and hand it three things.
**Calendar scope is mandatory** — sign-in doubles as calendar connection.

1. Trigger Google OAuth (authorization-code flow) requesting scopes:
   `openid email profile https://www.googleapis.com/auth/calendar`,
   with `access_type=offline` + `prompt=consent` so Google returns a
   **refresh_token**.
2. Exchange the code → obtain `id_token`, `refresh_token`, and the granted
   `scope` string.
3. `POST /auth/google { id_token, refresh_token, scopes }`.
4. Handle responses:
   - **200** → store the `TokenPair`, route by role (`/auth/me`).
   - **403 `pending_activation`** → route to `/pending-activation` (owner
     registered, waiting for superadmin to activate).
   - **400 `calendar_consent_required`** → tell the user they must allow
     calendar access, offer retry.
   - **400 `invalid_google_token` / `refresh_token_invalid`** → generic retry.

> The OAuth code↔token exchange needs the client secret. For M3 local dev use
> the existing `scripts/dev /google-id-token` helper (see backend docs) to
> obtain the three values, or a thin backend-proxied exchange. The frontend
> must never embed the client secret in the bundle — open question in §5.

## 3. Hand-written client

No codegen. One fetch wrapper + per-resource modules. Shape:

```ts
// src/lib/api/client.ts
const BASE = import.meta.env.VITE_API_BASE_URL ?? ""; // "" → same-origin /api proxy in dev

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Backend error shape: {error, code, request_id} or {detail}
    throw new ApiError(res.status, data.code ?? data.detail ?? "ERROR", data.error ?? data.detail ?? res.statusText);
  }
  return data as T;
}
```

- **401 handling:** a single-flight refresh interceptor calls `/auth/refresh`
  with the stored refresh token, updates the access token, and retries once.
  On refresh failure → clear session, redirect to `/login`.
- Resource modules (`auth.ts`, `clinic.ts`, `tenants.ts`, `admin.ts`) export
  typed functions; TanStack Query hooks in `src/hooks/` wrap them.

## 4. Token storage

- **Access token:** in-memory only (module variable + auth context). Never in
  `localStorage`.
- **Refresh token:** `localStorage` (`kv_refresh`) so a reload can re-auth via
  `/auth/refresh`. Acceptable for an internal tool; revisit if XSS surface
  grows. Logout clears it and calls `/auth/logout`.
- On app boot: if a refresh token exists, call `/auth/refresh` → `/auth/me` to
  hydrate the session before rendering gated routes.

## 5. Open questions

| # | Question | Leaning |
|---|---|---|
| 1 | Where does the Google code↔token exchange happen (needs client secret)? | **Backend** — the frontend cannot hold the client secret. The SPA already redirects to Google and captures the `code` (`src/lib/google-oauth.ts`); it then calls the contract below. **This endpoint is NOT implemented yet** — until it ships, the Google button errors gracefully and email/password is the working path. |
| 2 | Refresh token in `localStorage` vs httpOnly cookie | Cookie is safer but needs a backend set-cookie + CSRF story; `localStorage` is fine for M3 internal use. |

### Proposed backend endpoint (frontend already wired to it)

```
POST /api/v1/auth/google/exchange
body: { code: string, redirect_uri: string }
→ exchanges `code` with Google's token endpoint (server-side, using the
  client secret) to obtain id_token + refresh_token + granted scopes,
  then runs the SAME logic as POST /auth/google and returns a TokenPair
  (or 403 pending_activation / 400 calendar_consent_required as today).
```

The `redirect_uri` the SPA sends is `<app-origin>/login`, which must be a
registered authorized redirect URI on the Google OAuth client. The frontend
function is `exchangeGoogleCode(code)` in `src/lib/google-oauth.ts` — only that
one line changes if the backend chooses a different path/shape.
