import { useMemo, useState } from "react";
import {
  Calendar, dateFnsLocalizer, type View, type ToolbarProps, type EventProps, Views,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant";
import {
  listAppointments, cancelAppointment, rescheduleAppointment, setAppointmentStatus,
  type ManualStatus,
} from "@/lib/api/clinic";
import {
  Card, PageHeader, Spinner, ErrorState, Modal, Badge, Button, Field, Input, ConfirmDialog,
} from "@/components/ui";
import { NoTenant } from "@/components/layout/NoTenant";
import { cn } from "@/lib/cn";
import type { Appointment } from "@/types";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";

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
const STATUS_ACTIONS: { key: ManualStatus; label: string }[] = [
  { key: "confirmed", label: "Confirm" },
  { key: "completed", label: "Mark completed" },
  { key: "no_show", label: "Mark no-show" },
];
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

// ── Custom event pill ─────────────────────────────────────────────────────────
function EventPill({ event }: EventProps<Evt>) {
  const a = event.resource;
  const color = STATUS_COLOR[a.status] ?? "#0F3D4D";
  const faded = a.status === "cancelled";
  return (
    <div
      className={cn("h-full overflow-hidden rounded-[0.4rem] px-1.5 py-0.5 text-white", faded && "opacity-70")}
      style={{ backgroundColor: color }}
    >
      <span className="block truncate text-[0.72rem] font-semibold leading-tight">
        {format(event.start, "HH:mm")} · {a.patient_name ?? a.patient_phone}
      </span>
      <span className="block truncate text-[0.68rem] leading-tight opacity-90">{a.service_name}</span>
    </div>
  );
}

// ── Custom toolbar ────────────────────────────────────────────────────────────
function CalendarToolbar({ label, onNavigate, onView, view, views }: ToolbarProps<Evt>) {
  const viewList = (Array.isArray(views) ? views : Object.keys(views)) as View[];
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate("TODAY")}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
        >
          Today
        </button>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onNavigate("PREV")} aria-label="Previous" className="rounded-md p-1.5 text-muted hover:bg-canvas">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => onNavigate("NEXT")} aria-label="Next" className="rounded-md p-1.5 text-muted hover:bg-canvas">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-base font-semibold text-ink">{label}</span>
      </div>
      <div className="inline-flex rounded-lg border border-line p-0.5">
        {viewList.map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
              view === v ? "bg-brand-navy text-white" : "text-muted hover:bg-canvas",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      {Object.entries(STATUS_LABEL).map(([key, label]) => (
        <span key={key} className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[key] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

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
          <div className="kv-calendar" style={{ height: 640 }}>
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
              components={{ toolbar: CalendarToolbar, event: EventPill }}
            />
          </div>
          <Legend />
        </Card>
      )}

      {selected && (
        <AppointmentModal tenantId={tenantId} appt={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

// datetime-local <input> uses local wall-time "YYYY-MM-DDTHH:mm".
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AppointmentModal({
  tenantId, appt, onClose,
}: { tenantId: string; appt: Appointment; onClose: () => void }) {
  const qc = useQueryClient();
  const start = new Date(appt.slot_start);
  const end = new Date(appt.slot_end);
  // Active = still upcoming/open → can reschedule or cancel (those sync the calendar).
  // Status marking (confirmed/completed/no-show) is allowed for anything not cancelled.
  const isActive = appt.status === "pending" || appt.status === "confirmed";
  const isCancelled = appt.status === "cancelled";

  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [newStart, setNewStart] = useState(() => toLocalInput(appt.slot_start));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["appointments", tenantId] });

  const cancel = useMutation({
    mutationFn: () => cancelAppointment(tenantId, appt.id, {}),
    onSuccess: () => { invalidate(); setConfirmCancel(false); onClose(); },
  });

  const reschedule = useMutation({
    mutationFn: () =>
      rescheduleAppointment(tenantId, appt.id, { new_slot_start: new Date(newStart).toISOString() }),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const setStatus = useMutation({
    mutationFn: (status: ManualStatus) => setAppointmentStatus(tenantId, appt.id, status),
    onSuccess: () => { invalidate(); onClose(); },
  });

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

      {!isCancelled && mode === "view" && (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_ACTIONS.filter((a) => a.key !== appt.status).map((a) => (
              <Button
                key={a.key}
                variant="secondary"
                loading={setStatus.isPending && setStatus.variables === a.key}
                onClick={() => setStatus.mutate(a.key)}
              >
                {a.label}
              </Button>
            ))}
          </div>
          {isActive && (
            <div className="flex justify-end gap-2">
              <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                Cancel appointment
              </Button>
              <Button onClick={() => setMode("reschedule")}>Reschedule</Button>
            </div>
          )}
          {setStatus.isError && <p className="text-sm text-red-600">Status update failed.</p>}
        </div>
      )}

      {isActive && mode === "reschedule" && (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <Field label="New date & time">
            <Input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
          </Field>
          <p className="text-xs text-muted">
            The patient is notified on WhatsApp and Google Calendar; they can reply to confirm or
            suggest another time.
          </p>
          {reschedule.isError && <p className="text-sm text-red-600">Reschedule failed.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMode("view")} disabled={reschedule.isPending}>
              Back
            </Button>
            <Button loading={reschedule.isPending} onClick={() => reschedule.mutate()}>
              Save new time
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancel.mutate()}
        title="Cancel this appointment?"
        confirmLabel="Cancel appointment"
        tone="danger"
        loading={cancel.isPending}
        message={
          <>
            The appointment will be cancelled and removed from Google Calendar. The patient is
            notified on WhatsApp and by Google Calendar email, and can re-book with the AI receptionist.
          </>
        }
      />
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
