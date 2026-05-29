import {
  Activity,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  type LucideIcon,
  Map,
  Network,
  Router,
  ScanLine,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import type { FrontendPlugin, NavItemDescriptor } from "../../plugins/frontend-plugin.ts";
import type { MenuItemConfig } from "../hooks/useUiConfig.ts";
import { useUiConfig } from "../hooks/useUiConfig.ts";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeSelector } from "./ThemeSelector";

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

const CORE_DESCRIPTORS: NavItemDescriptor[] = [
  { id: "home", icon: Home, labelKey: "nav.home", path: "/", end: true },
  { id: "bandwidth", icon: Activity, labelKey: "nav.bandwidth", path: "/bandwidth" },
  { id: "hosts", icon: Wifi, labelKey: "nav.hosts", path: "/hosts" },
  { id: "scan", icon: ScanLine, labelKey: "nav.scan", path: "/scan" },
  { id: "hotspots", icon: Router, labelKey: "nav.hotspots", path: "/hotspots" },
  { id: "map", icon: Map, labelKey: "nav.map", path: "/map" },
];

function resolveMenuItem(
  item: MenuItemConfig,
  descriptors: NavItemDescriptor[],
  t: (key: string) => string
): NavEntry | null {
  if (item.children?.length) {
    const children = item.children
      .map((c) => resolveMenuItem(c, descriptors, t))
      .filter((e): e is NavItem => e !== null && !isNavGroup(e));
    if (!children.length) return null;
    return { id: item.id, label: t(`nav.${item.id}`), children };
  }

  const descriptor = descriptors.find((d) => d.id === item.id);
  if (!descriptor) return null;

  let to: string;
  if (typeof descriptor.path === "function") {
    if (!item.router) return null;
    to = descriptor.path(item.router);
  } else {
    to = descriptor.path;
  }

  return {
    id: descriptor.id,
    to,
    icon: descriptor.icon,
    label: t(descriptor.labelKey),
    end: descriptor.end ?? false,
  };
}

function buildDefaultNav(descriptors: NavItemDescriptor[], t: (key: string) => string): NavItem[] {
  return descriptors
    .filter((d) => typeof d.path === "string")
    .map((d) => ({
      id: d.id,
      to: d.path as string,
      icon: d.icon,
      label: t(d.labelKey),
      end: d.end ?? false,
    }));
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-sm transition-all rounded-r-xl mr-3 ${
          isActive
            ? "bg-blue-500/15 text-blue-400 font-semibold border-l-4 border-blue-500 pl-3"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-l-4 border-transparent pl-3"
        }`
      }
    >
      <item.icon size={18} />
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
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors"
      >
        {group.label}
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {open && (
        <div className="flex flex-col gap-0.5">
          {group.children.map((child) => (
            <NavItemLink key={child.to} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({
  auth,
  activePlugins,
}: {
  auth: AuthProps;
  activePlugins: FrontendPlugin[];
}) {
  const { t } = useTranslation();
  const uiConfig = useUiConfig();

  const descriptors: NavItemDescriptor[] = [
    ...CORE_DESCRIPTORS,
    ...activePlugins.flatMap((p) => p.navItems ?? []),
  ];

  const NAV: NavEntry[] =
    uiConfig.menu === null
      ? buildDefaultNav(descriptors, t)
      : uiConfig.menu
          .map((item) => resolveMenuItem(item, descriptors, t))
          .filter((e): e is NavEntry => e !== null);

  const flatNav: NavItem[] = NAV.flatMap((e) => (isNavGroup(e) ? e.children : [e]));

  return (
    <div className="flex h-dvh bg-slate-900 text-slate-100">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-700/50 shrink-0">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Network size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-slate-100 tracking-wide">fast5688b</span>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1 pt-3 pb-3 overflow-y-auto">
          {NAV.map((entry) =>
            isNavGroup(entry) ? (
              <NavGroupSection key={entry.id} group={entry} />
            ) : (
              <NavItemLink key={entry.id} item={entry} />
            )
          )}
        </nav>

        <div className="border-t border-slate-700/50 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <ThemeSelector />
            <LangSwitcher />
          </div>
          {auth.authEnabled && auth.username && (
            <button
              type="button"
              onClick={() => {
                void auth.logout();
              }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              title={t("auth.logout")}
            >
              <LogOut size={13} />
              {auth.username}
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top nav mobile — groupes aplatis */}
        <nav className="md:hidden flex border-b border-slate-800 shrink-0">
          {flatNav.map(({ id, to, icon: Icon, label, end }) => (
            <NavLink
              key={id}
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

        <main className="flex-1 min-h-0 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
