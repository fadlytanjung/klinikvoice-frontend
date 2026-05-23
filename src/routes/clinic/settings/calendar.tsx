import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant";
import { getCalendarStatus, listCalendars } from "@/lib/api/clinic";
import { Card, PageHeader, Badge, Spinner, ErrorState, EmptyState } from "@/components/ui";
import { NoTenant } from "@/components/layout/NoTenant";

export function CalendarSettings() {
  const tid = useTenantId();
  if (!tid) {
    return (
      <>
        <PageHeader title="Calendar" />
        <NoTenant />
      </>
    );
  }
  return <CalendarPanel tenantId={tid} />;
}

function CalendarPanel({ tenantId }: { tenantId: string }) {
  const status = useQuery({ queryKey: ["calendar-status", tenantId], queryFn: () => getCalendarStatus(tenantId) });
  const connected = status.data?.connected;
  const calendars = useQuery({
    queryKey: ["calendars", tenantId],
    queryFn: () => listCalendars(tenantId),
    enabled: !!connected,
  });

  return (
    <>
      <PageHeader title="Google Calendar" subtitle="Bookings sync to the connected Google account." />

      {status.isLoading ? (
        <Spinner />
      ) : status.isError ? (
        <ErrorState message="Failed to load calendar status." onRetry={() => status.refetch()} />
      ) : (
        <Card className="max-w-2xl">
          <div className="flex items-center gap-3">
            {connected ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <p className="font-medium text-ink">
                {connected ? "Connected" : "Not connected"}
              </p>
              <p className="text-sm text-muted">
                {connected
                  ? status.data?.google_email
                  : "Calendar is linked during Google sign-in. Sign in with Google and grant calendar access."}
              </p>
            </div>
            {connected && <Badge tone="success">Active</Badge>}
          </div>

          {connected && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-sm font-medium text-ink">Available calendars</p>
              {calendars.isLoading ? (
                <Spinner />
              ) : calendars.data && calendars.data.calendars.length > 0 ? (
                <ul className="space-y-1.5">
                  {calendars.data.calendars.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm">
                      <span className="text-ink">{c.summary}</span>
                      {c.primary && <Badge tone="info">Primary</Badge>}
                      <span className="text-xs text-muted">{c.access_role}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No calendars found" />
              )}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
