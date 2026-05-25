import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Router, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBboxWireless } from "../../plugins/bbox/frontend/hooks/useBboxWireless";
import { useMacHostnames } from "../../plugins/bbox/frontend/hooks/useMacHostnames";
import { useMacIps } from "../../plugins/bbox/frontend/hooks/useMacIps";
import type { AccessPoint, WirelessClient } from "../../plugins/contracts.ts";
import { useCudyClients } from "../../plugins/cudy/frontend/hooks/useCudy";
import { useRouterForPage } from "../hooks/useUiConfig.ts";

function signalBars(dbm: number): string {
  const abs = Math.abs(dbm);
  if (abs <= 50) return "▂▄▆█";
  if (abs <= 65) return "▂▄▆·";
  if (abs <= 75) return "▂▄··";
  return "▂···";
}

function signalColor(dbm: number): string {
  const abs = Math.abs(dbm);
  if (abs <= 50) return "text-green-400";
  if (abs <= 65) return "text-yellow-400";
  if (abs <= 75) return "text-orange-400";
  return "text-red-400";
}

function formatRate(kbps: number): string {
  if (!kbps) return "—";
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(0)} Mbps`;
  return `${kbps} Kbps`;
}

function HostTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
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

function CardHeader({
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

function ClientRow({
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

function AccessPointCard({
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
  const sorted = [...ap.clients].sort((a, b) => a.signal_dbm - b.signal_dbm);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
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

export default function HotspotsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const routerId = useRouterForPage("hotspots");
  const { data: cudyData, isLoading: cudyLoading } = useCudyClients();
  const { data: bboxWireless, isLoading: bboxLoading } = useBboxWireless(routerId);
  const hostnames = useMacHostnames(routerId);
  const ips = useMacIps(routerId);

  const isLoading = cudyLoading || bboxLoading;

  const bboxClientCount =
    bboxWireless?.accessPoints.reduce((s, ap) => s + ap.clients.length, 0) ?? 0;
  const cudyClientCount =
    cudyData?.routers.reduce(
      (s, r) => s + r.wireless.accessPoints.reduce((ss, ap) => ss + ap.clients.length, 0),
      0
    ) ?? 0;
  const totalClients = bboxClientCount + cudyClientCount;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Router size={20} className="text-blue-400 shrink-0" />
        <h1 className="text-lg font-semibold text-slate-100 flex-1">{t("cudy.title")}</h1>
        <span className="text-xs text-slate-400">
          {t("cudy.totalClients", { count: totalClients })}
        </span>
        <button
          type="button"
          onClick={() => {
            void qc.invalidateQueries({ queryKey: ["cudy"] });
            void qc.invalidateQueries({ queryKey: ["wireless"] });
          }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded-md hover:bg-slate-800"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          {t("common.refresh")}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
          <RefreshCw size={16} className="animate-spin" />
          {t("common.loading")}
        </div>
      )}

      {bboxWireless?.accessPoints.map((ap, i) => (
        <AccessPointCard
          key={`bbox-${ap.ssid}-${i}`}
          ap={ap}
          routerName={`Bbox — ${ap.ssid}`}
          routerOnline={bboxWireless.online}
          hostnames={hostnames}
          ips={ips}
        />
      ))}

      {cudyData?.routers.map((router) =>
        router.wireless.accessPoints.map((ap, i) => (
          <AccessPointCard
            key={`${router.name}-${ap.ssid}-${i}`}
            ap={ap}
            routerName={router.name}
            routerSubtitle={router.ip}
            routerOnline={router.wireless.online}
            hostnames={hostnames}
            ips={ips}
          />
        ))
      )}

      {!isLoading && totalClients === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">{t("cudy.notConfigured")}</p>
      )}
    </div>
  );
}
