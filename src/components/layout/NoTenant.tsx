import { EmptyState } from "@/components/ui";

/** Shown on clinic-scoped pages when the signed-in user has no tenant (superadmin). */
export function NoTenant() {
  return (
    <EmptyState
      title="No clinic selected"
      hint="Superadmins manage clinics from the Tenants page. Tenant impersonation will open these views for a specific clinic."
    />
  );
}
