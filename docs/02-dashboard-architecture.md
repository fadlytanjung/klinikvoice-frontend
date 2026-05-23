# 02 — Dashboard Architecture `[SPEC]`

> Cross-ref: doc 07 (API + auth), doc 08 (design system).

## 1. Routing & role gating (client-side)

React Router v6. No server middleware — gating is a wrapper component that
reads the session from the auth context (doc 07 §4).

```tsx
// src/App.tsx (shape)
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/pending-activation" element={<PendingActivation />} />

  <Route element={<RoleGate allow={["owner", "superadmin"]} />}>
    <Route element={<ClinicLayout />}>
      <Route path="/" element={<Overview />} />
      <Route path="/settings/profile" element={<ProfileSettings />} />
      <Route path="/settings/services" element={<ServicesSettings />} />
      <Route path="/settings/doctors" element={<DoctorsSettings />} />
      <Route path="/settings/calendar" element={<CalendarSettings />} />
    </Route>
  </Route>

  <Route element={<RoleGate allow={["superadmin"]} />}>
    <Route element={<SuperadminLayout />}>
      <Route path="/superadmin/tenants" element={<Tenants />} />
      <Route path="/superadmin/users" element={<Users />} />
    </Route>
  </Route>

  <Route path="*" element={<NotFound />} />
</Routes>
```

```tsx
// RoleGate: redirect unauthenticated → /login, wrong-role → their home.
function RoleGate({ allow }: { allow: Role[] }) {
  const { status, user } = useAuth();
  if (status === "loading") return <FullScreenSpinner />;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
```

**Tenant scoping:** an owner's `tenant_id` comes from `/auth/me`; clinic pages
use it to build `/tenants/{tid}/…` paths. A superadmin selects a tenant
(or impersonates) before entering clinic-scoped views.

## 2. Component hierarchy

```
Route page        ← composes Sections; fetches nothing itself
  └── Section      ← groups Widgets; optional heading
        └── Widget ← owns its TanStack Query call + loading/error/empty
```

Each Widget fetches what it needs. Never thread raw data from a page into
children.

## 3. Query hook pattern

```ts
// src/hooks/use-services.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listServices, createService } from "@/lib/api/clinic";

export function useServices(tenantId: string) {
  return useQuery({
    queryKey: ["services", tenantId],
    queryFn: () => listServices(tenantId),
  });
}

export function useCreateService(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ServiceCreate) => createService(tenantId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services", tenantId] }),
  });
}
```

## 4. Forms

react-hook-form + zod; schemas mirror backend DTOs (doc 07). Submit → mutation;
surface `ApiError.code` as a field/form error.

```ts
const serviceSchema = z.object({
  code: z.string().min(1),
  display_name: z.string().min(1),
  duration_minutes: z.number().int().positive(),
  price_amount_cents: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3).default("IDR"),
  description: z.string().max(500).default(""),
  deposit_required: z.boolean().default(false),
  deposit_amount_cents: z.number().int().nonnegative().nullable().optional(),
});
```

## 5. Live page inventory (M3 — buildable now)

### Auth
| Path | Page |
|---|---|
| `/login` | Google sign-in (primary) + email/password fallback (doc 07 §2) |
| `/pending-activation` | Shown on `403 pending_activation` |

### Clinic (owner / superadmin)
| Path | Page | API |
|---|---|---|
| `/` | Overview | `/auth/me`, `/tenants/{tid}/profile`, `/tenants/{tid}/calendar/status` |
| `/calendar` | **Appointments calendar** (react-big-calendar; month/week/day/agenda; click → detail) | `/appointments` |
| `/patients` | **Patients** list + search + detail (their bookings) | `/patients`, `/patients/{id}` |
| `/settings/profile` | Clinic profile (name, hours, location, persona) | GET/PUT `/profile` |
| `/settings/services` | Services CRUD table | `/services` (+ PATCH/DELETE) |
| `/settings/doctors` | Doctors CRUD + weekly schedule editor | `/doctors`, `/doctors/{id}/schedule` |
| `/settings/calendar` | **Google Calendar** connection status + calendar picker | `/calendar/status`, `/calendar/list` |

> The `/calendar` route is lazy-loaded (`React.lazy`) because react-big-calendar
> + date-fns are heavy; they ship as a separate chunk only when opened.

### Superadmin
| Path | Page | API |
|---|---|---|
| `/superadmin/tenants` | Tenant list + create + detail/edit; Twilio provision | `/tenants`, `/admin/tenants`, `/tenants/{id}`, `/admin/tenants/{id}/provision-twilio` |
| `/superadmin/users` | User list, create, **activate pending owner**, impersonate | `/admin/users`, `/admin/users/{id}/activate`, `/admin/users/{id}/impersonate` |

## 6. Deferred pages (no backend endpoint yet — DO NOT build)

| Path | Blocked on backend |
|---|---|
| `/calls`, `/calls/[id]` | calls list/detail/transcript endpoints |
| appointment status edit | appointments PATCH endpoint (calendar is read-only for now) |
| `/superadmin/usage` | usage meters endpoint |
| `/superadmin/audit` | audit log endpoint |
| live trace panel | `conversations/{id}/stream` SSE (doc 03) |

When the backend ships these, add the endpoint to doc 07 §1, move the row here
into §5, then implement.
