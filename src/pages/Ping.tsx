import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Host } from "../../plugins/contracts.ts";
import { useHosts } from "../hooks/useHosts.ts";
import { type HostPingState, usePing } from "../hooks/usePing.ts";
import { useVendor, useVendors } from "../hooks/useVendor.ts";

type SortKey = "ip" | "hostname" | "rtt" | "loss";
type SortDir = "asc" | "desc";

function rttColor(rtt: number | null): string {
  if (rtt === null) return "text-slate-500";
  if (rtt < 5) return "text-emerald-400";
  if (rtt < 20) return "text-green-400";
  if (rtt < 50) return "text-yellow-400";
  if (rtt < 100) return "text-orange-400";
  return "text-red-400";
}

function lossColor(loss: number): string {
  if (loss === 0) return "text-slate-400";
  if (loss < 10) return "text-yellow-400";
  if (loss < 50) return "text-orange-400";
  return "text-red-400";
}

function ipToNum(ip?: string | null): number {
  if (!ip) return 0;
  return ip.split(".").reduce((acc, b) => acc * 256 + Number(b), 0);
}

function RttSparkline({ history }: { history: (number | null)[] }) {
  const valid = history
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null);

  if (valid.length < 2) {
    return <div className="w-20 h-5 bg-slate-700/30 rounded" />;
  }

  const W = 80;
  const H = 20;
  const n = Math.max(history.length - 1, 1);
  const max = Math.max(...valid.map((x) => x.v), 1);

  const xOf = (i: number) => (i / n) * W;
  const yOf = (v: number) => H - 2 - (v / max) * (H - 4);

  const pts = valid.map((x) => `${xOf(x.i).toFixed(1)},${yOf(x.v).toFixed(1)}`).join(" ");

  const latestRtt = history[history.length - 1];
  const stroke =
    latestRtt === null
      ? "#64748b"
      : latestRtt < 20
        ? "#34d399"
        : latestRtt < 50
          ? "#facc15"
          : "#f87171";

  return (
    <svg width={W} height={H} className="overflow-visible" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatCell({ val, unit }: { val: number | null; unit?: string }) {
  if (val === null) return <span className="text-slate-600">—</span>;
  return (
    <span>
      {val}
      {unit && <span className="text-slate-500 text-xs ml-0.5">{unit}</span>}
    </span>
  );
}

function PingRow({ host, ping }: { host: Host; ping: HostPingState | undefined }) {
  const { t } = useTranslation();
  const vendor = useVendor(host.mac ?? undefined);

  return (
    <tr className="border-t border-slate-700/50 hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-2.5">
        {host.active ? (
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full w-fit">
            <Wifi size={11} /> {t("hosts.connected")}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full w-fit">
            <WifiOff size={11} /> {t("hosts.inactive")}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-sm text-slate-200">
        {host.hostname || <span className="text-slate-500 italic">{t("hosts.noName")}</span>}
        {vendor && <div className="text-xs text-slate-500">{vendor}</div>}
      </td>
      <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{host.ip ?? "—"}</td>
      <td
        className={`px-4 py-2.5 text-sm font-mono font-semibold tabular-nums ${rttColor(ping?.rtt ?? null)}`}
      >
        {ping === undefined ? (
          <span className="text-slate-600 text-xs">{t("ping.connecting")}</span>
        ) : ping.rtt === null ? (
          <span className="text-slate-500 text-xs">{t("ping.timeout")}</span>
        ) : (
          <>
            {Math.round(ping.rtt)}
            <span className="text-slate-500 text-xs ml-0.5">{t("ping.ms")}</span>
          </>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs font-mono text-slate-400 tabular-nums">
        <StatCell val={ping?.min ?? null} unit="ms" />
      </td>
      <td className="px-4 py-2.5 text-xs font-mono text-slate-400 tabular-nums">
        <StatCell val={ping?.avg ?? null} unit="ms" />
      </td>
      <td className="px-4 py-2.5 text-xs font-mono text-slate-400 tabular-nums">
        <StatCell val={ping?.max ?? null} unit="ms" />
      </td>
      <td className={`px-4 py-2.5 text-xs font-mono tabular-nums ${lossColor(ping?.loss ?? 0)}`}>
        {ping !== undefined ? `${ping.loss}%` : "—"}
      </td>
      <td className="px-4 py-2.5">{ping && <RttSparkline history={ping.history} />}</td>
    </tr>
  );
}

export default function Ping() {
  const { t } = useTranslation();
  const { data, isLoading, progress, progressLabel, refresh } = useHosts();

  const [showActive, setShowActive] = useState<"all" | "active">("active");
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ip");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const allHosts = useMemo(() => (data?.hosts ?? []).filter((h) => h.ip), [data]);

  const ips = useMemo(() => allHosts.flatMap((h) => (h.ip ? [h.ip] : [])), [allHosts]);
  const pingStates = usePing(ips);
  const allMacs = useMemo(() => allHosts.map((h) => h.mac), [allHosts]);
  const vendorMap = useVendors(allMacs);

  const filtered = useMemo(() => {
    let list = allHosts;
    if (showActive === "active") list = list.filter((h) => h.active);
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
      if (sortKey === "ip") {
        cmp = ipToNum(a.ip) - ipToNum(b.ip);
      } else if (sortKey === "hostname") {
        cmp = (a.hostname ?? "").localeCompare(b.hostname ?? "");
      } else if (sortKey === "rtt") {
        const ar = pingStates.get(a.ip ?? "")?.avg ?? Infinity;
        const br = pingStates.get(b.ip ?? "")?.avg ?? Infinity;
        cmp = ar - br;
      } else if (sortKey === "loss") {
        const al = pingStates.get(a.ip ?? "")?.loss ?? 0;
        const bl = pingStates.get(b.ip ?? "")?.loss ?? 0;
        cmp = al - bl;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allHosts, showActive, filter, sortKey, sortDir, pingStates, vendorMap]);

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  function SortTh({ label, col, className }: { label: string; col: SortKey; className?: string }) {
    return (
      <th
        className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors ${className ?? ""}`}
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          {sortKey === col && (
            <span className="text-blue-400">{sortDir === "asc" ? "↑" : "↓"}</span>
          )}
        </span>
      </th>
    );
  }

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

  return (
    <div className="p-6 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-100">{t("ping.title")}</h1>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {t("ping.hostCount", { count: filtered.length })}
          </span>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title={t("common.refresh")}
        >
          <RefreshCw size={14} />
        </button>
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
          {(["active", "all"] as const).map((v) => (
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
              {v === "all" ? t("hosts.filterAll") : t("hosts.filterActive")}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">{t("ping.subtitle")}</p>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">{t("ping.noHosts")}</div>
      ) : (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-700">
                <th className="px-4 py-3 font-medium">{t("hosts.colStatus")}</th>
                <SortTh label={t("hosts.colHost")} col="hostname" />
                <SortTh label={t("hosts.colIp")} col="ip" />
                <SortTh label={t("ping.colRtt")} col="rtt" />
                <th className="px-4 py-3 font-medium">{t("ping.colMin")}</th>
                <th className="px-4 py-3 font-medium">{t("ping.colAvg")}</th>
                <th className="px-4 py-3 font-medium">{t("ping.colMax")}</th>
                <SortTh label={t("ping.colLoss")} col="loss" />
                <th className="px-4 py-3 font-medium">{t("ping.colHistory")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h, i) => (
                <PingRow key={h.mac ?? i} host={h} ping={h.ip ? pingStates.get(h.ip) : undefined} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
