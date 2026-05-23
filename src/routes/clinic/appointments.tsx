import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant";
import { listAppointments } from "@/lib/api/clinic";
import { Card, PageHeader, Spinner, ErrorState, Modal, Badge } from "@/components/ui";
import { NoTenant } from "@/components/layout/NoTenant";
import type { Appointment } from "@/types";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { "en-US": enUS },
});

interface Evt {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  confirmed: "success",
  completed: "info",
  cancelled: "danger",
  no_show: "neutral",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#D97706",
  confirmed: "#16A34A",
  completed: "#15A6BE",
  cancelled: "#DC2626",
  no_show: "#5B6B73",
};

export function Appointments() {
  const tid = useTenantId();
  if (!tid) {
    return (
      <>
        <PageHeader title="Calendar" />
        <NoTenant />
      </>
    );
  }
  return <AppointmentsCalendar tenantId={tid} />;
}

function AppointmentsCalendar({ tenantId }: { tenantId: string }) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<Appointment | null>(null);

  const query = useQuery({
    queryKey: ["appointments", tenantId],
    queryFn: () => listAppointments(tenantId),
  });

  const events: Evt[] = useMemo(
    () =>
      (query.data ?? []).map((a) => ({
        id: a.id,
        title: `${a.patient_name ?? a.patient_phone} — ${a.service_name}`,
        start: new Date(a.slot_start),
        end: new Date(a.slot_end),
        resource: a,
      })),
    [query.data],
  );

  return (
    <>
      <PageHeader title="Calendar" subtitle="Booked appointments from the AI receptionist." />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message="Failed to load appointments." onRetry={() => query.refetch()} />
      ) : (
        <Card>
          <div style={{ height: 640 }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              popup
              onSelectEvent={(e) => setSelected((e as Evt).resource)}
              eventPropGetter={(e) => ({
                style: {
                  backgroundColor: STATUS_COLOR[(e as Evt).resource.status] ?? "#0F3D4D",
                  border: "none",
                  fontSize: "0.78rem",
                },
              })}
            />
          </div>
        </Card>
      )}

      {selected && <AppointmentModal appt={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function AppointmentModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const start = new Date(appt.slot_start);
  const end = new Date(appt.slot_end);
  return (
    <Modal open onClose={onClose} title={appt.service_name}>
      <dl className="space-y-2 text-sm">
        <Row label="Patient" value={appt.patient_name ?? "—"} />
        <Row label="Phone" value={appt.patient_phone} />
        <Row label="Doctor" value={appt.doctor_name ?? "—"} />
        <Row
          label="When"
          value={`${format(start, "EEE, d MMM yyyy HH:mm")} – ${format(end, "HH:mm")}`}
        />
        <div className="flex gap-2">
          <span className="w-24 shrink-0 text-muted">Status</span>
          <Badge tone={STATUS_TONE[appt.status] ?? "neutral"}>{appt.status}</Badge>
        </div>
        <Row label="Channel" value={appt.channel} />
        {appt.notes && <Row label="Notes" value={appt.notes} />}
      </dl>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
