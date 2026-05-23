import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Phone } from "lucide-react";
import { listTenants, createTenant, provisionTwilio } from "@/lib/api/admin";
import {
  Card, PageHeader, Button, Field, Input, Modal, Badge,
  Spinner, ErrorState, EmptyState,
} from "@/components/ui";

const schema = z.object({
  name: z.string().min(1, "Required"),
  slug: z.string().min(1, "Required").regex(/^[a-z0-9-]+$/, "lowercase, digits, dashes"),
  timezone: z.string().default("Asia/Jakarta"),
  locale: z.string().default("id-ID"),
  plan: z.string().default("starter"),
});
type Form = z.infer<typeof schema>;

export function Tenants() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const query = useQuery({ queryKey: ["tenants"], queryFn: listTenants });

  const provision = useMutation({
    mutationFn: (id: string) => provisionTwilio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });

  return (
    <>
      <PageHeader
        title="Tenants"
        subtitle="All clinics on the platform."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New tenant</Button>}
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message="Failed to load tenants." onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Twilio</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                  <td className="px-4 py-3 text-muted">{t.slug}</td>
                  <td className="px-4 py-3">{t.plan}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.status === "active" ? "success" : "warning"}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {t.twilio_subaccount_sid ? (
                      <Badge tone="info">Provisioned</Badge>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!t.twilio_subaccount_sid && (
                      <Button
                        variant="secondary"
                        loading={provision.isPending && provision.variables === t.id}
                        onClick={() => provision.mutate(t.id)}
                      >
                        <Phone className="h-4 w-4" /> Provision Twilio
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No tenants yet" hint="Create the first clinic." />
      )}

      {creating && <CreateTenantModal onClose={() => setCreating(false)} />}
    </>
  );
}

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: "Asia/Jakarta", locale: "id-ID", plan: "starter" },
  });
  const save = useMutation({
    mutationFn: (v: Form) => createTenant(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); onClose(); },
  });

  return (
    <Modal open onClose={onClose} title="New tenant">
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3">
        <Field label="Clinic name" error={errors.name?.message}>
          <Input {...register("name")} placeholder="ChatbotKu Test Clinic" />
        </Field>
        <Field label="Slug" error={errors.slug?.message} hint="URL-safe identifier">
          <Input {...register("slug")} placeholder="chatbotku-test" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Timezone" error={errors.timezone?.message}>
            <Input {...register("timezone")} />
          </Field>
          <Field label="Locale" error={errors.locale?.message}>
            <Input {...register("locale")} />
          </Field>
          <Field label="Plan" error={errors.plan?.message}>
            <Input {...register("plan")} />
          </Field>
        </div>
        {save.isError && <p className="text-sm text-red-600">Create failed.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}
