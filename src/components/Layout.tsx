import { Outlet, NavLink } from "react-router-dom";
import { Home, Network, Settings2, Wifi, Radio } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";

const NAV = [
  { to: "/", icon: Home, label: "Accueil", end: true },
  { to: "/hosts", icon: Wifi, label: "Appareils", end: false },
  { to: "/wifi", icon: Radio, label: "Wi-Fi", end: false },
  { to: "/dhcp/options", icon: Settings2, label: "Options DHCP", end: false },
  { to: "/dhcp/reservations", icon: Network, label: "Réservations DHCP", end: false },
] as const;

export default function Layout() {
  return (
    <div className="flex h-dvh bg-slate-900 text-slate-100">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-52 border-r border-slate-800 p-4 shrink-0">
        <div className="flex items-center gap-2 mb-6 px-1">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Network size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-slate-100">fast5688b</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 font-medium"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top nav mobile */}
        <nav className="md:hidden flex border-b border-slate-800 shrink-0">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 flex-1 text-xs transition-colors ${
                  isActive ? "text-blue-400" : "text-slate-500"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
