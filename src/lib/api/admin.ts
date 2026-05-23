import { get, post, patch } from "./client";
import type { Tenant, TenantCreate, User } from "@/types";

// ── Tenants ───────────────────────────────────────────────────────────────────
export const listTenants = () => get<Tenant[]>("/tenants");
export const getTenant = (id: string) => get<Tenant>(`/tenants/${id}`);
export const createTenant = (body: TenantCreate) => post<Tenant>("/admin/tenants", body);
export const updateTenant = (id: string, body: Partial<Tenant>) =>
  patch<Tenant>(`/tenants/${id}`, body);
export const provisionTwilio = (tenantId: string) =>
  post<{ subaccount_sid: string }>(`/admin/tenants/${tenantId}/provision-twilio`);

// ── Users ─────────────────────────────────────────────────────────────────────
export const listUsers = () => get<User[]>("/admin/users");

export interface ActivateUserBody {
  tenant_id?: string;
  new_tenant?: TenantCreate;
}
export const activateUser = (userId: string, body: ActivateUserBody) =>
  post<User>(`/admin/users/${userId}/activate`, body);

export const impersonate = (userId: string) =>
  post<{ access_token: string; token_type: string }>(`/admin/users/${userId}/impersonate`);
