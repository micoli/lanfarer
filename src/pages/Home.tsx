import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Clock, Cpu, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDevice, useWanStats } from "../../plugins/bbox/frontend/hooks/useBbox";
import { useUiConfig, type WidgetConfig } from "../hooks/useUiConfig.ts";

interface WanStats {
  rx: {
    bytes: string | number;
    packets: string | number;
    bandwidth: number;
    maxBandwidth: number;
    contractualBandwidth: number;
    occupation: number;
  };
  tx: {
    bytes: string | number;
    packets: string | number;
    bandwidth: number;
    maxBandwidth: number;
    contractualBandwidth: number;
    occupation: number;
  };
}

interface DeviceInfo {
  now: string;
  modelname: string;
  serialnumber: string;
  uptime: number;
  numberofboots: number;
  running: { version: string; date: string };
  using: { ipv4: number; ipv6: number; ftth: number; adsl: number; vdsl: number };
}

function parseWanStats(raw: unknown): WanStats | null {
  const stats = (raw as { wan?: { ip?: { stats?: WanStats } } }[])?.[0]?.wan?.ip?.stats;
  return stats ?? null;
}

function parseDevice(raw: unknown): DeviceInfo | null {
  const d = (raw as { device?: DeviceInfo }[])?.[0]?.device;
  return d ?? null;
}

function formatBytes(n: string | number): string {
  const v = typeof n === "string" ? parseInt(n, 10) : n;
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} To`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Go`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} Mo`;
  return `${(v / 1e3).toFixed(0)} Ko`;
}

function formatBandwidth(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`;
  return `${kbps} Kb/s`;
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function BandwidthBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Skeleton() {
  return <div className="h-8 bg-slate-700/50 rounded animate-pulse w-2/3" />;
}

// ── Widgets ────────────────────────────────────────────────────────────────────

function BboxUptimeWidget({ device }: { device: DeviceInfo | null }) {
  const { t } = useTranslation();
  return (
    <StatCard label={t("home.uptime")} icon={<Clock size={13} />}>
      {device ? (
        <p className="text-2xl font-semibold text-slate-100 tabular-nums">
          {formatUptime(device.uptime)}
        </p>
      ) : (
        <Skeleton />
      )}
      {device && (
        <p className="text-xs text-slate-500">{t("home.boots", { count: device.numberofboots })}</p>
      )}
    </StatCard>
  );
}

function BboxFirmwareWidget({ device }: { device: DeviceInfo | null }) {
  const { t, i18n } = useTranslation();
  return (
    <StatCard label={t("home.system")} icon={<Cpu size={13} />}>
      {device ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-200">
            {t("home.firmware")} {device.running.version}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(device.running.date).toLocaleDateString(
              i18n.language === "fr" ? "fr-FR" : "en-GB",
              { day: "numeric", month: "long", year: "numeric" }
            )}
          </p>
        </div>
      ) : (
        <Skeleton />
      )}
    </StatCard>
  );
}

function BboxDownstreamWidget({ stats }: { stats: WanStats | null }) {
  const { t } = useTranslation();
  return (
    <StatCard
      label={t("home.downstream")}
      icon={<ArrowDown size={13} className="text-green-400" />}
    >
      {stats ? (
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold text-slate-100 tabular-nums">
            {formatBandwidth(stats.rx.bandwidth)}
          </p>
          <BandwidthBar
            value={stats.rx.bandwidth}
            max={stats.rx.contractualBandwidth / 1000}
            color="bg-green-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t("home.used", { pct: stats.rx.occupation })}</span>
            <span>
              {t("home.max", { bw: formatBandwidth(stats.rx.contractualBandwidth / 1000) })}
            </span>
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-700">
            {t("home.totalReceived")}{" "}
            <span className="text-slate-300">{formatBytes(stats.rx.bytes)}</span>
          </p>
        </div>
      ) : (
        <Skeleton />
      )}
    </StatCard>
  );
}

function BboxUpstreamWidget({ stats }: { stats: WanStats | null }) {
  const { t } = useTranslation();
  return (
    <StatCard label={t("home.upstream")} icon={<ArrowUp size={13} className="text-blue-400" />}>
      {stats ? (
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold text-slate-100 tabular-nums">
            {formatBandwidth(stats.tx.bandwidth)}
          </p>
          <BandwidthBar
            value={stats.tx.bandwidth}
            max={stats.tx.contractualBandwidth / 1000}
            color="bg-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t("home.used", { pct: stats.tx.occupation })}</span>
            <span>
              {t("home.max", { bw: formatBandwidth(stats.tx.contractualBandwidth / 1000) })}
            </span>
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-700">
            {t("home.totalSent")}{" "}
            <span className="text-slate-300">{formatBytes(stats.tx.bytes)}</span>
          </p>
        </div>
      ) : (
        <Skeleton />
      )}
    </StatCard>
  );
}

const DEFAULT_WIDGETS: WidgetConfig[] = [];

export default function Home() {
  const uiConfig = useUiConfig();
  const widgets = uiConfig.home?.widgets ?? DEFAULT_WIDGETS;

  const deviceRouterId =
    widgets.find((w) => w.type === "bbox-uptime" || w.type === "bbox-firmware")?.id ?? null;
  const statsRouterId =
    widgets.find((w) => w.type === "bbox-downstream" || w.type === "bbox-upstream")?.id ?? null;

  const { data: rawDevice, isLoading: loadingDevice } = useDevice(deviceRouterId);
  const { data: rawStats, isLoading: loadingStats } = useWanStats(statsRouterId);
  const qc = useQueryClient();

  const device = parseDevice(rawDevice);
  const stats = parseWanStats(rawStats);

  const loading = loadingDevice || loadingStats;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["device"] });
    qc.invalidateQueries({ queryKey: ["wan", "stats"] });
  }

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">{device?.modelname ?? "BBox"}</h1>
          {device?.serialnumber && (
            <p className="text-xs text-slate-500 mt-0.5">S/N {device.serialnumber}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {device?.running?.version && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              v{device.running.version}
            </span>
          )}
          {device?.using && (
            <div className="flex gap-1">
              {device.using.ftth ? (
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  FTTH
                </span>
              ) : null}
              {device.using.ipv4 ? (
                <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                  IPv4
                </span>
              ) : null}
              {device.using.ipv6 ? (
                <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                  IPv6
                </span>
              ) : null}
            </div>
          )}
          <button
            type="button"
            onClick={refresh}
            className={`p-1.5 text-slate-400 hover:text-slate-200 transition-colors ${loading ? "animate-spin" : ""}`}
            title="Rafraîchir"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Widgets grid */}
      <div className="grid grid-cols-2 gap-4">
        {widgets.map((w, i) => {
          if (w.type === "bbox-uptime")
            return <BboxUptimeWidget key={`${w.type}-${w.id}-${i}`} device={device} />;
          if (w.type === "bbox-firmware")
            return <BboxFirmwareWidget key={`${w.type}-${w.id}-${i}`} device={device} />;
          if (w.type === "bbox-downstream")
            return <BboxDownstreamWidget key={`${w.type}-${w.id}-${i}`} stats={stats} />;
          if (w.type === "bbox-upstream")
            return <BboxUpstreamWidget key={`${w.type}-${w.id}-${i}`} stats={stats} />;
          return null;
        })}
      </div>
    </div>
  );
}
