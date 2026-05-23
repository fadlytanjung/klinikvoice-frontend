import { Navigate, Outlet } from "react-router-dom";
import { useAuth, homeFor } from "@/lib/auth-context";
import { FullScreenSpinner } from "@/components/ui";
import type { Role } from "@/types";

export function RoleGate({ allow }: { allow: Role[] }) {
  const { status, user } = useAuth();
  if (status === "loading") return <FullScreenSpinner />;
  if (status === "unauthenticated" || !user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
