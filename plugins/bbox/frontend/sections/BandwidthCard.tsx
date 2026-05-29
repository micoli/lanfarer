import { ArrowDown, ArrowUp } from "lucide-react";
import { Sparkline } from "../../../../src/components/Sparkline.tsx";
import { useWanGraphs } from "../hooks/useBbox.ts";

function fmtKbps(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`;
  return `${kbps.toFixed(0)} Kb/s`;
}

export default function BboxBandwidthCard({ routerName }: { routerName: string }) {
  const { data, isLoading } = useWanGraphs(routerName);

  const lastDown = data?.down[data.down.length - 1]?.value ?? 0;
  const lastUp = data?.up[data.up.length - 1]?.value ?? 0;
  const maxDown = data ? Math.max(...data.down.map((p) => p.value), 1) : 1;
  const maxUp = data ? Math.max(...data.up.map((p) => p.value), 1) : 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <ArrowDown size={13} className="text-green-400" />
        <ArrowUp size={13} className="text-blue-400" />
        {routerName} — WAN
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
