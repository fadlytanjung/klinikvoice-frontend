// Shared types mirroring backend DTOs (frontend/docs/07 §1).

export type Role = "owner" | "superadmin" | "staff";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Me {
  user_id: string;
  tenant_id: string | null;
  role: Role;
  email: string;
}

export interface ClinicProfile {
  tenant_id: string;
  display_name: string;
  tagline: string;
  location_name: string;
  operating_hours: string;
  persona_extra: string;
}

export type ClinicProfileUpsert = Omit<ClinicProfile, "tenant_id">;

export interface Service {
  id: string;
  code: string;
  display_name: string;
  duration_minutes: number;
  price_amount_cents: number | null;
  currency: string;
  description: string;
  deposit_required: boolean;
  deposit_amount_cents: number | null;
  is_active: boolean;
}

export interface ServiceCreate {
  code: string;
  display_name: string;
  duration_minutes: number;
  price_amount_cents: number | null;
  currency: string;
  description: string;
  deposit_required: boolean;
  deposit_amount_cents: number | null;
}

export type ServicePatch = Partial<Omit<ServiceCreate, "code">> & { is_active?: boolean };

export interface Doctor {
  id: string;
  display_name: string;
  specialty: string | null;
  color: string | null;
  google_calendar_id: string | null;
  is_active: boolean;
}

export interface DoctorCreate {
  display_name: string;
  specialty?: string | null;
  color?: string | null;
  google_calendar_id?: string | null;
}

export interface ScheduleSlot {
  day_of_week: number; // 0=Mon..6=Sun
  start_time: string; // "09:00"
  end_time: string; // "17:00"
  slot_minutes: number;
}

export interface ScheduleSlotOut extends ScheduleSlot {
  id: string;
}

export interface CalendarStatus {
  connected: boolean;
  google_email: string | null;
  scopes: string | null;
  calendar_id: string | null;
  last_synced_at: string | null;
}

export interface CalendarItem {
  id: string;
  summary: string;
  primary: boolean;
  access_role: string;
  timezone: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  timezone: string;
  locale: string;
  whatsapp_phone_number?: string | null;
  twilio_phone_number?: string | null;
  twilio_subaccount_sid?: string | null;
  calendar_connected?: boolean;
}

export interface TenantCreate {
  name: string;
  slug: string;
  timezone: string;
  locale: string;
  plan: string;
}

export interface User {
  id: string;
  tenant_id: string | null;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
}

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_phone: string;
  service_name: string;
  doctor_name: string | null;
  slot_start: string;
  slot_end: string;
  status: string;
  channel: string;
  notes: string | null;
}

export interface PatientListItem {
  id: string;
  name: string | null;
  phone_e164: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  appointment_count: number;
}

export interface PatientAppointment {
  id: string;
  service_name: string;
  doctor_name: string | null;
  slot_start: string;
  slot_end: string;
  status: string;
  channel: string;
}

export interface PatientDetail extends PatientListItem {
  appointments: PatientAppointment[];
}
