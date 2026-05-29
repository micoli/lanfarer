import { Wifi, WifiOff } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AccessPoint, WirelessClient } from "../../plugins/contracts.ts";
import { useHotspotNav } from "../contexts/HotspotNavContext.tsx";

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

export function HostTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
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
}: {
  online: boolean;
  name: string;
  subtitle?: string;
  badge?: string;
  count: number;
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

export function ClientRow({
  client,
  ssid,
  band,
  hostname,
  ip,
}: {
  client: WirelessClient;
  ssid: string;
  band: string;
  hostname?: string;
  ip?: string;
}) {
  const { t } = useTranslation();
  return (
    <tr className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-2.5">
        {hostname ? (
          <span className="text-xs text-slate-100">{hostname}</span>
        ) : (
          <span className="text-xs text-slate-500 italic">{t("hosts.noName")}</span>
        )}
        <div className="font-mono text-xs text-slate-500 mt-0.5">{client.mac}</div>
      </td>
      <td className={`px-4 py-2.5 text-xs font-mono ${signalColor(client.signal_dbm)}`}>
        <span className="mr-1.5 tracking-tight">{signalBars(client.signal_dbm)}</span>
        {client.signal_dbm} dBm
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-400">{band}</td>
      <td className="px-4 py-2.5 text-xs text-slate-400">{ssid || "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{ip || "—"}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{formatRate(client.tx_kbps)}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{formatRate(client.rx_kbps)}</td>
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
}: {
  ap: AccessPoint;
  routerName: string;
  routerSubtitle?: string;
  routerOnline: boolean;
  hostnames: (mac: string) => string | undefined;
  ips: (mac: string) => string | undefined;
}) {
  const { t } = useTranslation();
  const nav = useHotspotNav();
  const sorted = [...ap.clients].sort((a, b) => a.signal_dbm - b.signal_dbm);

  const cardId = `ap-${routerName}-${ap.ssid}-${ap.band}`.replace(/[^a-zA-Z0-9-]/g, "-");

  useEffect(() => {
    if (!nav) return;
    nav.register({ id: cardId, name: routerName, ssid: ap.ssid, band: ap.band, ip: routerSubtitle, clientCount: ap.clients.length, online: routerOnline });
    return () => nav.unregister(cardId);
  }, [nav, cardId, routerName, routerSubtitle, ap.clients.length, routerOnline]);

  return (
    <div id={cardId} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <CardHeader
        online={routerOnline}
        name={routerName}
        subtitle={routerSubtitle}
        badge={!routerOnline ? t("cudy.offline") : undefined}
        count={ap.clients.length}
      />
      {routerOnline && ap.clients.length > 0 && (
        <HostTable
          headers={[
            t("cudy.colHost"),
            t("cudy.colSignal"),
            t("cudy.colBand"),
            t("cudy.colSsid"),
            "IP",
            t("cudy.colTx"),
            t("cudy.colRx"),
          ]}
        >
          {sorted.map((c) => (
            <ClientRow
              key={c.mac}
              client={c}
              ssid={ap.ssid}
              band={ap.band}
              hostname={hostnames(c.mac)}
              ip={ips(c.mac)}
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
