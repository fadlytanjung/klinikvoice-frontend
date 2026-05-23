import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant";
import { getProfile, putProfile } from "@/lib/api/clinic";
import { ApiError } from "@/lib/api/client";
import { Card, PageHeader, Field, Input, Textarea, Button, Spinner, ErrorState } from "@/components/ui";
import { NoTenant } from "@/components/layout/NoTenant";

const schema = z.object({
  display_name: z.string().min(1, "Required"),
  tagline: z.string().max(200).default(""),
  location_name: z.string().max(200).default(""),
  operating_hours: z.string().max(300).default(""),
  persona_extra: z.string().max(2000).default(""),
});
type Form = z.infer<typeof schema>;

export function ProfileSettings() {
  const tid = useTenantId();
  if (!tid) {
    return (
      <>
        <PageHeader title="Clinic Profile" />
        <NoTenant />
      </>
    );
  }
  return <ProfileForm tid={tid} />;
}

function ProfileForm({ tid }: { tid: string }) {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const query = useQuery({ queryKey: ["profile", tid], queryFn: () => getProfile(tid) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (query.data) {
      reset({
        display_name: query.data.display_name,
        tagline: query.data.tagline,
        location_name: query.data.location_name,
        operating_hours: query.data.operating_hours,
        persona_extra: query.data.persona_extra,
      });
    }
  }, [query.data, reset]);

  const mutation = useMutation({
    mutationFn: (body: Form) => putProfile(tid, body),
    onSuccess: (data) => {
      qc.setQueryData(["profile", tid], data);
      reset(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <ErrorState message="Failed to load profile." onRetry={() => query.refetch()} />;

  return (
    <>
      <PageHeader title="Clinic Profile" subtitle="What the AI receptionist tells patients about your clinic." />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <Field label="Display name" error={errors.display_name?.message}>
            <Input {...register("display_name")} />
          </Field>
          <Field label="Tagline" error={errors.tagline?.message}>
            <Input {...register("tagline")} />
          </Field>
          <Field label="Location" error={errors.location_name?.message}>
            <Input {...register("location_name")} placeholder="Jl. Test No. 1, Jakarta Pusat" />
          </Field>
          <Field
            label="Operating hours"
            error={errors.operating_hours?.message}
            hint="Free text, e.g. Senin–Jumat 09:00–17:00, Sabtu 09:00–13:00, Minggu tutup"
          >
            <Input {...register("operating_hours")} />
          </Field>
          <Field
            label="Persona instructions"
            error={errors.persona_extra?.message}
            hint="Extra guidance for the AI's tone and behaviour."
          >
            <Textarea {...register("persona_extra")} />
          </Field>

          {mutation.isError && (
            <p className="text-sm text-red-600">
              {mutation.error instanceof ApiError ? mutation.error.message : "Save failed."}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
              Save changes
            </Button>
            {saved && <span className="text-sm text-green-600">Saved ✓</span>}
          </div>
        </form>
      </Card>
    </>
  );
}
