import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, listTenants, activateUser } from "@/lib/api/admin";
import {
  Card, PageHeader, Button, Field, Input, Modal, Badge,
  Spinner, ErrorState, EmptyState,
} from "@/components/ui";
import type { User } from "@/types";

export function Users() {
  const query = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const [activating, setActivating] = useState<User | null>(null);

  return (
    <>
      <PageHeader title="Users" subtitle="Owners and staff across all clinics." />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message="Failed to load users." onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">
                    {u.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="warning">Pending</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!u.is_active && (
                      <Button variant="secondary" onClick={() => setActivating(u)}>Activate</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No users yet" />
      )}

      {activating && <ActivateModal user={activating} onClose={() => setActivating(null)} />}
    </>
  );
}

const schema = z
  .object({
    mode: z.enum(["existing", "new"]),
    tenant_id: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
  })
  .refine((v) => (v.mode === "existing" ? !!v.tenant_id : !!v.name && !!v.slug), {
    message: "Fill the required fields",
    path: ["tenant_id"],
  });
type Form = z.infer<typeof schema>;

function ActivateModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const tenants = useQuery({ queryKey: ["tenants"], queryFn: listTenants });
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "existing" },
  });
  const mode = watch("mode");

  const save = useMutation({
    mutationFn: (v: Form) =>
      activateUser(user.id, {
        ...(v.mode === "existing"
          ? { tenant_id: v.tenant_id }
          : { new_tenant: { name: v.name!, slug: v.slug!, timezone: "Asia/Jakarta", locale: "id-ID", plan: "starter" } }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["tenants"] });
      onClose();
    },
  });

  return (
    <Modal open onClose={onClose} title={`Activate ${user.email}`}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" value="existing" {...register("mode")} /> Existing tenant
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="new" {...register("mode")} /> New tenant
          </label>
        </div>

        {mode === "existing" ? (
          <Field label="Tenant" error={errors.tenant_id?.message}>
            <select
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              {...register("tenant_id")}
            >
              <option value="">Select a tenant…</option>
              {tenants.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Clinic name" error={errors.tenant_id?.message}>
              <Input {...register("name")} />
            </Field>
            <Field label="Slug">
              <Input {...register("slug")} />
            </Field>
          </div>
        )}

        {save.isError && <p className="text-sm text-red-600">Activation failed.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Activate</Button>
        </div>
      </form>
    </Modal>
  );
}
