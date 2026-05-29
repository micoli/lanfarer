import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWanGraphs } from "../../plugins/bbox/frontend/hooks/useBbox";
import type { CudyBandwidthPoint, WanGraphPoint } from "../../plugins/contracts.ts";
import { useCudyBandwidth } from "../../plugins/cudy/frontend/hooks/useCudy";
import { basePath } from "../lib/basePath.ts";

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

function fmtKbps(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`;
  return `${kbps.toFixed(0)} Kb/s`;
}

// ── Generic sparkline (takes { ts, value }[]) ─────────────────────────────────

interface SparkPoint {
  ts: number;
  value: number;
}

function Sparkline({ points, color }: { points: SparkPoint[]; color: string }) {
  if (points.length < 2) return <div className="h-12 bg-slate-700/30 rounded animate-pulse" />;

  const W = 300;
  const AXIS_H = 14;
  const H = 52;
  const padX = 2;
  const padY = 2;
  const PAD_LEFT = 36;
  const max = Math.max(...points.map((p) => p.value), 1);
  const minTs = points[0].ts;
  const maxTs = points[points.length - 1].ts;
  const rangeTs = maxTs - minTs || 1;

  const xS = (ts: number) => PAD_LEFT + padX + ((ts - minTs) / rangeTs) * (W - PAD_LEFT - padX * 2);
  const yS = (v: number) => padY + (1 - v / max) * (H - padY * 2);

  const fillPts = [
    ...points.map((p) => `${xS(p.ts).toFixed(1)},${yS(p.value).toFixed(1)}`),
    `${xS(maxTs).toFixed(1)},${H}`,
    `${xS(minTs).toFixed(1)},${H}`,
  ].join(" ");

  const xTickCount = 4;
  const xTicks = Array.from(
    { length: xTickCount + 1 },
    (_, i) => minTs + Math.round((i / xTickCount) * (maxTs - minTs))
  );
  const yTicks = [0, max * 0.5, max];

  return (
    <svg viewBox={`0 0 ${W} ${H + AXIS_H}`} className="w-full" preserveAspectRatio="none">
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_LEFT}
            x2={W}
            y1={yS(v).toFixed(1)}
            y2={yS(v).toFixed(1)}
            stroke="#334155"
            strokeWidth="0.5"
          />
          <text x={PAD_LEFT - 3} y={yS(v) + 2.5} textAnchor="end" fontSize="6.5" fill="#475569">
            {fmtKbps(v)}
          </text>
        </g>
      ))}
      <polygon points={fillPts} opacity="0.15" fill={color} />
      <polyline
        points={points.map((p) => `${xS(p.ts).toFixed(1)},${yS(p.value).toFixed(1)}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {xTicks.map((ts) => (
        <text
          key={ts}
          x={xS(ts).toFixed(1)}
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

// ── Bbox card ─────────────────────────────────────────────────────────────────

function BboxBandwidthCard({ routerId }: { routerId: string }) {
  const { data, isLoading } = useWanGraphs(routerId);

  const lastDown = data?.down[data.down.length - 1]?.value ?? 0;
  const lastUp = data?.up[data.up.length - 1]?.value ?? 0;
  const maxDown = data ? Math.max(...data.down.map((p: WanGraphPoint) => p.value), 1) : 1;
  const maxUp = data ? Math.max(...data.up.map((p: WanGraphPoint) => p.value), 1) : 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <ArrowDown size={13} className="text-green-400" />
        <ArrowUp size={13} className="text-blue-400" />
        {routerId} — WAN
      </div>
      {isLoading || !data ? (
        <div className="flex flex-col gap-3">
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-green-400">
                <ArrowDown size={11} /> Downstream
              </span>
              <span className="tabular-nums text-slate-300">
                {fmtKbps(lastDown)} <span className="text-slate-500">/ max {fmtKbps(maxDown)}</span>
              </span>
            </div>
            <Sparkline points={data.down} color="#22c55e" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-blue-400">
                <ArrowUp size={11} /> Upstream
              </span>
              <span className="tabular-nums text-slate-300">
                {fmtKbps(lastUp)} <span className="text-slate-500">/ max {fmtKbps(maxUp)}</span>
              </span>
            </div>
            <Sparkline points={data.up} color="#3b82f6" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cudy card ─────────────────────────────────────────────────────────────────

function CudyBandwidthCard({ routerId }: { routerId: string }) {
  const { data, isLoading } = useCudyBandwidth(routerId);

  const lastRa0 = data?.ra0[data.ra0.length - 1]?.down ?? 0;
  const lastRai0 = data?.rai0[data.rai0.length - 1]?.down ?? 0;
  const maxRa0 = data ? Math.max(...data.ra0.map((p: CudyBandwidthPoint) => p.down), 1) : 1;
  const maxRai0 = data ? Math.max(...data.rai0.map((p: CudyBandwidthPoint) => p.down), 1) : 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <ArrowDown size={13} className="text-amber-400" />
        {routerId} — Wi-Fi
      </div>
      {isLoading || !data ? (
        <div className="flex flex-col gap-3">
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="text-amber-400">2.4 GHz (ra0)</span>
              <span className="tabular-nums text-slate-300">
                {fmtKbps(lastRa0)} <span className="text-slate-500">/ max {fmtKbps(maxRa0)}</span>
              </span>
            </div>
            <Sparkline
              points={data.ra0.map((p) => ({ ts: p.ts, value: p.down }))}
              color="#f59e0b"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="text-purple-400">5 GHz (rai0)</span>
              <span className="tabular-nums text-slate-300">
                {fmtKbps(lastRai0)} <span className="text-slate-500">/ max {fmtKbps(maxRai0)}</span>
              </span>
            </div>
            <Sparkline
              points={data.rai0.map((p) => ({ ts: p.ts, value: p.down }))}
              color="#a855f7"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Router list hook ──────────────────────────────────────────────────────────

interface RouterEntry {
  name: string;
  type: string;
}

function useAllRouters() {
  return useQuery<RouterEntry[]>({
    queryKey: ["config", "routers"],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/__config/routers`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<RouterEntry[]>;
    },
    staleTime: 60_000,
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Bandwidth() {
  const { t } = useTranslation();
  const { data: routers, isLoading, refetch } = useAllRouters();

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">
          {t("nav.bandwidth", "Bande passante")}
        </h1>
        <button
          type="button"
          onClick={() => void refetch()}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title={t("common.refresh")}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 h-48 animate-pulse"
            />
          ))}
        </div>
      )}

      {routers && routers.length === 0 && (
        <p className="text-slate-500 text-sm">Aucun routeur configuré dans config.yaml.</p>
      )}

      {routers && routers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {routers.map((r) =>
            r.type === "bbox" ? (
              <BboxBandwidthCard key={r.name} routerId={r.name} />
            ) : r.type === "cudy" ? (
              <CudyBandwidthCard key={r.name} routerId={r.name} />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
