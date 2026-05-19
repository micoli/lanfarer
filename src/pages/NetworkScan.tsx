import {
  AlertTriangle,
  Bookmark,
  BookmarkPlus,
  Check,
  Download,
  ScanLine,
  StopCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateDhcpClient, useDhcpClients, useDhcpConfig, useIpCheck } from "../hooks/useBbox";
import type { components } from "../lib/api/schema.d.ts";

type DhcpClient = components["schemas"]["DhcpClient"];

import { exportCsv } from "../lib/exportCsv";

interface PingStats {
  min: number;
  avg: number;
  max: number;
}

interface ScanHost {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  ping: boolean;
  // filled in by host-detail
  pingStats?: PingStats;
  openPorts?: number[];
  mdnsName?: string;
  smbName?: string;
  smbDomain?: string;
}

function ipToNum(ip: string): number {
  return ip.split(".").reduce((acc, b) => acc * 256 + Number(b), 0);
}

function subnetFromIp(ip: string): string {
  const p = ip.split(".");
  return `${p[0]}.${p[1]}.${p[2]}.0/24`;
}

function PingCell({ host }: { host: ScanHost }) {
  if (!host.ping) return <span className="inline-block w-2 h-2 rounded-full bg-slate-600" />;
  if (host.pingStats) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
          {host.pingStats.min.toFixed(1)}/{host.pingStats.avg.toFixed(1)}/
          {host.pingStats.max.toFixed(1)}
          <span className="text-slate-600"> ms</span>
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-2 h-2 rounded-full bg-green-400 shrink-0" />
      <span className="text-xs text-slate-600">…</span>
    </span>
  );
}

function PortBadge({ port }: { port: number }) {
  return (
    <span className="inline-block px-1 py-0.5 bg-slate-700 text-slate-300 text-xs font-mono rounded">
      {port}
    </span>
  );
}

function PortsCell({ ports }: { ports?: number[] }) {
  if (!ports) return <span className="text-slate-600 text-xs">…</span>;
  if (ports.length === 0) return <span className="text-slate-600">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {ports.map((p) => (
        <PortBadge key={p} port={p} />
      ))}
    </div>
  );
}

function ScanHostRow({ host, isReserved }: { host: ScanHost; isReserved: boolean }) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<DhcpClient, "id">>({
    enable: 1,
    hostname: "",
    macaddress: "",
    ipaddress: "",
    ip6address: "",
  });
  const create = useCreateDhcpClient();
  const { checking, conflict, clearConflict, check } = useIpCheck();

  function openAdd() {
    setDraft({
      enable: 1,
      hostname: host.hostname ?? "",
      macaddress: host.mac ?? "",
      ipaddress: host.ip ?? "",
      ip6address: "",
    });
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
                title={conflict ? t("common.forceConflict") : t("scan.createReservation")}
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
                onClick={() => {
                  setAdding(false);
                  clearConflict();
                }}
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
            <td
              colSpan={8}
              className="px-4 py-1.5 text-xs text-amber-400 flex items-center gap-1.5"
            >
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
    <tr className="border-t border-slate-700/50 hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-2.5 font-mono text-sm text-slate-200 whitespace-nowrap">{host.ip}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">
        {host.mac || "—"}
      </td>
      <td className="px-4 py-2.5 text-sm text-slate-300">
        <div className="flex flex-col">
          <span>{host.hostname || <span className="text-slate-600 italic">—</span>}</span>
          {host.mdnsName && host.mdnsName !== host.hostname && (
            <span className="text-xs text-slate-500">{host.mdnsName}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <PingCell host={host} />
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-400">
        {host.vendor || <span className="text-slate-600">—</span>}
      </td>
      <td className="px-4 py-2.5">
        <PortsCell ports={host.openPorts} />
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
        {host.smbName ? (
          <>
            <span className="text-slate-300">{host.smbName}</span>
            {host.smbDomain && <span className="text-slate-600"> / {host.smbDomain}</span>}
          </>
        ) : host.smbName === undefined ? (
          <span className="text-slate-600">…</span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {isReserved ? (
          <span title={t("scan.reservationActive")} className="p-1 inline-flex text-blue-400">
            <Bookmark size={14} />
          </span>
        ) : (
          <button
            type="button"
            title={t("scan.addReservation")}
            onClick={openAdd}
            className="p-1 rounded text-slate-500 hover:text-blue-400 transition-colors"
          >
            <BookmarkPlus size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

export default function NetworkScan() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [hosts, setHosts] = useState<ScanHost[]>([]);
  const [subnet, setSubnet] = useState("");
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const { data: rawDhcp } = useDhcpConfig();
  const { data: rawClients } = useDhcpClients();

  useEffect(() => {
    if (subnet) return;
    const dhcp = Array.isArray(rawDhcp)
      ? rawDhcp[0]?.dhcp
      : (rawDhcp as { dhcp?: { minaddress?: string } })?.dhcp;
    const ip = dhcp?.minaddress;
    if (ip) setSubnet(subnetFromIp(ip));
  }, [rawDhcp, subnet]);

  const reservedMacs = useMemo<Set<string>>(() => {
    const clients = Array.isArray(rawClients)
      ? rawClients.length > 0 && "macaddress" in rawClients[0]
        ? rawClients
        : (rawClients[0]?.dhcp?.clients ?? rawClients[0]?.dhcpclients ?? [])
      : [];
    return new Set(
      (clients as { macaddress?: string }[])
        .map((c) => c.macaddress?.toLowerCase() ?? "")
        .filter(Boolean)
    );
  }, [rawClients]);

  function startScan() {
    esRef.current?.close();
    setHosts([]);
    setProgress({ done: 0, total: 0 });
    setError(null);
    setScanning(true);

    const url = `/__scan${subnet.trim() ? `?subnet=${encodeURIComponent(subnet.trim())}` : ""}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("progress", (e) => {
      setProgress(JSON.parse(e.data) as { done: number; total: number });
    });

    es.addEventListener("host", (e) => {
      const host = JSON.parse(e.data) as ScanHost;
      setHosts((prev) => [...prev, host].sort((a, b) => ipToNum(a.ip) - ipToNum(b.ip)));
    });

    es.addEventListener("host-detail", (e) => {
      const detail = JSON.parse(e.data) as Partial<ScanHost> & { ip: string };
      setHosts((prev) => prev.map((h) => (h.ip === detail.ip ? { ...h, ...detail } : h)));
    });

    es.addEventListener("done", () => {
      setScanning(false);
      es.close();
      esRef.current = null;
    });

    es.addEventListener("error", (e) => {
      const msg = (e as MessageEvent).data
        ? (JSON.parse((e as MessageEvent).data) as { message: string }).message
        : t("scan.sseError");
      setError(msg);
      setScanning(false);
      es.close();
      esRef.current = null;
    });
  }

  function stopScan() {
    esRef.current?.close();
    esRef.current = null;
    setScanning(false);
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="p-6 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-100">{t("scan.title")}</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={t("scan.subnetPlaceholder")}
            value={subnet}
            onChange={(e) => setSubnet(e.target.value)}
            disabled={scanning}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors w-56 font-mono disabled:opacity-50"
          />
          {hosts.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportCsv(
                  "scan-reseau.csv",
                  [
                    t("scan.colIp"),
                    t("scan.colMac"),
                    "Hostname",
                    "mDNS",
                    "Ping min",
                    "Ping avg",
                    "Ping max",
                    t("scan.colVendor"),
                    t("scan.colPorts"),
                    t("scan.colSmb"),
                    "SMB Domain",
                  ],
                  hosts.map((h) => [
                    h.ip,
                    h.mac,
                    h.hostname,
                    h.mdnsName ?? "",
                    h.pingStats?.min ?? "",
                    h.pingStats?.avg ?? "",
                    h.pingStats?.max ?? "",
                    h.vendor,
                    (h.openPorts ?? []).join(" "),
                    h.smbName ?? "",
                    h.smbDomain ?? "",
                  ])
                )
              }
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              title={t("common.exportCsv")}
            >
              <Download size={14} />
            </button>
          )}
          {scanning ? (
            <button
              type="button"
              onClick={stopScan}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/30"
            >
              <StopCircle size={14} />
              {t("scan.stopScan")}
            </button>
          ) : (
            <button
              type="button"
              onClick={startScan}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ScanLine size={14} />
              {t("scan.startScan")}
            </button>
          )}
        </div>
      </div>

      {(scanning || progress.total > 0) && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">
            {t("scan.scanned", { done: progress.done, total: progress.total })}
            {hosts.length > 0 && ` — ${t("scan.hostsFound", { count: hosts.length })}`}
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
          {error}
        </p>
      )}

      {hosts.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-700">
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("scan.colIp")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("scan.colMac")}</th>
                <th className="px-4 py-3 font-medium">{t("scan.colHostname")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("scan.colPing")}</th>
                <th className="px-4 py-3 font-medium">{t("scan.colVendor")}</th>
                <th className="px-4 py-3 font-medium">{t("scan.colPorts")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("scan.colSmb")}</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((h) => (
                <ScanHostRow
                  key={h.ip}
                  host={h}
                  isReserved={reservedMacs.has(h.mac?.toLowerCase() ?? "")}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!scanning && hosts.length === 0 && progress.total > 0 && (
        <p className="text-sm text-slate-500 text-center py-8">{t("scan.noHosts")}</p>
      )}
    </div>
  );
}
