import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarX, Stethoscope, Users } from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant";
import { getProfile, getCalendarStatus, listServices, listDoctors } from "@/lib/api/clinic";
import { Card, PageHeader, Spinner, Badge } from "@/components/ui";
import { NoTenant } from "@/components/layout/NoTenant";

export function Overview() {
  const tid = useTenantId();
  if (!tid) {
    return (
      <>
        <PageHeader title="Overview" />
        <NoTenant />
      </>
    );
  }
  return <OverviewPanel tid={tid} />;
}

function OverviewPanel({ tid }: { tid: string }) {
  const profile = useQuery({ queryKey: ["profile", tid], queryFn: () => getProfile(tid) });
  const calendar = useQuery({ queryKey: ["calendar-status", tid], queryFn: () => getCalendarStatus(tid) });
  const services = useQuery({ queryKey: ["services", tid], queryFn: () => listServices(tid) });
  const doctors = useQuery({ queryKey: ["doctors", tid], queryFn: () => listDoctors(tid) });

  return (
    <>
      <PageHeader
        title={profile.data?.display_name ?? "Overview"}
        subtitle={profile.data?.location_name || "Clinic dashboard"}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          icon={<Stethoscope className="h-5 w-5 text-brand-cyan-600" />}
          label="Active services"
          value={services.isLoading ? <Spinner /> : String(services.data?.filter((s) => s.is_active).length ?? 0)}
        />
        <Stat
          icon={<Users className="h-5 w-5 text-brand-cyan-600" />}
          label="Doctors"
          value={doctors.isLoading ? <Spinner /> : String(doctors.data?.filter((d) => d.is_active).length ?? 0)}
        />
        <Card>
          <div className="flex items-center gap-3">
            {calendar.data?.connected ? (
              <CalendarCheck className="h-5 w-5 text-green-600" />
            ) : (
              <CalendarX className="h-5 w-5 text-muted" />
            )}
            <div>
              <p className="text-sm text-muted">Google Calendar</p>
              <div className="mt-1">
                {calendar.isLoading ? (
                  <Spinner />
                ) : calendar.data?.connected ? (
                  <Badge tone="success">Connected</Badge>
                ) : (
                  <Badge tone="warning">Not connected</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold text-ink">{value}</p>
        </div>
      </div>
    </Card>
  );
}
