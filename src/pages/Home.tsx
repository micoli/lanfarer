import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Clock, Cpu, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDevice, useWanGraphs, useWanStats } from "../../plugins/bbox/frontend/hooks/useBbox";
import { useCudyBandwidth } from "../../plugins/cudy/frontend/hooks/useCudy";
import type {
  CudyBandwidthData,
  CudyBandwidthPoint,
  DeviceData,
  WanGraphPoint,
  WanGraphsData,
  WanStatsData,
} from "../../plugins/contracts.ts";
import { useUiConfig, type WidgetConfig } from "../hooks/useUiConfig.ts";

function formatBytes(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} To`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Go`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} Mo`;
  return `${(n / 1e3).toFixed(0)} Ko`;
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

function BboxUptimeWidget({ device }: { device: DeviceData | undefined }) {
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
        <p className="text-xs text-slate-500">{t("home.boots", { count: device.boots })}</p>
      )}
    </StatCard>
  );
}

function BboxFirmwareWidget({ device }: { device: DeviceData | undefined }) {
  const { t, i18n } = useTranslation();
  return (
    <StatCard label={t("home.system")} icon={<Cpu size={13} />}>
      {device ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-200">
            {t("home.firmware")} {device.firmware}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(device.firmwareDate).toLocaleDateString(
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

function BboxDownstreamWidget({ stats }: { stats: WanStatsData | undefined }) {
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

function BboxUpstreamWidget({ stats }: { stats: WanStatsData | undefined }) {
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

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function WanSparkline({
  points,
  color,
}: {
  points: WanGraphPoint[];
  color: string;
}) {
  if (points.length < 2) return <div className="h-12 bg-slate-700/30 rounded animate-pulse" />;

  const W = 300;
  const AXIS_H = 14;
  const H = 52;
  const padX = 2;
  const padY = 2;
  const max = Math.max(...points.map((p) => p.value), 1);
  const minTs = points[0].ts;
  const maxTs = points[points.length - 1].ts;
  const rangeTs = maxTs - minTs || 1;

  // X ticks: ~4 evenly spaced
  const xTickCount = 4;
  const xTicks: number[] = Array.from({ length: xTickCount + 1 }, (_, i) =>
    minTs + Math.round((i / xTickCount) * (maxTs - minTs)),
  );

  // Y ticks: 0, 50%, 100%
  const yTickValues = [0, max * 0.5, max];
  const PAD_LEFT = 36;

  const xScaled = (ts: number) => PAD_LEFT + padX + ((ts - minTs) / rangeTs) * (W - PAD_LEFT - padX * 2);
  const yScaled = (v: number) => padY + (1 - v / max) * (H - padY * 2);

  const fillScaled = [
    ...points.map((p) => `${xScaled(p.ts).toFixed(1)},${yScaled(p.value).toFixed(1)}`),
    `${xScaled(maxTs).toFixed(1)},${H}`,
    `${xScaled(minTs).toFixed(1)},${H}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H + AXIS_H}`} className="w-full" preserveAspectRatio="none">
      {/* Y gridlines + labels */}
      {yTickValues.map((v) => (
        <g key={v}>
          <line
            x1={PAD_LEFT}
            x2={W}
            y1={yScaled(v).toFixed(1)}
            y2={yScaled(v).toFixed(1)}
            stroke="#334155"
            strokeWidth="0.5"
          />
          <text
            x={PAD_LEFT - 3}
            y={yScaled(v) + 2.5}
            textAnchor="end"
            fontSize="6.5"
            fill="#475569"
          >
            {formatKbps(v)}
          </text>
        </g>
      ))}
      <polygon points={fillScaled} opacity="0.15" fill={color} />
      <polyline
        points={points.map((p) => `${xScaled(p.ts).toFixed(1)},${yScaled(p.value).toFixed(1)}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* X axis labels */}
      {xTicks.map((ts) => (
        <text
          key={ts}
          x={xScaled(ts).toFixed(1)}
          y={H + AXIS_H - 1}
          textAnchor="middle"
          fontSize="7"
          fill="#64748b"
        >
          {fmtTime(ts)}
        </text>
      ))}
    </svg>
  );
}

function formatKbps(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`;
  return `${kbps.toFixed(0)} Kb/s`;
}

function BboxWanGraphsWidget({ graphs }: { graphs: WanGraphsData | undefined }) {
  const { t } = useTranslation();
  const lastDown = graphs?.down[graphs.down.length - 1]?.value ?? 0;
  const lastUp = graphs?.up[graphs.up.length - 1]?.value ?? 0;
  const maxDown = graphs ? Math.max(...graphs.down.map((p) => p.value), 1) : 1;
  const maxUp = graphs ? Math.max(...graphs.up.map((p) => p.value), 1) : 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3 col-span-2">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <ArrowDown size={13} className="text-green-400" />
        <ArrowUp size={13} className="text-blue-400" />
        {t("home.wanGraphs", "Débit WAN — dernière heure")}
      </div>
      {graphs ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-green-400">
                <ArrowDown size={11} /> {t("home.downstream", "Downstream")}
              </span>
              <span className="tabular-nums text-slate-300">
                {formatKbps(lastDown)}{" "}
                <span className="text-slate-500">/ max {formatKbps(maxDown)}</span>
              </span>
            </div>
            <WanSparkline points={graphs.down} color="#22c55e" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-blue-400">
                <ArrowUp size={11} /> {t("home.upstream", "Upstream")}
              </span>
              <span className="tabular-nums text-slate-300">
                {formatKbps(lastUp)}{" "}
                <span className="text-slate-500">/ max {formatKbps(maxUp)}</span>
              </span>
            </div>
            <WanSparkline points={graphs.up} color="#3b82f6" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="h-12 bg-slate-700/30 rounded animate-pulse" />
          <div className="h-12 bg-slate-700/30 rounded animate-pulse" />
        </div>
      )}
    </div>
  );
}

function CudySparkline({ points, color }: { points: CudyBandwidthPoint[]; dir: "up" | "down"; color: string }) {
  if (points.length < 2) return <div className="h-12 bg-slate-700/30 rounded animate-pulse" />;

  const W = 300;
  const AXIS_H = 14;
  const H = 52;
  const padX = 2;
  const padY = 2;
  const PAD_LEFT = 36;
  const values = points.map((p) => p.down);
  const max = Math.max(...values, 1);
  const minTs = points[0].ts;
  const maxTs = points[points.length - 1].ts;
  const rangeTs = maxTs - minTs || 1;

  const xS = (ts: number) => PAD_LEFT + padX + ((ts - minTs) / rangeTs) * (W - PAD_LEFT - padX * 2);
  const yS = (v: number) => padY + (1 - v / max) * (H - padY * 2);

  const fillPts = [
    ...points.map((p) => `${xS(p.ts).toFixed(1)},${yS(p.down).toFixed(1)}`),
    `${xS(maxTs).toFixed(1)},${H}`,
    `${xS(minTs).toFixed(1)},${H}`,
  ].join(" ");

  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) =>
    minTs + Math.round((i / xTickCount) * (maxTs - minTs)),
  );
  const yTicks = [0, max * 0.5, max];

  return (
    <svg viewBox={`0 0 ${W} ${H + AXIS_H}`} className="w-full" preserveAspectRatio="none">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD_LEFT} x2={W} y1={yS(v).toFixed(1)} y2={yS(v).toFixed(1)} stroke="#334155" strokeWidth="0.5" />
          <text x={PAD_LEFT - 3} y={yS(v) + 2.5} textAnchor="end" fontSize="6.5" fill="#475569">
            {formatKbps(v)}
          </text>
        </g>
      ))}
      <polygon points={fillPts} opacity="0.15" fill={color} />
      <polyline
        points={points.map((p) => `${xS(p.ts).toFixed(1)},${yS(p.down).toFixed(1)}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {xTicks.map((ts) => (
        <text key={ts} x={xS(ts).toFixed(1)} y={H + AXIS_H - 1} textAnchor="middle" fontSize="7" fill="#64748b">
          {fmtTime(ts)}
        </text>
      ))}
    </svg>
  );
}

function BboxCudyBandwidthWidget({ routerName, data }: { routerName: string; data: CudyBandwidthData | undefined }) {
  const lastRa0 = data?.ra0[data.ra0.length - 1]?.down ?? 0;
  const lastRai0 = data?.rai0[data.rai0.length - 1]?.down ?? 0;
  const maxRa0 = data ? Math.max(...data.ra0.map((p) => p.down), 1) : 1;
  const maxRai0 = data ? Math.max(...data.rai0.map((p) => p.down), 1) : 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3 col-span-2">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <ArrowDown size={13} className="text-purple-400" />
        {routerName} — Bande passante
      </div>
      {data ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="text-amber-400">2.4 GHz (ra0)</span>
              <span className="tabular-nums text-slate-300">
                {formatKbps(lastRa0)}{" "}
                <span className="text-slate-500">/ max {formatKbps(maxRa0)}</span>
              </span>
            </div>
            <CudySparkline points={data.ra0} dir="down" color="#f59e0b" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="text-purple-400">5 GHz (rai0)</span>
              <span className="tabular-nums text-slate-300">
                {formatKbps(lastRai0)}{" "}
                <span className="text-slate-500">/ max {formatKbps(maxRai0)}</span>
              </span>
            </div>
            <CudySparkline points={data.rai0} dir="down" color="#a855f7" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="h-12 bg-slate-700/30 rounded animate-pulse" />
          <div className="h-12 bg-slate-700/30 rounded animate-pulse" />
        </div>
      )}
    </div>
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
  const graphsRouterId =
    widgets.find((w) => w.type === "bbox-wan-graphs")?.id ?? null;
  const cudyBandwidthRouterId =
    widgets.find((w) => w.type === "cudy-bandwidth")?.id ?? null;

  const { data: device, isLoading: loadingDevice } = useDevice(deviceRouterId);
  const { data: stats, isLoading: loadingStats } = useWanStats(statsRouterId);
  const { data: graphs, isLoading: loadingGraphs } = useWanGraphs(graphsRouterId);
  const { data: cudyBandwidth, isLoading: loadingCudyBandwidth } = useCudyBandwidth(cudyBandwidthRouterId);
  const qc = useQueryClient();

  const loading = loadingDevice || loadingStats || loadingGraphs || loadingCudyBandwidth;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["device"] });
    qc.invalidateQueries({ queryKey: ["wan", "stats"] });
    qc.invalidateQueries({ queryKey: ["wan", "graphs"] });
    qc.invalidateQueries({ queryKey: ["cudy", "bandwidth"] });
  }

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">{device?.modelname ?? "BBox"}</h1>
          {device?.serialnumber && (
            <p className="text-xs text-slate-500 mt-0.5">S/N {device.serialnumber}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {device?.firmware && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              v{device.firmware}
            </span>
          )}
          {device?.using && (
            <div className="flex gap-1">
              {device.using.ftth && (
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  FTTH
                </span>
              )}
              {device.using.ipv4 && (
                <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                  IPv4
                </span>
              )}
              {device.using.ipv6 && (
                <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                  IPv6
                </span>
              )}
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
          if (w.type === "bbox-wan-graphs")
            return <BboxWanGraphsWidget key={`${w.type}-${w.id}-${i}`} graphs={graphs} />;
          if (w.type === "cudy-bandwidth")
            return <BboxCudyBandwidthWidget key={`${w.type}-${w.id}-${i}`} routerName={w.id} data={cudyBandwidth} />;
          return null;
        })}
      </div>
    </div>
  );
}
