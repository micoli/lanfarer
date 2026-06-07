import { AlertTriangle, Bookmark, BookmarkPlus, Check, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateDhcpClient, useIpCheck } from "../../plugins/bbox/frontend/hooks/useBbox.ts";
import type { AccessPoint, DhcpClient, WirelessClient } from "../../plugins/contracts.ts";
import { useHotspotNav } from "../contexts/HotspotNavContext.tsx";
import { useVendor } from "../hooks/useVendor.ts";
import { HostProbeButton } from "./HostProbeButton.tsx";

export function sortAccessPoints<T extends { ssid: string; band: string }>(aps: T[]): T[] {
  return [...aps].sort((a, b) => {
    const s = a.ssid.localeCompare(b.ssid);
    if (s !== 0) return s;
    return a.band.localeCompare(b.band);
  });
}

export function signalBars(dbm: number): string {
  const abs = Math.abs(dbm);
  if (abs <= 50) return "▂▄▆█";
  if (abs <= 65) return "▂▄▆·";
  if (abs <= 75) return "▂▄··";
  return "▂···";
}

export function signalColor(dbm: number): string {
  const abs = Math.abs(dbm);
  if (abs <= 50) return "text-green-400";
  if (abs <= 65) return "text-yellow-400";
  if (abs <= 75) return "text-orange-400";
  return "text-red-400";
}

export function formatRate(kbps: number): string {
  if (!kbps) return "—";
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(0)} Mbps`;
  return `${kbps} Kbps`;
}

// Fixed column widths indexed by total column count.
// 5 cols: Host | Signal | IP | Tx | Rx
// 6 cols: Host | Signal | IP | Tx | Rx | (DHCP action)
const COL_WIDTHS: Record<number, string[]> = {
  5: ["36%", "18%", "24%", "11%", "11%"],
  6: ["32%", "16%", "22%", "10%", "10%", "10%"],
};

export function HostTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  const widths = COL_WIDTHS[headers.length] ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
        {widths.length > 0 && (
          <colgroup>
            {widths.map((w, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable fixed-width columns
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wide">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function CardHeader({
  online,
  name,
  subtitle,
  badge,
  count,
  ssid,
  band,
}: {
  online: boolean;
  name: string;
  subtitle?: string;
  badge?: string;
  count: number;
  ssid?: string;
  band?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
      {online ? (
        <Wifi size={16} className="text-green-400 shrink-0" />
      ) : (
        <WifiOff size={16} className="text-red-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm text-slate-100">{name}</span>
        {subtitle && <span className="ml-2 text-xs text-slate-500">{subtitle}</span>}
        {ssid && <span className="ml-2 font-mono text-xs text-slate-300">{ssid}</span>}
        {band && (
          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
            {band}
          </span>
        )}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
          {badge}
        </span>
      )}
      <span className="text-xs text-slate-400 ml-1">{t("cudy.clientCount", { count })}</span>
    </div>
  );
}

function ClientRow({
  client,
  hostname,
  ip,
  reservation,
  dhcpRouterId,
  colCount,
}: {
  client: WirelessClient;
  hostname?: string;
  ip?: string;
  reservation: DhcpClient | undefined;
  dhcpRouterId: string | null;
  colCount: number;
}) {
  const { t } = useTranslation();
  const isReserved = !!reservation;
  const vendor = useVendor(client.mac);
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
      hostname: hostname ?? "",
      macaddress: client.mac,
      ipaddress: ip ?? "",
      ip6address: "",
    });
    setAdding(true);
  }

  if (adding) {
    return (
      <>
        <tr className="border-t border-slate-800 bg-slate-800/60">
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
              placeholder="192.168.1.x"
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
          <td className="px-4 py-2" colSpan={colCount - 4}>
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
              colSpan={colCount}
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
    <tr className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-2.5">
        {hostname ? (
          <span className="text-xs text-slate-100">{hostname}</span>
        ) : (
          <span className="text-xs text-slate-500 italic">{t("hosts.noName")}</span>
        )}
        {reservation?.hostname && reservation.hostname !== hostname && (
          <div className="text-xs text-blue-400 mt-0.5">{reservation.hostname}</div>
        )}
        <div className="font-mono text-xs text-slate-500 mt-0.5">{client.mac}</div>
        {vendor && <div className="text-xs text-slate-500 mt-0.5">{vendor}</div>}
      </td>
      <td className={`px-4 py-2.5 text-xs font-mono ${signalColor(client.signal_dbm)}`}>
        <span className="mr-1.5 tracking-tight">{signalBars(client.signal_dbm)}</span>
        {client.signal_dbm} dBm
      </td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-0.5 font-mono text-xs text-slate-400">
          {ip || "—"}
          {ip && <HostProbeButton ip={ip} mac={client.mac} />}
        </span>
        {dhcpRouterId && ip && (
          <span
            className={`ml-1.5 text-xs px-1 py-0.5 rounded ${isReserved ? "bg-blue-500/10 text-blue-400" : "bg-slate-700/60 text-slate-500"}`}
          >
            {isReserved ? "static" : "DHCP"}
          </span>
        )}
        {reservation?.ipaddress && reservation.ipaddress !== ip && (
          <div className="font-mono text-xs text-blue-400 mt-0.5">{reservation.ipaddress}</div>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{formatRate(client.tx_kbps)}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{formatRate(client.rx_kbps)}</td>
      {dhcpRouterId && (
        <td className="px-4 py-2.5">
          {isReserved ? (
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
          )}
        </td>
      )}
    </tr>
  );
}

export function AccessPointCard({
  ap,
  routerName,
  routerSubtitle,
  routerOnline,
  hostnames,
  ips,
  dhcpRouterId,
  reservedMacs,
}: {
  ap: AccessPoint;
  routerName: string;
  routerSubtitle?: string;
  routerOnline: boolean;
  hostnames: (mac: string) => string | undefined;
  ips: (mac: string) => string | undefined;
  dhcpRouterId?: string | null;
  reservedMacs?: Map<string, DhcpClient>;
}) {
  const { t } = useTranslation();
  const nav = useHotspotNav();
  const sorted = [...ap.clients].sort((a, b) => a.signal_dbm - b.signal_dbm);

  const cardId = `ap-${routerName}-${ap.ssid}-${ap.band}`.replace(/[^a-zA-Z0-9-]/g, "-");

  useEffect(() => {
    if (!nav) return;
    nav.register({
      id: cardId,
      name: routerName,
      ssid: ap.ssid,
      band: ap.band,
      ip: routerSubtitle,
      clientCount: ap.clients.length,
      online: routerOnline,
    });
    return () => nav.unregister(cardId);
  }, [nav, cardId, routerName, routerSubtitle, ap.clients.length, routerOnline, ap.band, ap.ssid]);

  const hasDhcp = !!dhcpRouterId;
  const baseHeaders = [
    t("cudy.colHost"),
    t("cudy.colSignal"),
    "IP",
    t("cudy.colTx"),
    t("cudy.colRx"),
  ];
  const headers = hasDhcp ? [...baseHeaders, ""] : baseHeaders;
  const colCount = headers.length;

  return (
    <div id={cardId} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <CardHeader
        online={routerOnline}
        name={routerName}
        subtitle={routerSubtitle}
        badge={!routerOnline ? t("cudy.offline") : undefined}
        count={ap.clients.length}
        ssid={ap.ssid}
        band={ap.band}
      />
      {routerOnline && ap.clients.length > 0 && (
        <HostTable headers={headers}>
          {sorted.map((c) => (
            <ClientRow
              key={c.mac}
              client={c}
              hostname={hostnames(c.mac)}
              ip={ips(c.mac)}
              reservation={reservedMacs?.get(c.mac.toLowerCase())}
              dhcpRouterId={dhcpRouterId ?? null}
              colCount={colCount}
            />
          ))}
        </HostTable>
      )}
      {routerOnline && ap.clients.length === 0 && (
        <p className="px-4 py-4 text-xs text-slate-500">{t("cudy.noClients")}</p>
      )}
    </div>
  );
}
