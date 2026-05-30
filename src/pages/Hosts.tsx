import {
  AlertTriangle,
  Bookmark,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DhcpClient, Host, HostConnexion } from "../../plugins/contracts.ts";
import {
  useCreateDhcpClient,
  useDhcpClients,
  useIpCheck,
} from "../../plugins/bbox/frontend/hooks/useBbox.ts";
import { useHosts } from "../hooks/useHosts.ts";
import { useVendor, useVendors } from "../hooks/useVendor.ts";
import { useDhcpRouterId } from "../hooks/useUiConfig.ts";

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

function HostRow({
  host,
  i,
  dhcpRouterId,
  reservationByMac,
}: {
  host: Host;
  i: number;
  dhcpRouterId: string | null;
  reservationByMac: Map<string, DhcpClient>;
}) {
  const { t } = useTranslation();
  const vendor = useVendor(host.mac ?? undefined);
  const isReserved = host.mac ? reservationByMac.has(host.mac.toLowerCase()) : false;
  const reservation = host.mac ? reservationByMac.get(host.mac.toLowerCase()) : undefined;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<DhcpClient, "id">>({
    enable: 1,
    hostname: "",
    macaddress: "",
    ipaddress: "",
    ip6address: "",
  });
  const create = useCreateDhcpClient(dhcpRouterId);
  const { checking, conflict, clearConflict, check } = useIpCheck();

  function openAdd() {
    setDraft({
      enable: 1,
      hostname: host.hostname ?? "",
      macaddress: host.mac ?? "",
      ipaddress: host.ip ?? "",
      ip6address: "",
    });
    clearConflict();
    setAdding(true);
  }

  if (adding) {
    return (
      <>
        <tr className="border-t border-slate-700/50 bg-slate-800/40">
          <td className="px-4 py-2" colSpan={2}>
            <input
              className="input-cell w-full"
              placeholder={t("common.hostname")}
              value={draft.hostname}
              onChange={(e) => setDraft({ ...draft, hostname: e.target.value })}
            />
          </td>
          <td className="px-4 py-2">
            <input
              className="input-cell font-mono w-full"
              placeholder="192.168.x.x"
              value={draft.ipaddress}
              onChange={(e) => {
                setDraft({ ...draft, ipaddress: e.target.value });
                clearConflict();
              }}
            />
          </td>
          <td className="px-4 py-2">
            <input
              className="input-cell font-mono w-full"
              placeholder="aa:bb:cc:dd:ee:ff"
              value={draft.macaddress}
              onChange={(e) => {
                setDraft({ ...draft, macaddress: e.target.value });
                clearConflict();
              }}
            />
          </td>
          <td className="px-4 py-2" colSpan={4}>
            <div className="flex gap-1.5 items-center">
              <button
                type="button"
                title={conflict ? t("common.forceConflict") : t("hosts.createReservation")}
                disabled={!draft.macaddress || !draft.ipaddress || create.isPending || checking}
                onClick={() =>
                  check(draft.ipaddress, draft.macaddress, () =>
                    create.mutate(draft, { onSuccess: () => setAdding(false) })
                  )
                }
                className={`p-1 rounded disabled:opacity-40 transition-colors ${conflict ? "text-amber-400 hover:text-amber-300" : "text-blue-400 hover:text-blue-300"}`}
              >
                {conflict ? <AlertTriangle size={14} /> : <Check size={14} />}
              </button>
              <button
                type="button"
                title={t("common.cancel")}
                onClick={() => { setAdding(false); clearConflict(); }}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
              {create.error && (
                <span className="text-xs text-red-400">{(create.error as Error).message}</span>
              )}
            </div>
          </td>
        </tr>
        {conflict && (
          <tr className="bg-amber-500/10 border-t border-amber-500/20">
            <td colSpan={8} className="px-4 py-1.5 text-xs text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              {conflict}
              {t("common.clickAgainToForce")}
            </td>
          </tr>
        )}
      </>
    );
  }

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
        {reservation?.hostname && reservation.hostname !== host.hostname && (
          <div className="text-xs text-blue-400 mt-0.5">{reservation.hostname}</div>
        )}
      </td>
      <td className="px-4 py-2.5 text-sm font-mono text-slate-300">
        {host.ip ?? "—"}
        {reservation?.ipaddress && reservation.ipaddress !== host.ip && (
          <div className="text-xs text-blue-400 mt-0.5">{reservation.ipaddress}</div>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs font-mono text-slate-400">
        {host.mac ?? "—"}
        {vendor && <div className="text-slate-500 font-sans normal-case">{vendor}</div>}
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500 uppercase">{host.type ?? "—"}</td>
      <td className="px-4 py-2.5">
        <ConnexionBadge connexion={host.connexion} ssid={host.ssid} />
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500">
        {relativeTime(host.lastseen, t("hosts.justNow"))}
      </td>
      <td className="px-4 py-2.5">
        {dhcpRouterId && (
          isReserved ? (
            <span title={t("hosts.reservationActive")} className="p-1 inline-flex text-blue-400">
              <Bookmark size={14} />
            </span>
          ) : (
            <button
              type="button"
              title={t("hosts.addReservation")}
              onClick={openAdd}
              className="p-1 rounded text-slate-500 hover:text-blue-400 transition-colors"
            >
              <BookmarkPlus size={14} />
            </button>
          )
        )}
      </td>
    </tr>
  );
}

export default function Hosts() {
  const { t, i18n } = useTranslation();
  const { data: hostsData, isLoading, progress, progressLabel, error, dataUpdatedAt, refresh } = useHosts();
  const dhcpRouterId = useDhcpRouterId();
  const { data: dhcpData } = useDhcpClients(dhcpRouterId);
  const reservationByMac = useMemo(() => {
    const map = new Map<string, DhcpClient>();
    for (const c of dhcpData?.clients ?? []) {
      map.set(c.macaddress.toLowerCase(), c);
    }
    return map;
  }, [dhcpData]);

  const [filter, setFilter] = useState("");
  const [showActive, setShowActive] = useState<"all" | "active" | "inactive">("active");
  const [connexionFilter, setConnexionFilter] = useState<Set<HostConnexion>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("ip");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleConnexion(v: HostConnexion) {
    setConnexionFilter((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  const hosts = hostsData?.hosts ?? null;
  const allMacs = useMemo(() => (hosts ?? []).map((h) => h.mac), [hosts]);
  const vendorMap = useVendors(allMacs);

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
          h.mac?.toLowerCase().includes(q) ||
          (h.mac && vendorMap.get(h.mac.toLowerCase())?.toLowerCase().includes(q))
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
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-8">
        <div className="w-full max-w-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{progressLabel || t("common.loading")}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
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
            onClick={refresh}
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
              <th className="px-2 py-3 font-medium">DHCP</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  {t("hosts.noHosts")}
                </td>
              </tr>
            )}
            {filtered?.map((h, i) => (
              <HostRow
                key={h.mac ?? i}
                host={h}
                i={i}
                dhcpRouterId={dhcpRouterId}
                reservationByMac={reservationByMac}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
