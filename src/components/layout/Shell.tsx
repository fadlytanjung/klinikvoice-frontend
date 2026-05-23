import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  CalendarDays,
  CalendarCheck,
  Contact,
  Settings,
  Users,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const clinicNav: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarCheck },
  { to: "/patients", label: "Patients", icon: Contact },
  { to: "/settings/profile", label: "Clinic Profile", icon: Settings },
  { to: "/settings/services", label: "Services", icon: Stethoscope },
  { to: "/settings/doctors", label: "Doctors", icon: Users },
  { to: "/settings/calendar", label: "Google Calendar", icon: CalendarDays },
];

const superadminNav: NavItem[] = [
  { to: "/superadmin/tenants", label: "Tenants", icon: Building2 },
  { to: "/superadmin/users", label: "Users", icon: Users },
];

function Logo() {
  return (
    <div className="px-5 py-5 text-lg font-bold tracking-tight">
      <span className="text-white">KlinikVoice</span> <span className="text-brand-cyan">AI</span>
    </div>
  );
}

function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-brand-navy">
      <Logo />
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-navy-700 text-white"
                  : "text-white/70 hover:bg-brand-navy-700 hover:text-white",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Topbar() {
  const { user, signOut } = useAuth();
  return (
    <header className="flex h-14 items-center justify-end gap-4 border-b border-line bg-white px-6">
      <span className="text-sm text-muted">{user?.email}</span>
      <button
        onClick={() => void signOut()}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink hover:bg-canvas"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </header>
  );
}

export function ClinicShell() {
  return <Shell items={clinicNav} />;
}
export function SuperadminShell() {
  return <Shell items={superadminNav} />;
}

function Shell({ items }: { items: NavItem[] }) {
  return (
    <div className="flex h-screen">
      <Sidebar items={items} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto bg-canvas px-6 py-6">
          <div className="mx-auto max-w-[1100px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
