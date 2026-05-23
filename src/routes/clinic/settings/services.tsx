import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant";
import { listServices, createService, patchService, deleteService } from "@/lib/api/clinic";
import { formatPrice } from "@/lib/cn";
import {
  Card, PageHeader, Button, Field, Input, Textarea, Modal, Badge,
  Spinner, ErrorState, EmptyState,
} from "@/components/ui";
import { NoTenant } from "@/components/layout/NoTenant";
import type { Service } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  display_name: z.string().min(1, "Required"),
  duration_minutes: z.coerce.number().int().positive(),
  price_amount_cents: z.coerce.number().int().nonnegative().nullable(),
  currency: z.string().length(3).default("IDR"),
  description: z.string().max(500).default(""),
  deposit_required: z.boolean().default(false),
  deposit_amount_cents: z.coerce.number().int().nonnegative().nullable().default(null),
});
type Form = z.infer<typeof schema>;

export function ServicesSettings() {
  const tid = useTenantId();
  if (!tid) {
    return (
      <>
        <PageHeader title="Services" />
        <NoTenant />
      </>
    );
  }
  return <ServicesTable tenantId={tid} />;
}

export function ServicesTable({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const query = useQuery({ queryKey: ["services", tenantId], queryFn: () => listServices(tenantId) });

  const del = useMutation({
    mutationFn: (id: string) => deleteService(tenantId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services", tenantId] }),
  });

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Treatments the AI can book."
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add service
          </Button>
        }
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message="Failed to load services." onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <Th>Name</Th><Th>Code</Th><Th>Duration</Th><Th>Price</Th><Th>Status</Th><Th> </Th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <Td className="font-medium text-ink">{s.display_name}</Td>
                  <Td className="text-muted">{s.code}</Td>
                  <Td>{s.duration_minutes} min</Td>
                  <Td>{formatPrice(s.price_amount_cents, s.currency)}</Td>
                  <Td>{s.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <IconBtn onClick={() => setEditing(s)} aria-label="Edit"><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn
                        onClick={() => { if (confirm(`Delete "${s.display_name}"?`)) del.mutate(s.id); }}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </IconBtn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No services yet" hint="Add your first service so the AI can book it." />
      )}

      {editing && (
        <ServiceModal
          tenantId={tenantId}
          service={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ServiceModal({ tenantId, service, onClose }: { tenantId: string; service: Service | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!service;
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: service
      ? { ...service }
      : { currency: "IDR", duration_minutes: 30, price_amount_cents: null, deposit_required: false, description: "" },
  });

  const save = useMutation({
    mutationFn: (v: Form) =>
      isEdit ? patchService(tenantId, service!.id, v) : createService(tenantId, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services", tenantId] });
      onClose();
    },
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit service" : "Add service"}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3">
        <Field label="Code" error={errors.code?.message}>
          <Input {...register("code")} disabled={isEdit} placeholder="CONSULT-GENERAL" />
        </Field>
        <Field label="Display name" error={errors.display_name?.message}>
          <Input {...register("display_name")} placeholder="Konsultasi Umum" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (min)" error={errors.duration_minutes?.message}>
            <Input type="number" {...register("duration_minutes")} />
          </Field>
          <Field label="Price (cents)" error={errors.price_amount_cents?.message} hint="e.g. 17500000 = IDR 175.000">
            <Input type="number" {...register("price_amount_cents")} />
          </Field>
        </div>
        <Field label="Description" error={errors.description?.message}>
          <Textarea {...register("description")} />
        </Field>
        {save.isError && <p className="text-sm text-red-600">Save failed.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{isEdit ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 font-medium">{children}</th>
);
const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>
);
function IconBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="rounded-md p-1.5 text-muted hover:bg-canvas" {...rest}>
      {children}
    </button>
  );
}
