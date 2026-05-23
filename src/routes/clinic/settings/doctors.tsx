import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, CalendarClock } from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant";
import {
  listDoctors, createDoctor, patchDoctor, deleteDoctor, getSchedule, putSchedule,
} from "@/lib/api/clinic";
import {
  Card, PageHeader, Button, Field, Input, Modal, Badge,
  Spinner, ErrorState, EmptyState,
} from "@/components/ui";
import { NoTenant } from "@/components/layout/NoTenant";
import type { Doctor, ScheduleSlot } from "@/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const schema = z.object({
  display_name: z.string().min(1, "Required"),
  specialty: z.string().max(120).optional(),
});
type Form = z.infer<typeof schema>;

export function DoctorsSettings() {
  const tid = useTenantId();
  if (!tid) {
    return (
      <>
        <PageHeader title="Doctors" />
        <NoTenant />
      </>
    );
  }
  return <DoctorsList tenantId={tid} />;
}

function DoctorsList({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Doctor | "new" | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Doctor | null>(null);
  const query = useQuery({ queryKey: ["doctors", tenantId], queryFn: () => listDoctors(tenantId) });

  const del = useMutation({
    mutationFn: (id: string) => deleteDoctor(tenantId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctors", tenantId] }),
  });

  return (
    <>
      <PageHeader
        title="Doctors"
        subtitle="Practitioners and their weekly availability."
        action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add doctor</Button>}
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message="Failed to load doctors." onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data.map((d) => (
            <Card key={d.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink">{d.display_name}</p>
                  <p className="text-sm text-muted">{d.specialty || "—"}</p>
                  <div className="mt-2">
                    {d.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <IconBtn onClick={() => setScheduleFor(d)} aria-label="Schedule"><CalendarClock className="h-4 w-4" /></IconBtn>
                  <IconBtn onClick={() => setEditing(d)} aria-label="Edit"><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn
                    onClick={() => { if (confirm(`Delete ${d.display_name}?`)) del.mutate(d.id); }}
                    aria-label="Delete"
                  ><Trash2 className="h-4 w-4 text-red-600" /></IconBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No doctors yet" hint="Add a doctor, then set their weekly schedule." />
      )}

      {editing && (
        <DoctorModal tenantId={tenantId} doctor={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
      {scheduleFor && (
        <ScheduleModal tenantId={tenantId} doctor={scheduleFor} onClose={() => setScheduleFor(null)} />
      )}
    </>
  );
}

function DoctorModal({ tenantId, doctor, onClose }: { tenantId: string; doctor: Doctor | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!doctor;
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: doctor ? { display_name: doctor.display_name, specialty: doctor.specialty ?? "" } : {},
  });
  const save = useMutation({
    mutationFn: (v: Form) => (isEdit ? patchDoctor(tenantId, doctor!.id, v) : createDoctor(tenantId, v)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doctors", tenantId] }); onClose(); },
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit doctor" : "Add doctor"}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3">
        <Field label="Name" error={errors.display_name?.message}>
          <Input {...register("display_name")} placeholder="dr. Fjung" />
        </Field>
        <Field label="Specialty" error={errors.specialty?.message}>
          <Input {...register("specialty")} placeholder="Umum" />
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

function ScheduleModal({ tenantId, doctor, onClose }: { tenantId: string; doctor: Doctor; onClose: () => void }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["schedule", tenantId, doctor.id],
    queryFn: () => getSchedule(tenantId, doctor.id),
  });
  const [rows, setRows] = useState<ScheduleSlot[] | null>(null);
  const current = rows ?? query.data?.map((s) => ({ ...s })) ?? [];

  const save = useMutation({
    mutationFn: (weekly: ScheduleSlot[]) => putSchedule(tenantId, doctor.id, weekly),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule", tenantId, doctor.id] }); onClose(); },
  });

  function addRow() {
    setRows([...current, { day_of_week: 0, start_time: "09:00", end_time: "17:00", slot_minutes: 30 }]);
  }
  function update(i: number, patch: Partial<ScheduleSlot>) {
    setRows(current.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    setRows(current.filter((_, idx) => idx !== i));
  }

  return (
    <Modal open onClose={onClose} title={`Schedule — ${doctor.display_name}`}>
      {query.isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {current.length === 0 && <p className="text-sm text-muted">No availability set.</p>}
          {current.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                className="rounded-lg border border-line px-2 py-2 text-sm"
                value={r.day_of_week}
                onChange={(e) => update(i, { day_of_week: Number(e.target.value) })}
              >
                {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
              </select>
              <Input type="time" value={r.start_time} onChange={(e) => update(i, { start_time: e.target.value })} />
              <Input type="time" value={r.end_time} onChange={(e) => update(i, { end_time: e.target.value })} />
              <Input
                type="number" className="w-20" value={r.slot_minutes}
                onChange={(e) => update(i, { slot_minutes: Number(e.target.value) })}
              />
              <IconBtn onClick={() => remove(i)} aria-label="Remove"><Trash2 className="h-4 w-4 text-red-600" /></IconBtn>
            </div>
          ))}
          <Button variant="secondary" onClick={addRow}><Plus className="h-4 w-4" /> Add slot</Button>
          {save.isError && <p className="text-sm text-red-600">Save failed.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={save.isPending} onClick={() => save.mutate(current)}>Save schedule</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function IconBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="rounded-md p-1.5 text-muted hover:bg-canvas" {...rest}>{children}</button>;
}
