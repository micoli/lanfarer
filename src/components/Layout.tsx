import {
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  type LucideIcon,
  Map,
  Network,
  Radio,
  Router,
  ScanLine,
  Settings2,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import type { MenuItemConfig } from "../hooks/useUiConfig.ts";
import { useUiConfig } from "../hooks/useUiConfig.ts";
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

type NavItem = { id: string; to: string; icon: LucideIcon; label: string; end: boolean };
type NavGroup = { id: string; label: string; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isNavGroup(e: NavEntry): e is NavGroup {
  return "children" in e;
}

function buildAllNav(t: (key: string) => string): NavItem[] {
  return [
    { id: "home", to: "/", icon: Home, label: t("nav.home"), end: true },
    { id: "hosts", to: "/hosts", icon: Wifi, label: t("nav.hosts"), end: false },
    { id: "scan", to: "/scan", icon: ScanLine, label: t("nav.scan"), end: false },
    { id: "hotspots", to: "/hotspots", icon: Router, label: t("nav.hotspots"), end: false },
    { id: "map", to: "/map", icon: Map, label: t("nav.map"), end: false },
    { id: "wifi", to: "/wifi", icon: Radio, label: t("nav.wifi"), end: false },
    { id: "dhcp-options", to: "", icon: Settings2, label: t("nav.dhcpOptions"), end: false },
    {
      id: "dhcp-reservations",
      to: "",
      icon: Network,
      label: t("nav.dhcpReservations"),
      end: false,
    },
  ];
}

function resolveMenuItem(
  item: MenuItemConfig,
  allNav: NavItem[],
  t: (key: string) => string,
): NavEntry | null {
  if (item.children?.length) {
    const children = item.children
      .map((c) => resolveMenuItem(c, allNav, t))
      .filter((e): e is NavItem => e !== null && !isNavGroup(e));
    if (!children.length) return null;
    const label = t(`nav.${item.id}`);
    return { id: item.id, label, children };
  }
  const entry = allNav.find((n) => n.id === item.id);
  if (!entry) return null;
  if (item.id === "dhcp-options" || item.id === "dhcp-reservations") {
    if (!item.router) return null;
    const suffix = item.id === "dhcp-options" ? "options" : "reservations";
    return { ...entry, to: `/dhcp/${item.router}/${suffix}` };
  }
  return entry;
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-blue-600/15 text-blue-400 font-medium"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`
      }
    >
      <item.icon size={16} />
      {item.label}
    </NavLink>
  );
}

function NavGroupSection({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
      >
        {group.label}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="pl-2 flex flex-col gap-0.5">
          {group.children.map((child) => (
            <NavItemLink key={child.to} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({ auth }: { auth: AuthProps }) {
  const { t } = useTranslation();
  const uiConfig = useUiConfig();

  const allNav = buildAllNav(t);

  const NAV: NavEntry[] =
    uiConfig.menu === null
      ? allNav.filter((n) => n.id !== "dhcp-options" && n.id !== "dhcp-reservations")
      : uiConfig.menu
          .map((item) => resolveMenuItem(item, allNav, t))
          .filter((e): e is NavEntry => e !== null);

  const flatNav: NavItem[] = NAV.flatMap((e) => (isNavGroup(e) ? e.children : [e]));

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
          {NAV.map((entry) =>
            isNavGroup(entry) ? (
              <NavGroupSection key={entry.id} group={entry} />
            ) : (
              <NavItemLink key={entry.to} item={entry} />
            )
          )}
        </nav>

        <LangSwitcher />
        {auth.authEnabled && auth.username && (
          <button
            type="button"
            onClick={() => {
              void auth.logout();
            }}
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
        {/* Top nav mobile — groupes aplatis */}
        <nav className="md:hidden flex border-b border-slate-800 shrink-0">
          {flatNav.map(({ to, icon: Icon, label, end }) => (
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
