import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, User as UserIcon } from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant";
import { listPatients, getPatient } from "@/lib/api/clinic";
import {
  Card, PageHeader, Input, Spinner, ErrorState, EmptyState, Modal, Badge,
} from "@/components/ui";
import { NoTenant } from "@/components/layout/NoTenant";
import type { PatientListItem } from "@/types";

export function Patients() {
  const tid = useTenantId();
  if (!tid) {
    return (
      <>
        <PageHeader title="Patients" />
        <NoTenant />
      </>
    );
  }
  return <PatientsList tenantId={tid} />;
}

function PatientsList({ tenantId }: { tenantId: string }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<PatientListItem | null>(null);
  const query = useQuery({
    queryKey: ["patients", tenantId, q],
    queryFn: () => listPatients(tenantId, q || undefined),
  });

  return (
    <>
      <PageHeader title="Patients" subtitle="People who have contacted the clinic." />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input
            className="pl-9"
            placeholder="Search name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message="Failed to load patients." onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">First seen</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas"
                  onClick={() => setSelected(p)}
                >
                  <td className="px-4 py-3 font-medium text-ink">{p.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.phone_e164}</td>
                  <td className="px-4 py-3 text-muted">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.appointment_count > 0 ? "info" : "neutral"}>
                      {p.appointment_count}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {format(new Date(p.created_at), "d MMM yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No patients found" hint={q ? "Try a different search." : undefined} />
      )}

      {selected && (
        <PatientDetailModal tenantId={tenantId} patient={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function PatientDetailModal({
  tenantId,
  patient,
  onClose,
}: {
  tenantId: string;
  patient: PatientListItem;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ["patient", tenantId, patient.id],
    queryFn: () => getPatient(tenantId, patient.id),
  });

  return (
    <Modal open onClose={onClose} title={patient.name ?? patient.phone_e164}>
      <div className="mb-4 flex items-center gap-3 text-sm">
        <UserIcon className="h-5 w-5 text-brand-cyan-600" />
        <div>
          <p className="text-ink">{patient.phone_e164}</p>
          {patient.email && <p className="text-muted">{patient.email}</p>}
        </div>
      </div>

      <p className="mb-2 text-sm font-medium text-ink">Appointments</p>
      {detail.isLoading ? (
        <Spinner />
      ) : detail.data && detail.data.appointments.length > 0 ? (
        <ul className="space-y-2">
          {detail.data.appointments.map((a) => (
            <li key={a.id} className="rounded-lg border border-line p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{a.service_name}</span>
                <Badge tone={a.status === "cancelled" ? "danger" : "info"}>{a.status}</Badge>
              </div>
              <p className="mt-1 text-muted">
                {a.doctor_name ? `${a.doctor_name} · ` : ""}
                {format(new Date(a.slot_start), "EEE, d MMM yyyy HH:mm")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No appointments yet.</p>
      )}
    </Modal>
  );
}
