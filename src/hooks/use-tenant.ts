import { useAuth } from "@/lib/auth-context";

/**
 * The tenant id the clinic-scoped pages operate on. For an owner this is their
 * own tenant (from /auth/me). A superadmin has no implicit tenant — clinic
 * pages show a notice until tenant selection/impersonation lands (doc 02 §1).
 */
export function useTenantId(): string | null {
  const { user } = useAuth();
  return user?.tenant_id ?? null;
}
