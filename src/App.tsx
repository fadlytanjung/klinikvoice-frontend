import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RoleGate } from "@/components/layout/RoleGate";
import { ClinicShell, SuperadminShell } from "@/components/layout/Shell";
import { FullScreenSpinner } from "@/components/ui";
import { Login } from "@/routes/login";
import { PendingActivation } from "@/routes/pending-activation";
import { Overview } from "@/routes/clinic/overview";
// Calendar pulls in react-big-calendar + date-fns — lazy-load so it only
// ships when the Calendar page is opened (keeps the main bundle light).
const Appointments = lazy(() =>
  import("@/routes/clinic/appointments").then((m) => ({ default: m.Appointments })),
);
import { Patients } from "@/routes/clinic/patients";
import { ProfileSettings } from "@/routes/clinic/settings/profile";
import { ServicesSettings } from "@/routes/clinic/settings/services";
import { DoctorsSettings } from "@/routes/clinic/settings/doctors";
import { CalendarSettings } from "@/routes/clinic/settings/calendar";
import { Tenants } from "@/routes/superadmin/tenants";
import { Users } from "@/routes/superadmin/users";

export function App() {
  // The Google OAuth redirect (?code) is handled in AuthProvider, which stays
  // "loading" during the exchange — so RoleGate shows a spinner here, never the
  // login form, and flips straight to the dashboard on success.
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending-activation" element={<PendingActivation />} />

      {/* Clinic admin (owner + superadmin) */}
      <Route element={<RoleGate allow={["owner", "superadmin"]} />}>
        <Route element={<ClinicShell />}>
          <Route path="/" element={<Overview />} />
          <Route
            path="/calendar"
            element={
              <Suspense fallback={<FullScreenSpinner />}>
                <Appointments />
              </Suspense>
            }
          />
          <Route path="/patients" element={<Patients />} />
          <Route path="/settings/profile" element={<ProfileSettings />} />
          <Route path="/settings/services" element={<ServicesSettings />} />
          <Route path="/settings/doctors" element={<DoctorsSettings />} />
          <Route path="/settings/calendar" element={<CalendarSettings />} />
        </Route>
      </Route>

      {/* Superadmin */}
      <Route element={<RoleGate allow={["superadmin"]} />}>
        <Route element={<SuperadminShell />}>
          <Route path="/superadmin/tenants" element={<Tenants />} />
          <Route path="/superadmin/users" element={<Users />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
