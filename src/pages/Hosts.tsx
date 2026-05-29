import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Host, HostConnexion } from "../../plugins/contracts.ts";
import { useHosts } from "../hooks/useHosts.ts";

import { exportCsv } from "../lib/exportCsv";

type SortKey = "hostname" | "ip" | "lastseen" | "active";
type SortDir = "asc" | "desc";

function Badge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return active ? (
    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
      <Wifi size={11} /> {t("hosts.connected")}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
      <WifiOff size={11} /> {t("hosts.inactive")}
    </span>
  );
}

function ConnexionBadge({
  connexion,
  ssid,
}: {
  connexion: HostConnexion | undefined;
  ssid?: string;
}) {
  if (!connexion) return <span className="text-slate-600">—</span>;
  if (connexion === "wifi 5G")
    return (
      <span title={ssid} className="flex items-center gap-1 text-xs text-violet-400 cursor-default">
        <Wifi size={11} /> 5G{ssid && <span className="text-violet-300/70">{ssid}</span>}
      </span>
    );
  if (connexion === "wifi 2.4G")
    return (
      <span title={ssid} className="flex items-center gap-1 text-xs text-blue-400 cursor-default">
        <Wifi size={11} /> 2.4G{ssid && <span className="text-blue-300/70">{ssid}</span>}
      </span>
    );
  return <span className="text-xs text-slate-500">Wired</span>;
}

function relativeTime(ts: number | undefined, justNow: string): string {
  if (!ts) return "—";
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return justNow;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

function ipToNum(ip?: string): number {
  if (!ip) return 0;
  return ip.split(".").reduce((acc, b) => acc * 256 + Number(b), 0);
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="text-slate-600" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="text-blue-400" />
  ) : (
    <ChevronDown size={12} className="text-blue-400" />
  );
}

function Th({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
}) {
  return (
    <th
      className="px-4 py-3 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );
}

function HostRow({ host, i }: { host: Host; i: number }) {
  const { t } = useTranslation();
  return (
    <tr
      key={host.mac ?? i}
      className="border-t border-slate-700/50 hover:bg-slate-800/40 transition-colors"
    >
      <td className="px-4 py-2.5">
        <Badge active={host.active} />
      </td>
      <td className="px-4 py-2.5 text-sm text-slate-200">
        {host.hostname || <span className="text-slate-500 italic">{t("hosts.noName")}</span>}
      </td>
      <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{host.ip ?? "—"}</td>
      <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{host.mac ?? "—"}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500 uppercase">{host.type ?? "—"}</td>
      <td className="px-4 py-2.5">
        <ConnexionBadge connexion={host.connexion} ssid={host.ssid} />
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500">
        {relativeTime(host.lastseen, t("hosts.justNow"))}
      </td>
    </tr>
  );
}

export default function Hosts() {
  const { t, i18n } = useTranslation();
  const { data: hostsData, isLoading, error, dataUpdatedAt } = useHosts();
  const qc = useQueryClient();

  const [filter, setFilter] = useState("");
  const [showActive, setShowActive] = useState<"all" | "active" | "inactive">("all");
  const [connexionFilter, setConnexionFilter] = useState<Set<HostConnexion>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("active");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleConnexion(v: HostConnexion) {
    setConnexionFilter((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  const hosts = hostsData?.hosts ?? null;

  const filtered = useMemo(() => {
    if (!hosts) return null;
    let list = hosts;

    if (showActive === "active") list = list.filter((h) => h.active);
    else if (showActive === "inactive") list = list.filter((h) => !h.active);

    if (connexionFilter.size > 0)
      list = list.filter((h) => h.connexion && connexionFilter.has(h.connexion));

    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(
        (h) =>
          h.hostname?.toLowerCase().includes(q) ||
          h.ip?.includes(q) ||
          h.mac?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "hostname") {
        cmp = (a.hostname ?? "").localeCompare(b.hostname ?? "");
      } else if (sortKey === "ip") {
        cmp = ipToNum(a.ip) - ipToNum(b.ip);
      } else if (sortKey === "lastseen") {
        cmp = (a.lastseen ?? 0) - (b.lastseen ?? 0);
      } else if (sortKey === "active") {
        cmp = Number(a.active) - Number(b.active);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [hosts, filter, showActive, connexionFilter, sortKey, sortDir]);

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col);
      setSortDir("desc");
    }
  }

  const active = hosts?.filter((h) => h.active).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-red-400 text-sm font-medium">{t("common.error")}</p>
        <pre className="text-xs text-red-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  if (!hosts) {
    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-amber-400 text-sm font-medium">{t("hosts.unexpectedFormat")}</p>
      </div>
    );
  }

  const csvHeaders = t("hosts.csvHeaders", { returnObjects: true }) as string[];

  return (
    <div className="p-6 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-100">{t("hosts.title")}</h1>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {t("hosts.connectedCount", { active, total: hosts.length })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-slate-600">
              {t("hosts.updatedAt", {
                time: new Date(dataUpdatedAt).toLocaleTimeString(
                  i18n.language === "fr" ? "fr-FR" : "en-GB",
                  { hour: "2-digit", minute: "2-digit" }
                ),
              })}
            </span>
          )}
          <button
            type="button"
            onClick={() =>
              exportCsv(
                "appareils.csv",
                csvHeaders,
                (filtered ?? []).map((h) => [
                  h.active ? t("hosts.connected") : t("hosts.inactive"),
                  h.hostname ?? "",
                  h.ip ?? "",
                  h.mac ?? "",
                  h.type ?? "",
                  h.connexion ?? "",
                  relativeTime(h.lastseen, t("hosts.justNow")),
                ])
              )
            }
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title={t("common.exportCsv")}
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ["hosts"] })}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title={t("common.refresh")}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder={t("hosts.search")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors w-64"
        />
        <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
          {(["all", "active", "inactive"] as const).map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => setShowActive(v)}
              className={`px-3 py-1.5 transition-colors ${
                showActive === v
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {v === "all"
                ? t("hosts.filterAll")
                : v === "active"
                  ? t("hosts.filterActive")
                  : t("hosts.filterInactive")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 border border-slate-700 rounded-lg px-3 py-1.5 bg-slate-800">
          {(["wired", "wifi 2.4G", "wifi 5G"] as HostConnexion[]).map((v) => (
            <label key={v} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={connexionFilter.has(v)}
                onChange={() => toggleConnexion(v)}
                className="accent-blue-500"
              />
              <ConnexionBadge connexion={v} />
            </label>
          ))}
        </div>
        {filtered && filtered.length !== hosts.length && (
          <span className="text-xs text-slate-500">
            {t("hosts.results", { count: filtered.length })}
          </span>
        )}
      </div>

      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-700">
              <Th
                label={t("hosts.colStatus")}
                col="active"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <Th
                label={t("hosts.colHost")}
                col="hostname"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <Th
                label={t("hosts.colIp")}
                col="ip"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-3 font-medium">{t("hosts.colMac")}</th>
              <th className="px-4 py-3 font-medium">{t("hosts.colType")}</th>
              <th className="px-4 py-3 font-medium">{t("hosts.colConnexion")}</th>
              <Th
                label={t("hosts.colLastSeen")}
                col="lastseen"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {filtered?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  {t("hosts.noHosts")}
                </td>
              </tr>
            )}
            {filtered?.map((h, i) => (
              <HostRow key={h.mac ?? i} host={h} i={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
