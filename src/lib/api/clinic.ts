import { get, post, patch, put, del } from "./client";
import type {
  ClinicProfile,
  ClinicProfileUpsert,
  Service,
  ServiceCreate,
  ServicePatch,
  Doctor,
  DoctorCreate,
  ScheduleSlot,
  ScheduleSlotOut,
  CalendarStatus,
  CalendarItem,
  Appointment,
  PatientListItem,
  PatientDetail,
} from "@/types";

const t = (tid: string) => `/tenants/${tid}`;

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile = (tid: string) => get<ClinicProfile>(`${t(tid)}/profile`);
export const putProfile = (tid: string, body: ClinicProfileUpsert) =>
  put<ClinicProfile>(`${t(tid)}/profile`, body);

// ── Services ──────────────────────────────────────────────────────────────────
export const listServices = (tid: string) => get<Service[]>(`${t(tid)}/services`);
export const createService = (tid: string, body: ServiceCreate) =>
  post<Service>(`${t(tid)}/services`, body);
export const patchService = (tid: string, id: string, body: ServicePatch) =>
  patch<Service>(`${t(tid)}/services/${id}`, body);
export const deleteService = (tid: string, id: string) =>
  del<void>(`${t(tid)}/services/${id}`);

// ── Doctors ───────────────────────────────────────────────────────────────────
export const listDoctors = (tid: string) => get<Doctor[]>(`${t(tid)}/doctors`);
export const createDoctor = (tid: string, body: DoctorCreate) =>
  post<Doctor>(`${t(tid)}/doctors`, body);
export const patchDoctor = (tid: string, id: string, body: Partial<DoctorCreate> & { is_active?: boolean; service_ids?: string[] }) =>
  patch<Doctor>(`${t(tid)}/doctors/${id}`, body);
export const deleteDoctor = (tid: string, id: string) =>
  del<void>(`${t(tid)}/doctors/${id}`);

export const getSchedule = (tid: string, doctorId: string) =>
  get<ScheduleSlotOut[]>(`${t(tid)}/doctors/${doctorId}/schedule`);
export const putSchedule = (tid: string, doctorId: string, weekly: ScheduleSlot[]) =>
  put<ScheduleSlotOut[]>(`${t(tid)}/doctors/${doctorId}/schedule`, { weekly });

// ── Calendar ──────────────────────────────────────────────────────────────────
export const getCalendarStatus = (tid: string) =>
  get<CalendarStatus>(`${t(tid)}/calendar/status`);
export const listCalendars = (tid: string) =>
  get<{ calendars: CalendarItem[] }>(`${t(tid)}/calendar/list`);

// ── Appointments (read-only) ────────────────────────────────────────────────
export const listAppointments = (tid: string, range?: { from?: string; to?: string }) => {
  const qs = new URLSearchParams();
  if (range?.from) qs.set("from", range.from);
  if (range?.to) qs.set("to", range.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get<Appointment[]>(`${t(tid)}/appointments${suffix}`);
};

// ── Patients (read-only) ─────────────────────────────────────────────────────
export const listPatients = (tid: string, q?: string) =>
  get<PatientListItem[]>(`${t(tid)}/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const getPatient = (tid: string, id: string) =>
  get<PatientDetail>(`${t(tid)}/patients/${id}`);
