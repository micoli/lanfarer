import { Home, LogOut, Network, Radio, Router, ScanLine, Settings2, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";

interface AuthProps {
  authEnabled: boolean;
  username: string | null;
  logout: () => Promise<void>;
}

function LangSwitcher() {
  const { i18n: i18nHook } = useTranslation();
  const current = i18nHook.language;

  function toggle() {
    const next = current === "fr" ? "en" : "fr";
    void i18nHook.changeLanguage(next);
    localStorage.setItem("lang", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="mt-auto text-xs font-medium px-2 py-1 rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors self-start"
      title="Switch language"
    >
      {current === "fr" ? "🇬🇧 EN" : "🇫🇷 FR"}
    </button>
  );
}

export default function Layout({ auth }: { auth: AuthProps }) {
  const { t } = useTranslation();

  const NAV = [
    { to: "/", icon: Home, label: t("nav.home"), end: true },
    { to: "/hosts", icon: Wifi, label: t("nav.hosts"), end: false },
    { to: "/scan", icon: ScanLine, label: t("nav.scan"), end: false },
    { to: "/cudy", icon: Router, label: t("nav.cudy"), end: false },
    { to: "/wifi", icon: Radio, label: t("nav.wifi"), end: false },
    { to: "/dhcp/options", icon: Settings2, label: t("nav.dhcpOptions"), end: false },
    { to: "/dhcp/reservations", icon: Network, label: t("nav.dhcpReservations"), end: false },
  ] as const;

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

        <LangSwitcher />
        {auth.authEnabled && auth.username && (
          <button
            type="button"
            onClick={() => { void auth.logout(); }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mt-2 px-1"
            title={t("auth.logout")}
          >
            <LogOut size={13} />
            {auth.username}
          </button>
        )}
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
